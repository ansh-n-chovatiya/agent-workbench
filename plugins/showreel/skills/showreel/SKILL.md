---
name: showreel
description: Preview of the Showreel demo-video skill (under development). Use only when the user names "showreel" explicitly; for ordinary demo videos use demo-video.
---

Showreel is a preview release under development.

Run the environment check or initialize a project:

```sh
node <skill>/scripts/showreel.mjs doctor
node <skill>/scripts/showreel.mjs init --name <name> --url <baseURL>
```

The CLI lives at the plugin root (`../../scripts` relative to this skill).
See the [design](https://github.com/ansh-n-chovatiya/agent-workbench/blob/main/docs/40-showreel-design.md) for the specification.
