# Contributing

Run ctx's stdlib suite from `plugins/ctx`:

```sh
python3 -m unittest discover -s tests -q
```

Run the demo-video suite from `plugins/skills-demo/skills/demo-video`:

```sh
npm ci
npm test
```

The full Node suite needs Playwright browsers, ffmpeg and system voice tools;
CI runs a unit subset without those requirements (see `.github/workflows/ci.yml`).
Run root checks with `python3 scripts/check-manifests.py`,
`python3 -m unittest discover -s scripts -p 'test_*.py'`, and
`python3 scripts/scan-personal-data.py`.

Bump the version in the plugin's manifest and CHANGELOG before tagging.
For ctx, also update `ctx.__version__`. Tags are `ctx-vX.Y.Z` or
`skills-demo-vX.Y.Z`; the root release workflow creates GitHub Releases
without publishing to PyPI or npm.
