# Switcher memory/CPU investigation

Target: `nitaybz/homebridge-switcher-platform`, local source version 4.7.1,
base commit `53f793b`. Identified from local Git remotes/package metadata and
[issue #83](https://github.com/nitaybz/homebridge-switcher-platform/issues/83),
which describes growing CPU, 323 MB RES, Valve devices and custom timers,
without errors/reconnects. `ha-switcher-kis`, `aioswitcher` and `switcher-js`
were inspected as candidates; they are not modified by this patch.

Work is in a separate local clone on `fix/bounded-history-memory`; the original
checkout and others' work are untouched. The managed worktree API was unavailable
for this task, so an isolated checkout was used. No push, release, deployment,
live-device action, service restart or external agent contact was performed.

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
for one device. After repair, all nine tests pass, including 100 stalled/recovered
storage cycles (30000 state updates total), failed writes, shared storage busy
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
Node 24, actual Homebridge/HAP/Eve clients and customer hardware still need a
staged soak before any release.

The discovery reconnect code in `lib/switcher.js` leaves sibling UDP sockets
unclosed, does not attach message/error handlers to the replacement proxy, and
does not register shutdown cleanup. The dependency's proxy `close()` can throw
when an earlier socket is already closed. Breeze replacement similarly does
not close the replaced device. These are static lifecycle findings, not the
measured no-reconnect Valve workload; they remain separate follow-up work.
Ordinary command timers are short-lived, and discovery does not construct
accessories repeatedly for a known device. No code in these paths was changed.
