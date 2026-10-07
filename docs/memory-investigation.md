# Switcher memory/CPU investigation

Target: `nitaybz/homebridge-switcher-platform`, local source version 4.7.1,
base commit `53f793b`. Identified from local Git remotes/package metadata and
[issue #83](https://github.com/nitaybz/homebridge-switcher-platform/issues/83),
which describes growing CPU, 323 MB RES, Valve devices and custom timers,
without errors/reconnects. `ha-switcher-kis`, `aioswitcher` and `switcher-js`
were inspected as candidates. The companion switcher-js driver was subsequently
confirmed to need lifecycle fixes; both isolated repositories were repaired.

Work is in a separate local clone on `fix/bounded-history-memory`; the original
checkout and others' work are untouched. The managed worktree API was unavailable
for this task, so an isolated checkout was used. The initial phase made no external writes. Public release was subsequently
authorized. No deployment, live-device action, service restart or external
agent contact was performed.

## Confirmed retained work

`accessories/extras.js` called `addEntry()` for every UDP state update.
FakeGato 0.6.7's `_addEntry()` serializes the entire history and saves it. Its
shared filesystem writer retries every busy write at 100 ms, retaining each
serialized snapshot in a timer closure until the write can run. Input that
outpaces a slow/stalled disk creates an unbounded backlog. Before history loads,
FakeGato similarly schedules one `_addEntry()` retry per received broadcast.

The history ring itself is already capped at 4032 entries. Steady CPU work
increases as that ring fills because the whole ring is serialized every time;
the ring is not an unbounded collection.

## Fix

- Valve, Outlet and Switch share a persistence queue with one in-flight write
  and one pending latest state per history service. Serialization happens only
  when that service can write, eliminating obsolete serialized snapshots.
- History is sampled once a minute, with immediate entries for on/off changes.
  HomeKit state updates and energy integration still run on every broadcast.
- Entries are not submitted before history loads. Existing energy accumulation
  during load remains intact; pre-load sample history is intentionally omitted.
- Existing filenames, JSON fields, load behavior and Eve history service API
  are retained. A failed write releases the queue; a later sample can save again.

## Measurements

Actual plugin/accessory code and actual FakeGato 0.6.7, with mocked HomeKit,
filesystem completions, and timers. No UDP/TCP sockets or real files are opened.
Node 22.23.1, switcher-js2 1.8.0, macOS. These are accelerated isolated
measurements, not customer RSS or a six-hour wall-clock soak.

Stalled filesystem, three devices, power transitions on every update, heap after
forced GC relative to initialized services:

| Updates per device | Before retry timers | Before heap growth MiB | After retry timers | After heap growth MiB |
| --- | ---: | ---: | ---: | ---: |
| 100 | 299 | 1.255 | 0 | 0.086 |
| 300 | 899 | 7.573 | 0 | 0.144 |
| 600 | 1799 | 27.009 | 0 | 0.200 |
| 1000 | 2999 | 71.574 | 0 | 0.266 |

After the fix, extending to 5000/10000/20000 updates per device retained
0.837/0.865/0.897 MiB, zero retry timers and one disk write. The increase before
the plateau is the bounded 4032-entry history rings, not a growing write queue.

Six simulated hours of 4-second broadcasts to three continuously-on 1kW devices,
with completed disk writes between batches:

| Metric | Before | After |
| --- | ---: | ---: |
| Broadcasts per device | 5400 | 5400 |
| History writes across three devices | 16200 | 1080 |
| Serialized MiB | 1838.008 | 8.951 |
| Measured process CPU milliseconds | 3827.4 | 69.4 |
| Integrated energy per device, kWh | 6 | 6 |

The CPU timing includes the offline harness and varies between runs; it is not
a prediction of Raspberry Pi CPU percentage. An early CPU-probe attempt retained
completed callbacks in the test spy itself and hit the deliberately imposed
256 MiB heap cap. Clearing completed spy call history corrected the harness;
the table is from the corrected runs, which exited successfully.

## Verification and reproduction

Baseline lint passed and the original `npm test` script was empty. The first
five regression cases failed on the unmodified source for the expected reasons:
2999 busy-write retry timers, 1000 pre-load retry timers, and 5400 serializations
for one device. After the complete repair, all 19 plugin tests and all 9 driver tests pass
on Node 22.23.1, including 100 stalled/recovered storage cycles (30000 state updates total), failed writes, shared storage busy
with another writer, and existing-file/energy/reset compatibility. Lint and
`git diff --check` pass. Node's experimental MockTimers warning is expected.

```sh
npm test
npm run lint
node --expose-gc --max-old-space-size=256 test/memory-probe.js
node --expose-gc --max-old-space-size=256 test/memory-probe.js --sustained
node --max-old-space-size=256 test/cpu-probe.js
```

## Limits and other static findings

No customer heap profile, configuration or real disk timings were available.
This confirms a mechanism capable of the reported growth and verifies its fix;
it does not establish that every aspect of issue #83 comes from this mechanism.
Node 24, actual Homebridge/HAP/Eve clients and customer hardware were not
exercised; the isolated evidence does not replace a hardware soak.

The follow-up review reproduced and repaired lifecycle leaks in the companion
`nitaybz/switcher-js` repository (base `7051a7c`, source package 1.8.0): one UDP
error retained three sibling sockets; repeated successful logins retained one
error listener per login; concurrent pending TCP connects could create extra
sockets; a TCP connect could become active after client close. The driver now
closes the full UDP generation, closes idempotently, coalesces pending connects,
discards late connections, and removes completed login error listeners.

The plugin now owns the discovery generation and waits for close before one
reconnect timer, restores both handlers after reconnect, closes replaced Breeze
clients, limits each client to one scheduled/in-flight status refresh, and uses
the driver's Promise-based status API. Shutdown cancels discovery/removal,
refresh, queued command and processing timers and closes device clients.
Unsupported models are rejected before allocating a tracked client.

Persistence review found the initial patch needed final metadata flushing and a
bounded retry after EIO without another broadcast. Both are now implemented.
Shutdown saves the latest extra metadata, drains the queue for up to two seconds,
and reports failure on stalled/failed/unloaded storage. The Homebridge
[shutdown API emits an event synchronously](https://raw.githubusercontent.com/homebridge/homebridge/latest/src/api.ts),
so this remains best effort within the host's grace period, not a guarantee for
SIGKILL or power loss. Normal failures schedule one five-second retry timer,
coalescing newer state; synchronous adapter failures also release queue ownership.

### Longer trend probe

`node --expose-gc --max-old-space-size=256 test/soak.js` ran for 120.246 seconds,
with 180000 updates per device, 540000 total, and 200 simulated hours per device.
The filesystem stalled for the first 20 seconds, then recovered with injected
EIO errors. Every five seconds the probe forced GC and recorded heap growth.

- The ring reached its 4032-entry ceiling for all three devices.
- Last 13 measurements (wall time 60 through 120 seconds): 0.773 to 0.806 MiB
  heap growth, fitted slope +0.001512 MiB/minute (effectively flat at this scale).
- At completion: zero retry timers, zero pending writes, successful shutdown save.
- Raw measurements: `soak-measurements.jsonl` next to this report.

### Final limitations and release validation

This does not prove all possible leak paths are eliminated. The driver's legacy
command/status response handlers still lack comprehensive response deadlines;
repeated manual commands against a device that keeps TCP open but never replies
can retain data listeners. Login success cleanup is covered, while a general
request/response queue and timeout redesign remains outside this measured fix.
FakeGato still writes files directly: abrupt power loss or failed partial writes
can corrupt a file; automatic bounded retries help after recoverable write errors
but cannot guarantee crash durability. Pre-load history samples are omitted,
and orderly shutdown before load completes reports failure instead of silently
claiming those samples were saved.

Recommend validating the exact packed artifacts on a non-customer child bridge
for 24 to 48 hours with Node 22 and 24, representative Valve/Timer/Breeze/Heater
devices or a simulator, normal and stalled filesystem writes, network flaps and
orderly shutdown. Track RSS, heap after GC, CPU, active handles, listener counts,
final persisted energy/reset values and Eve history compatibility. Release does
not require or authorize restarting customer hosts.

### Release preparation

Release targets: switcher-js2 1.8.1 followed by homebridge-switcher-platform 4.7.2.
The plugin requires ^1.8.1 and the lockfile targets the exact prepared driver
archive. Publish the driver archive first, verify registry integrity, then
publish the plugin archive. The original repos use manual version tags/npm/GitHub
releases; no package publish workflow or required branch checks were found
(the plugin has only dynamic Dependabot, the driver has no Actions workflows).
Both remote master tips still matched the inspected baselines and were unprotected.

The authenticated GitHub account is available. npm's publisher identity check
returned HTTP 401 Unauthorized on October 7 2026. No npm release can be claimed
until the human renews npm login; no credentials or OTP were requested in chat.

Final plugin validation used the prepared switcher-js2 1.8.1 archive installed
locally: all 19 tests, plugin lint, and whitespace checks passed. The driver has
a pre-existing unused TOKEN_REQUIRED_TYPES declaration reported by ESLint; its
9 lifecycle/listener tests and syntax checks passed. No new CI requirement was
identified. Driver release commit: `5438a756b5289489424d14df5250a78170a235ae`.
