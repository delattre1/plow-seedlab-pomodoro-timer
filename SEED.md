# SEED: pomodoro-timer

> seed-format: 1

> **You are an AI agent reading this seed.** This file is a *spec*, not a script and
> not a README. Your job: run `## Steps` Step 0 (the Interview), then **generate** the
> software the spec describes, then run `## Verify` and report the verdict. When every
> `## Verify` check passes, print `SEED_RESULT=DONE`; on a blocker print
> `BLOCKED_REASON=<short reason>` and stop. Do not ask the human anything outside the
> single Interview turn.
>
> **This seed contains NO application code on purpose.** There is no HTML, CSS, or
> JavaScript to copy. You GENERATE the app from the intent + contracts below. That is
> what makes this a *seed* and not an install flow. If you find yourself looking for a
> code block to paste, re-read this paragraph: the contracts ARE the spec — build to
> them.

---

## Goal

Produce **one self-contained file, `pomodoro-timer.html`**, that a person opens by
double-clicking it (a `file://` URL — **no web server, no build step, no install, no
network**). It is a classic Pomodoro timer: a **work** session counts down (default 25
minutes); when it ends it flips to a **short break** (default 5 min); after every **4**
completed work sessions the break is a **long break** (default 15 min). The user can
**Start**, **Pause**, and **Reset**, set the three durations, and see the time remaining,
the current phase, and how many work sessions are done. It must work fully offline in any
modern browser, forever, with nothing else installed.

This is a *seed* in the seedlab sense: an intent expressed as a spec, generated into
working software by a blind agent, and verified deterministically. A wall-clock timer is
normally untestable; this seed makes "it works" provable by requiring a small **injectable
clock** (`tick`) so the verifier can advance time deterministically instead of waiting.

---

## Done

All of these are observable and are proven by `## Verify`:

- **One file, no dependencies.** A single file `pomodoro-timer.html` exists with no
  reference to any external resource — no `<script src=…>`, no `<link href=…>` to a CDN, no
  remote font, no analytics, no `fetch`/`XMLHttpRequest`. Opening it with the network fully
  disconnected behaves identically. (Inline `<style>` and inline `<script>` are expected.)
- **A real human countdown.** When running, the displayed time actually counts down once
  per second in the browser (a `setInterval` driving the same tick logic). A person sees
  `25:00 → 24:59 → …`.
- **An injectable test clock (REQUIRED).** The page exposes a global object
  **`window.pomodoro`** with methods `start()`, `pause()`, `reset()`, and
  **`tick(seconds)`**. `tick(n)` advances the timer by exactly `n` simulated seconds
  **without** waiting real time, applying the same logic the per-second interval uses
  (including crossing phase boundaries). This is the deterministic hook `## Verify` drives.
  The Start/Pause/Reset buttons call the same `start()`/`pause()`/`reset()`.
- **Stable display hooks.** `id="time-remaining"` carries a **`data-seconds`** attribute =
  whole seconds remaining in the current phase (integer string), and shows `mm:ss` text
  (zero-padded, e.g. `"25:00"`, `"04:09"`). `id="phase"` carries **`data-phase`** ∈
  `"work" | "short-break" | "long-break"`. `id="session-count"` carries **`data-value`** =
  number of **completed work sessions** (integer string). `id="status"` carries
  **`data-running`** ∈ `"true" | "false"`.
- **Controls exist.** Buttons `id="start"`, `id="pause"`, `id="reset"`. Duration inputs
  `id="work-min"`, `id="short-break-min"`, `id="long-break-min"` (whole minutes; defaults
  `25`, `5`, `15`).
- **Correct, deterministic phase machine** for every scenario in `## Verify`, including the
  canonical journey: from a fresh 1-minute work session, `start()` then `tick(60)` →
  phase `short-break`, `session-count` `1`.
- **`## Verify` exits 0.** The acceptance harness drives the real rendered page in a
  headless browser, driving time via `window.pomodoro.tick`, and every scenario passes.

---

## Contracts (build to these — they are the spec)

These are FIXED. They are the seed's contract with reality; `## Verify` enforces them.

### Element + global hooks (spelled EXACTLY)

| role | hook |
|---|---|
| Time remaining | `id="time-remaining"`, attr `data-seconds="<int>"`, text `mm:ss` |
| Current phase | `id="phase"`, attr `data-phase="work\|short-break\|long-break"` |
| Completed work sessions | `id="session-count"`, attr `data-value="<int>"` |
| Running state | `id="status"`, attr `data-running="true\|false"` |
| Start / Pause / Reset | `id="start"` / `id="pause"` / `id="reset"` (buttons) |
| Work / short / long minutes | `id="work-min"` / `id="short-break-min"` / `id="long-break-min"` (number inputs) |
| Test clock + controls | global `window.pomodoro` with `start()`, `pause()`, `reset()`, `tick(seconds)` |

### State and durations

- Durations are read from the inputs in **minutes** and used as `minutes × 60` seconds.
  Defaults: work `25`, short break `5`, long break `15`.
- `LONG_EVERY = 4` (FIXED): the break after the 4th, 8th, … completed work session is a
  **long** break; otherwise breaks are **short**.

### Initial state (on load, and after `reset()`)

- `data-phase = "work"`, `data-seconds = work-min × 60` (read from `#work-min` at that
  moment), `session-count data-value = "0"`, `status data-running = "false"`.
- `reset()` also stops the timer (running → false) and recomputes `data-seconds` from the
  **current** `#work-min`. (So a verifier can set custom durations, click/`reset()`, and
  see them take effect.)

### `start()` / `pause()`

- `start()` sets running → true (`data-running="true"`). If already at `0` it still runs;
  the next tick handles the transition.
- `pause()` sets running → false. While paused, `tick(n)` changes nothing.

### `tick(n)` — the FIXED time model (apply n one-second steps)

For each of `n` simulated seconds, **if running**:
1. If `data-seconds > 0`: decrement by 1.
2. If `data-seconds` reaches `0`, the current phase **completes** — apply the transition
   below and **auto-start the next phase** (running stays true), then continue stepping.

Phase-completion transition:
- If the completed phase was **`work`**: increment `session-count` by 1. Then if the new
  `session-count` is a multiple of `LONG_EVERY` (4) → next phase = **`long-break`** with
  `data-seconds = long-break-min × 60`; else → next phase = **`short-break`** with
  `data-seconds = short-break-min × 60`.
- If the completed phase was **`short-break`** or **`long-break`**: next phase = **`work`**
  with `data-seconds = work-min × 60`. (`session-count` is NOT incremented by a break.)

`tick(n)` must handle an `n` that spans multiple phases in one call (e.g. a single
`tick(420)` can flow through several work/break phases). If **not running**, `tick(n)` does
nothing. The per-second `setInterval` used for the live human countdown calls this same
logic with one second at a time.

### Display rule

`#time-remaining` text is the remaining seconds formatted `mm:ss`, zero-padded to two
digits each (e.g. `1500 → "25:00"`, `249 → "04:09"`, `0 → "00:00"`). `data-seconds` is the
integer source of truth; `## Verify` reads `data-seconds`, not the text.

### Non-negotiables (forbids)

- **No external requests of any kind.** The file is the whole app.
- **No build step / no framework install required.** Plain HTML + inline CSS + inline
  vanilla JS.
- **`tick(seconds)` must be deterministic and pure of real time** — it must NOT call
  `setTimeout`/`Date.now()`; it just applies `n` logical seconds. (The live UI uses a
  separate `setInterval` that calls the tick logic; the test path must not depend on it.)
- The four `data-*` attributes must always reflect true state — they are how `## Verify`
  reads the app independent of styling.

### Design (intent, not pixels)

Make it look clean and usable — a big readable timer, the phase clearly labelled, the three
buttons and the session count visible, the duration inputs tucked in a settings row.
Readable on a phone. Aesthetics are yours; the contracts above are not.

---

## Inputs

This seed needs **no secrets, no accounts, no external services** — that is deliberate.
The only input is where to write the file.

| name | required | default | detect | ask |
|---|---|---|---|---|
| `OUTPUT_PATH` | no | `./pomodoro-timer.html` | Is a target path already given or implied by the working directory? | "Where should I write the generated app? (default `./pomodoro-timer.html` in the current directory)" |

There is **no `WIRE_SAMPLE`** row: this seed crosses no system boundary. All behavior is
local and deterministic given the injectable clock.

---

## Components

- **A modern web browser** (Chrome/Edge/Firefox/Safari) — to open and run the file.
- **The generated file** `pomodoro-timer.html` — authored by you from the contracts.
- **For `## Verify` only:** a headless browser driver. Preferred: Playwright
  (`npx -y playwright@^1.6` + `npx playwright install chromium`, no project setup needed).
  Any equivalent headless-DOM tool that can load the file, set input values, click buttons,
  call a page function (`window.pomodoro.tick(n)`), and read element attributes is
  acceptable — the harness drives the **real rendered page**.

---

## Steps

> Intent first, commands second. You have reasoning — adapt commands to your OS, but do not
> change the **contracts**.

### Step 0 — Interview (mandatory, the only interactive turn)

Read `## Inputs`, run each `detect`. Send the user ONE message listing what's already
satisfied and anything you need. In practice the only question is the output path, and it
has a sensible default — if the user gave you a directory or said "just build it," skip
straight to building. After this turn, run to completion or to a `BLOCKED_REASON` block.

### Step 1 — Generate the app

Author `pomodoro-timer.html` at `OUTPUT_PATH` as a single self-contained file that
satisfies `## Contracts` and `## Done`:
- the display hooks (`#time-remaining`, `#phase`, `#session-count`, `#status`), controls
  (`#start`/`#pause`/`#reset`), and duration inputs;
- a state object (phase, seconds remaining, session count, running) and a single
  `step()`/`tick(n)` that applies the FIXED time model including phase transitions and
  auto-start;
- `window.pomodoro = { start, pause, reset, tick }` exposed for testing; the buttons call
  the same methods; a `setInterval(…, 1000)` drives the live human countdown via the same
  tick logic while running;
- render the four `data-*` attributes and the `mm:ss` text on every change; render once on
  load (initial state).

Keep it small, plain, and dependency-free. Inline the CSS and JS.

### Step 2 — Self-check against the contracts

Before running `## Verify`, sanity-read your own file: are all ids and the `window.pomodoro`
methods present and spelled exactly? On load is it `work` / `data-seconds=1500` /
`session-count=0` / `data-running=false`? Does `tick` do nothing while paused? Does a work
session completing increment `session-count` and pick long-break on every 4th? Does
`tick(n)` cross phase boundaries? Fix before verifying.

### Step 3 — Verify

Run `## Verify`. If a scenario fails, fix the generated file (never weaken the test) and
re-run until all pass. Then report `SEED_RESULT=DONE` with the verdict.

---

## Verify

**The acceptance harness drives the real rendered page in a headless browser and asserts
every scenario below, advancing time ONLY via `window.pomodoro.tick`. Exit code is the
truth: `0` = Done, non-zero = not Done.** This is an agent-driven check over real running
state — you reason over what the actual page renders and computes, not over your own source.

The harness loads `pomodoro-timer.html` via `file://`. For scenarios that set custom
durations, it sets the duration inputs (dispatch `input`/`change`) and then calls
`window.pomodoro.reset()` so the new durations take effect, before starting. It reads back
`data-seconds`, `data-phase`, `#session-count` `data-value`, and `#status` `data-running`.

Helpful primitives (write your own; this is the test contract, not the app):
- `setMin(work, short, long)`: set the three inputs, then `window.pomodoro.reset()`.
- `start()` / `pause()` / `reset()` / `tick(n)`: call the matching `window.pomodoro` method
  (or click the corresponding button for start/pause/reset).
- `secs()` / `phase()` / `sessions()` / `running()`: read the four `data-*` values.

### Acceptance scenarios (must ALL pass — these are the gate)

1. **Initial state.** Fresh load (defaults). `phase()==="work"`, `secs()===1500`,
   `sessions()==="0"`, `running()==="false"`, and `#time-remaining` text is `"25:00"`.
2. **Start + partial tick.** `start()`; `running()==="true"`. `tick(1)` → `secs()===1499`,
   text `"24:59"`, still running.
3. **Pause freezes time.** From scenario 2, `pause()` → `running()==="false"`. `tick(100)`
   → `secs()` is still `1499` (no change while paused).
4. **Reset.** `reset()` → `phase()==="work"`, `secs()===1500`, `sessions()==="0"`,
   `running()==="false"`.
5. **Work → short break.** `setMin(1, 1, 2)` (so work=60s, short=60s, long=120s); `start()`;
   `tick(60)` → `phase()==="short-break"`, `secs()===60`, `sessions()==="1"`,
   `running()==="true"`.
6. **Break → next work (no session increment).** Continue from scenario 5: `tick(60)` →
   `phase()==="work"`, `secs()===60`, `sessions()==="1"` (unchanged by the break),
   `running()==="true"`.
7. **Long break after 4 work sessions.** `setMin(1, 1, 2)`; `start()`; `tick(420)`
   (seven minutes = work,short,work,short,work,short,work) → `phase()==="long-break"`,
   `secs()===120`, `sessions()==="4"`.
8. **Custom work duration via reset.** `setMin(10, 5, 15)` → `secs()===600`, `phase()==="work"`,
   `#time-remaining` text `"10:00"`, `running()==="false"`.
9. **mm:ss formatting.** `setMin(1, 1, 2)`; `start()`; `tick(11)` → `secs()===49` and
   `#time-remaining` text is `"00:49"` (zero-padded).

A passing run prints a short line per scenario (e.g. `[5] work→short: phase short-break,
sessions 1 ✓`) and a final line such as `VERIFY: 9/9 scenarios passed`, then exits `0`. Any
failure prints the scenario, expected vs observed, and exits non-zero.

### Also confirm (offline / single-file, cheap greps over the generated file)

- No external resource references: the file contains no `http://`/`https://` URL in a
  `src`/`href`, no `fetch(`, no `XMLHttpRequest`, no CDN/font link.
- `window.pomodoro` is assigned in the file (the test clock is exposed).

---

## Failure modes

**Symptom: scenario 3 fails — time keeps dropping while paused.**
- Detect: `tick(100)` changed `data-seconds` after `pause()`.
- Fix: `tick` must be a no-op when `running === false`.

**Symptom: scenario 5/7 fails — `session-count` wrong, or a break came when a long break
was due (or vice-versa).**
- Detect: sessions count off, or phase is `short-break` when it should be `long-break`.
- Fix: increment `session-count` ONLY when a **work** phase completes; choose `long-break`
  when the new count is a multiple of 4, else `short-break`; breaks never increment the
  count.

**Symptom: scenario 7 fails — `tick(420)` lands on the wrong phase.**
- Detect: phase isn't `long-break`, or seconds aren't the long-break full duration.
- Fix: `tick(n)` must step through phase boundaries within one call (decrement, and on
  hitting 0 transition + auto-start the next phase, then keep stepping with the remaining
  seconds).

**Symptom: scenario 1/8/9 fails — text vs `data-seconds` mismatch or bad padding.**
- Detect: text shows `"4:9"` instead of `"04:09"`, or `data-seconds` isn't an integer.
- Fix: `data-seconds` is the integer source of truth; format the text as zero-padded
  `mm:ss` derived from it.

**Symptom: `## Verify` can't call `window.pomodoro.tick` / reads `null`.**
- Detect: harness throws calling the global, or a selector is null.
- Fix: assign `window.pomodoro = { start, pause, reset, tick }`; the ids and `data-*`
  attributes are FIXED — match them exactly.

---

## Cleanup

This seed writes exactly one file. To reset: delete `pomodoro-timer.html` (and any
throwaway harness/`node_modules` you created for `## Verify`). Re-running the seed
regenerates the app from scratch.
