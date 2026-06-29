# Proof — plow-seedlab-pomodoro-timer

A **fresh, blind agent** (clean context, given **only** `pomodoro-timer.seed.md` in an
otherwise-empty directory) generated the app from zero and passed the seed's own `## Verify`
over the real rendered page — advancing time deterministically via the injectable
`window.pomodoro.tick` clock.

## Result

```
VERIFY: 9/9 scenarios passed   (exit 0)
SEED_RESULT=DONE
```

- Generativity (Rule 42): the seed contains zero pasteable app code — the agent authored the
  timer's phase machine from the contracts alone.
- Time made testable: the harness never waits real seconds; it drives `tick(n)`, including
  multi-phase crossings (e.g. `tick(420)` → long break after the 4th work session).
- Offline / single-file confirmed: no `http(s)://` in `src`/`href`, no `fetch`/
  `XMLHttpRequest`/CDN; `window.pomodoro` exposed.

## Files here

- `pomodoro-timer.generated.html` — the app the blind agent generated (example output).
- `verify.mjs` — the Playwright acceptance harness written from the `## Verify` contract.
- `verify-output.txt` — per-scenario pass output from an independent re-run (9/9).
- `blind-hydrate-verdict.txt` — the blind agent's final verdict.
