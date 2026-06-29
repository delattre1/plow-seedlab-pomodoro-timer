# plow-seedlab-pomodoro-timer — a stateful, time-based SEED

A small **example of a seed**: a single Markdown file
([`pomodoro-timer.seed.md`](pomodoro-timer.seed.md)) that your AI coding agent reads and
turns into a working app — an offline Pomodoro timer (25-min work sessions, short breaks,
and a long break after every 4th session, with Start / Pause / Reset).

There is **no app code in this repo to copy.** The seed is a *spec* (intent + contracts +
acceptance tests). You hand it to an agent, the agent **generates** the `pomodoro-timer.html`
from scratch, and it self-verifies the result. That "idea → prompt → working software"
round-trip *is* the point.

This one shows how a seed makes **time itself testable**: a wall-clock timer is normally
impossible to verify deterministically, so the seed requires a small **injectable clock**
(`window.pomodoro.tick(seconds)`) the test harness uses to advance time instantly — no
waiting, no flakiness.

> **What's a seed?** A portable, agent-readable spec for "what a system should be." A
> capable agent on a fresh machine reads it and is responsible for reaching the **Done**
> state. The seed is the artifact; the running app is the proof. (Full method:
> [seedlab](https://github.com/plow-pbc/seedlab).)

---

## Run this yourself (≈3 minutes)

You need: a coding agent (Claude Code, Codex, Cursor, or any agent that can read a file,
write a file, and run a command) and a web browser. No accounts, no API keys, no services.

1. **Get the seed.**
   ```bash
   git clone https://github.com/delattre1/plow-seedlab-pomodoro-timer.git
   cd plow-seedlab-pomodoro-timer
   ```

2. **Point your agent at it.** Start your agent in that folder and give it one instruction:
   > Read `pomodoro-timer.seed.md` and execute it to its `## Done`, then run its `## Verify`
   > and report the result.

   The agent generates `pomodoro-timer.html` and runs the acceptance tests. When it finishes
   it prints `SEED_RESULT=DONE`.

3. **Open the app.** Double-click the generated `pomodoro-timer.html` (or
   `open pomodoro-timer.html` on macOS). It runs entirely offline.

4. **See it work.** Hit **Start** and watch `25:00` count down. Set the work duration to 1
   minute to see it flip to a short break; after four work sessions the break becomes a long
   one.

That's the whole loop: you gave an idea-as-spec to *your* agent, on *your* machine, and it
brought working software into reality — and proved it.

---

## What "it works" means (the deterministic gate)

The seed ships its own acceptance test. The agent isn't trusted to *say* it's done — the
`## Verify` harness drives the real rendered page and advances time **only** through the
injectable `tick()` clock, so every check is deterministic:

| # | scenario | check |
|---|---|---|
| 1 | initial state | phase `work`, 1500 s left (`25:00`), 0 sessions, not running |
| 2 | start + tick(1) | 1499 s (`24:59`), running |
| 3 | pause, tick(100) | frozen — no change while paused |
| 4 | reset | back to work / 1500 s / 0 sessions |
| 5 | 1-min work, tick(60) | flips to short break, sessions = 1 |
| 6 | tick another 60 | break → work, sessions still 1 |
| 7 | tick(420) | **long** break after the 4th work session, sessions = 4 |
| 8 | set work = 10, reset | shows `10:00` |
| 9 | tick(11) | `00:49` (zero-padded mm:ss) |

If all nine pass, the seed is proven for your agent.

---

## Why this is a *seed*, not a code template

- **Zero pre-baked code.** Open the seed — there's no HTML/CSS/JS to paste. The agent writes
  the timer's state machine from the contracts. A paste-artifact reproduces one frozen
  build; a seed *regenerates* the software.
- **Self-verifying — even for time.** "Done" is a passing acceptance test over the real
  running page, made deterministic by an injectable clock instead of real-time waits.
- **Portable.** No server, no framework, no network. One file that runs by double-clicking,
  offline, forever.

## Proof

This seed was proven the seedlab way before publishing: a **fresh, blind agent** (clean
context, given only the seed) generated the app from zero and passed `## Verify`. See
[`proof/`](proof/).

---

*Part of the [seedlab](https://github.com/plow-pbc/seedlab) method. License: MIT.*
