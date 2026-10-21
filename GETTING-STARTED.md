# Getting started (no coding knowledge needed)

This repository gives Claude Code two extra abilities. You talk to Claude as usual; these plugins change what Claude
can do for you.

| | What it is for | You would say something like |
|---|---|---|
| **Context Ledger** (`ctx`) | Keeps Claude organised on bigger changes. It writes down the goal, the plan and what "done" means, checks the work before calling it finished, and has a separate reviewer look for mistakes. Nothing is lost when a chat gets long. | "Use the ledger to add a login page." |
| **Showreel** | Turns a website or web app into a polished demo video with a moving cursor, zooms, captions and optional voice-over. You can fine-tune it in a simple editor. | "Make a demo video of my app at http://localhost:3000 showing how to sign up." |

You do not have to use both. Each works on its own.

## 1. Install (once)

You need **Claude Code** signed in. For Showreel you also need **Node.js** (version 20.19 or newer; download the LTS
version from nodejs.org).

**Easiest:** open this repository's folder in Claude Code. It asks once whether you trust the folder and want to install
the plugins. Say yes. (Showreel is installed the same way as the others, with the command below.)

**For any other project:** open Terminal and run the three lines below, one at a time.

```sh
claude plugin marketplace add ansh-n-chovatiya/agent-workbench
claude plugin install ctx@agent-workbench
claude plugin install showreel@agent-workbench
```

Restart Claude Code afterwards. If you prefer one command that does the usual setup, run `scripts/bootstrap.sh`
from a copy of this repository (it shows what it would do first and changes nothing until you add `--yes`).

## 2. Using the Context Ledger

Just describe the work and ask Claude to track it. Claude chooses how much structure it needs:

- **A small fix:** "Fix the typo on the pricing page." Nothing extra happens.
- **One tracked change:** "Track this change: make the signup button blue." Claude writes the goal and a checklist, makes
  the change, then runs your project's checks. It cannot say "done" while the checks fail.
- **A bigger piece of work:** "Plan and build a password reset feature." Claude writes a short spec, asks you any
  questions it cannot guess, splits the work into parts, builds them (possibly in parallel), and has a separate reviewer
  read each part before it counts as finished.

Handy words you can type to Claude: `/ctx:status` (where are we?), `/ctx:next` (what should happen now?),
`/ctx:review` (check a finished part), `/ctx:pr-review` (one last read of the whole change before you merge).

What it saves: a folder called `.ctx` inside your project (it is kept out of Git). Delete it any time to start fresh.

**It learns from its own mistakes, privately.** ctx keeps a small log on your computer of things that went wrong (a review
found a bug, a check had to be skipped). After a while a session start shows one line pointing at a short summary file.
Nothing is sent anywhere, and nothing changes without you approving it.

**Optional second opinions (off by default).** If you have the Codex or Gemini command-line tools, ctx can ask them to
review a change too. That sends your code to OpenAI or Google, so it only works after you switch it on for your computer
in `~/.claude/ctx/external.yaml`. See `plugins/ctx/docs/reference.md`.

## 3. Using Showreel

1. Start your app so it is running (for example at `http://localhost:3000`), or use any public web address.
2. Ask Claude: "Use Showreel to make a 30-second demo video of http://localhost:3000. Show how to sign up and view the
   dashboard."
3. **The first time only**, Claude (or you, with `node scripts/showreel.mjs setup` inside the plugin folder) installs a
   browser for recording. It is about 300 MB and takes a few minutes. It is kept across plugin updates.
4. Claude records the flow and renders the video, then tells you where the file is. By default it is in
   `Movies/Showreel` (Mac) or `Videos/Showreel` (Windows and Linux).
5. To adjust cuts, speed, zoom, captions, colours or your logo, ask: "Open the Showreel editor for my demo." It opens a
   simple editor in your browser. Everything stays on your computer.

Voice-over is optional. Ask for it ("add a voice-over") and Claude installs a small local voice the first time; videos
without it are silent with captions. For a phone-shaped video say "make it vertical".

## If something goes wrong

| What you see | What to do |
|---|---|
| "Showreel is not set up on this machine yet" | Ask Claude to run `showreel setup`, or run `node scripts/showreel.mjs setup` in the plugin folder. |
| "Node is not supported" | Install the LTS version of Node.js from nodejs.org, then run setup again. |
| Claude does not know about `/ctx:...` or `/showreel` | Restart Claude Code; check `claude plugin list` shows the plugin. |
| A ctx command says a config file is not valid | It names the file. Fix the line it points at, or move `.ctx/ctx.yaml` aside. |
| You want to turn the learning log off | Put `improve:` with `enabled: false` indented under it in `.ctx/ctx.yaml`. |

Where to read more: `plugins/ctx/README.md` (full guide to the ledger), `plugins/showreel/README.md` (every Showreel
command), `docs/62-multi-agent-notes.md` (using Codex or Gemini alongside).
