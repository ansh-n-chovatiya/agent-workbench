# Vision and goals

## The problem

1. **Token cost.** Claude is used heavily for everything, mostly on Opus, and plan limits run out fast. Work done
   through Context Ledger (ctx) is the most expensive.
2. **Repeated review rounds.** After ctx finishes a change, the owner runs `/code-review` four or five times
   before the change is mergeable. Each run still finds bugs. The code is not thought through at build time.
3. **Scattered setup.** Skills, ledger, token ideas and agent CLIs live in separate places. Moving to a new PC
   or a new project means redoing setup by hand.

## Goal

A Claude-first workflow, built around Context Ledger, that:

1. **Costs fewer tokens**, measured per stage, without lowering accuracy. Accuracy wins when the two conflict.
2. **Produces mergeable code in at most two review rounds** by catching edge cases before and during the build.
3. **Shows what every agent and subagent did and what it cost**, on request only.
4. **Sets up in one step** on any PC or project, from one repository.
5. **Treats Codex and Gemini as optional add-ons**, used side by side when the owner has a subscription, never
   required.

## Non-goals

- A standalone "everything app" that replaces the terminal, the agents and the ledger.
- Switching the main chat's model on every prompt (see 16: each model has its own cache).
- A gateway or proxy in front of every request (see 17 and decision D5).
- Anything shown on screen by default.
- Sending prompts or code to any service other than the agents the owner already uses.
- Automating Codex or Gemini inside Claude's workflow in v1 (decision D6).

## Success measures (to be baselined in phase 1)

| Measure | Today | Target |
|---|---|---|
| Review rounds per ctx change | 4 to 5 (owner's report) | 2 or fewer |
| Findings per round in round 1 | not measured | falling over time |
| Tokens per merged change, by stage | not measured | measured, then down |
| Time to set up a new PC | manual | one command |
| Escaped bugs found later by a human PR review | not measured | falling |

These numbers come from the owner's description and the data in 11 and 16. Do not quote a saving until the
`ctx-optimize` log shows it.
