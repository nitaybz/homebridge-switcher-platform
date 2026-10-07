# Changelog

## 4.7.2

- Bound and coalesce history saves when disk writes fall behind, preventing an unbounded retry backlog.
- Sample power history once a minute, retaining immediate on/off transitions and energy integration on every broadcast.
- Flush latest energy metadata during orderly shutdown and retry failed writes with one bounded timer.
- Restore discovery handlers on reconnect, close replaced clients, and cancel pending work at shutdown.
- Require switcher-js2 1.8.1 for socket and login listener cleanup.
- Add offline regression tests and a bounded memory trend probe.

Measured with mocks and accelerated device time; customer-runtime validation is still needed.
