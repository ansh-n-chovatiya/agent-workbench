# Showreel (preview)

Turn a web flow into a demo video. This preview provides environment checks,
project configuration and a local fixture for capture testing.

```sh
claude plugin install showreel@agent-workbench
```

From this plugin directory, install dependencies with `npm install`, then run:

```sh
node scripts/showreel.mjs doctor
node scripts/showreel.mjs init --name demo --url http://localhost:3000
npm test
```

Project state is stored in `~/.showreel/`, or `SHOWREEL_HOME` when set.
The [design](../../docs/40-showreel-design.md) describes the planned video workflow.
