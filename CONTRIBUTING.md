# Contributing

Run ctx's stdlib suite from `plugins/ctx`:

```sh
python3 -m unittest discover -s tests -q
```

Run the Showreel suite from `plugins/showreel`:

```sh
npm ci
npm test
```

Browser and media smoke tests run separately from the Node unit suite
(see `.github/workflows/ci.yml`).
Run root checks with `python3 scripts/check-manifests.py`,
`python3 -m unittest discover -s scripts -p 'test_*.py'`, and
`python3 scripts/scan-personal-data.py`.

Bump the version in the plugin's manifest and CHANGELOG before tagging.
For ctx, also update `ctx.__version__`. Tags are `ctx-vX.Y.Z` or
`showreel-vX.Y.Z`; the root release workflow creates GitHub Releases
without publishing to PyPI or npm.

CI runs only the parts a change touches: `plugins/ctx` changes run the ctx jobs, `plugins/ctx-optimize` and
`plugins/showreel` likewise, and a change to the workflow or the marketplace manifest runs everything. The personal-data
scan and the manifest check always run. The single required check is `ci gate`, which passes when everything that ran
passed.
