"""Exercise release workflow guards and ZIP contents offline, without git."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import textwrap
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / '.github/workflows/release.yml').read_text(encoding='utf-8').split('\n  showreel:', 1)[1]


def block(name):
    step = WORKFLOW.split('      - name: ' + name + '\n', 1)[1]
    return step.split('\n      - ', 1)[0]


def heredoc(name, language):
    body = block(name)
    marker = "<<'%s'\n" % language
    return textwrap.dedent(body.split(marker, 1)[1].split('\n          ' + language, 1)[0])


class ShowreelReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.plugin = self.root / 'plugins/showreel'
        (self.plugin / '.claude-plugin').mkdir(parents=True)
        (self.root / '.claude-plugin').mkdir()
        self.manifest = self.plugin / '.claude-plugin/plugin.json'
        self.manifest.write_text(json.dumps({'name': 'showreel', 'version': '0.1.0'}))
        (self.plugin / 'package.json').write_text(self.manifest.read_text())
        self.market = self.root / '.claude-plugin/marketplace.json'
        self.market.write_text(json.dumps({'plugins': [{'name': 'showreel', 'source': './plugins/showreel'}]}))
        (self.root / 'THIRD_PARTY_NOTICES.md').write_text('notices')
        self.env = dict(os.environ, RUNNER_TEMP=str(self.root), GITHUB_REF_NAME='showreel-v0.1.0')

    @unittest.skipUnless(shutil.which('node'), 'Node required for release guard')
    def test_tag_package_and_marketplace_guard(self):
        source = heredoc('The tag agrees with the source and marketplace', 'JS')
        def run():
            return subprocess.run(['node', '--input-type=module', '-e', source], cwd=str(self.plugin), env=self.env, capture_output=True)
        self.assertEqual(run().returncode, 0)
        self.env['GITHUB_REF_NAME'] = 'showreel-v9.9.9'
        self.assertNotEqual(run().returncode, 0)
        self.env['GITHUB_REF_NAME'] = 'showreel-v0.1.0'
        (self.plugin / 'package.json').write_text('{"name":"showreel","version":"9.9.9"}')
        self.assertNotEqual(run().returncode, 0)
        (self.plugin / 'package.json').write_text(self.manifest.read_text())
        self.market.write_text('{"plugins":[]}')
        self.assertNotEqual(run().returncode, 0)

    @unittest.skipUnless(shutil.which('node'), 'Node required for engine guard')
    def test_node_engine_boundaries(self):
        source = heredoc('Verify Node version', 'JS')
        for version, succeeds in [('18.20.0', False), ('20.18.0', False),
                                  ('20.19.0', True), ('21.7.0', False),
                                  ('22.11.0', False), ('22.12.0', True),
                                  ('24.0.0', True)]:
            with self.subTest(version=version):
                script = source.replace('process.versions.node', json.dumps(version))
                result = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True)
                self.assertEqual(result.returncode == 0, succeeds)

    def test_archive_filter_keeps_dist_and_drops_cache_fixtures_and_spikes(self):
        kept = ['.claude-plugin/plugin.json', 'skills/showreel/SKILL.md', 'dist/render-page.js', 'dist/audit-page.js',
                'dist/editor/editor.js', 'scripts/showreel.mjs', 'assets/fonts/OFL.txt', 'fixtures/demo-app/index.html']
        names = kept + ['node_modules/pkg/index.js', '.npm-cache/blob',
                 'test/fixtures/large.mp4', 'spikes/movie.mp4', 'nested/node_modules/pkg/index.js']
        with zipfile.ZipFile(self.root / 'showreel-source.zip', 'w') as output:
            for name in names:
                output.writestr('showreel/' + name, name)
        source = heredoc('Build plugin archive', 'PY')
        result = subprocess.run(['python3', '-c', source], cwd=str(self.plugin), env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        with zipfile.ZipFile(self.root / 'showreel-0.1.0.zip') as archive:
            self.assertEqual(set(archive.namelist()), {'showreel/' + name for name in kept} | {'showreel/THIRD_PARTY_NOTICES.md'})

    def test_incomplete_archive_is_rejected(self):
        # Regression: git archive run from inside the plugin folder once produced an archive with a single file.
        with zipfile.ZipFile(self.root / 'showreel-source.zip', 'w') as output:
            output.writestr('showreel/README.md', 'only this')
        source = heredoc('Build plugin archive', 'PY')
        result = subprocess.run(['python3', '-c', source], cwd=str(self.plugin), env=self.env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('incomplete', result.stderr + result.stdout)

    def test_changelog_extracts_only_matching_section(self):
        source = block('Extract changelog notes').split('        run: |\n', 1)[1]
        source = textwrap.dedent(source)
        (self.plugin / 'CHANGELOG.md').write_text('## 0.2.0\nnew\n## 0.1.0\nship\n## 0.0.1\nold\n')
        result = subprocess.run(['python3', '-c', source], cwd=str(self.plugin), env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / 'release-notes.md').read_text(), 'ship\n')
        (self.root / 'release-notes.md').unlink()
        (self.plugin / 'CHANGELOG.md').write_text('## 0.2.0\nother release\n')
        result = subprocess.run(['python3', '-c', source], cwd=str(self.plugin), env=self.env, capture_output=True)
        self.assertEqual(result.returncode, 0)
        self.assertFalse((self.root / 'release-notes.md').exists())


    def test_release_checks_precede_publication_and_actions_use_existing_pins(self):
        self.assertIn('"showreel-v*"', (ROOT / '.github/workflows/release.yml').read_text())
        for command in ('npm ci', 'npm run build', 'git diff --exit-code -- dist', 'npm test', 'node scripts/check-licences.mjs'):
            self.assertLess(WORKFLOW.index(command), WORKFLOW.index('gh release create'))
        self.assertIn('--generate-notes', WORKFLOW)
        self.assertIn('!${{ runner.temp }}/showreel-source.zip', WORKFLOW)
        pins = re.findall(r'uses: ([^\s]+)', WORKFLOW)
        self.assertEqual(pins, ['actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1', 'actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9'])


if __name__ == '__main__':
    unittest.main()
