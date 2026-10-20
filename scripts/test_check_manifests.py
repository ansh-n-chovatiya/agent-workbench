"""Offline marketplace validation against isolated temporary trees."""

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("check-manifests.py")
SPEC = importlib.util.spec_from_file_location("check_manifests", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.market = {"name": "workbench", "owner": {"name": "Maintainer"},
                       "plugins": [{"name": "sample", "source": "./plugins/sample"}]}
        self.manifest = {"name": "sample", "version": "1.2.3", "license": "MIT"}
        self.directory = self.root / "plugins/sample"
        self.manifest_path = self.directory / ".claude-plugin/plugin.json"
        self.market_path = self.root / ".claude-plugin/marketplace.json"
        self.write_tree()
        (self.directory / "LICENSE").write_text("MIT", encoding="utf-8")

    def write_tree(self):
        for path, value in ((self.market_path, self.market), (self.manifest_path, self.manifest)):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(value), encoding="utf-8")

    def fails(self, expected):
        problems = checker.validate(self.root)
        self.assertTrue(any(expected in p for p in problems), problems)
        with patch.object(checker, "validate", return_value=problems):
            with patch("builtins.print"):
                self.assertEqual(checker.main(), 1)

    def test_valid_tree(self):
        self.assertEqual(checker.validate(self.root), [])

    def test_showreel_entry_is_validated_by_generic_checker(self):
        self.market["plugins"][0] = {"name": "showreel", "source": "./plugins/showreel"}
        self.directory = self.root / "plugins/showreel"
        self.manifest_path = self.directory / ".claude-plugin/plugin.json"
        self.manifest["name"] = "showreel"
        self.write_tree()
        (self.directory / "LICENSE").write_text("MIT", encoding="utf-8")
        self.assertEqual(checker.validate(self.root), [])
        self.manifest["version"] = "invalid"
        self.write_tree()
        self.fails("semver")
        self.manifest_path.unlink()
        self.fails("cannot read JSON")

    def test_cli_exit_codes(self):
        # Copy only the checker into the fixture so its root detection is real.
        script = self.root / "scripts/check-manifests.py"
        script.parent.mkdir()
        script.write_bytes(SCRIPT.read_bytes())
        proc = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
        self.assertEqual((proc.returncode, proc.stdout, proc.stderr), (0, "", ""))
        self.manifest["version"] = "broken\nversion"
        del self.manifest["license"]
        self.write_tree()
        proc = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(len(proc.stdout.splitlines()), 2)
        self.assertEqual(proc.stderr, "")

    def test_required_marketplace_fields(self):
        for field in ("name", "owner", "plugins"):
            with self.subTest(field=field):
                original = self.market.pop(field)
                self.write_tree()
                self.fails(field)
                self.market[field] = original

    def test_invalid_marketplace_shapes(self):
        for field, values in (("name", [None, "", 3]), ("owner", [None, "", {}, {"name": ""}]),
                              ("plugins", [None, {}, "sample"])):
            original = self.market[field]
            for value in values:
                with self.subTest(field=field, value=value):
                    self.market[field] = value
                    self.write_tree()
                    self.fails(field)
            self.market[field] = original

    def test_duplicate_names(self):
        self.market["plugins"].append(dict(self.market["plugins"][0]))
        self.write_tree()
        self.fails("duplicate")

    def test_reserved_prefixes(self):
        for prefix in ("claude-", "anthropic-"):
            self.market["plugins"][0]["name"] = prefix + "sample"
            self.manifest["name"] = prefix + "sample"
            self.write_tree()
            self.fails("reserved")

    def test_bad_entries_and_names(self):
        for entry in (None, "sample", {}, {"name": []}, {"name": ""}):
            self.market["plugins"] = [entry]
            self.write_tree()
            self.assertTrue(checker.validate(self.root))

    def test_bad_sources(self):
        for source in (None, 1, "plugins/sample", "/plugins/sample", "./../sample",
                       "./plugins/../sample", "./", ".//etc", "./plugins\\sample"):
            with self.subTest(source=source):
                self.market["plugins"][0]["source"] = source
                self.write_tree()
                self.fails("source")

    def test_missing_source(self):
        self.market["plugins"][0]["source"] = "./missing"
        self.write_tree()
        self.fails("source directory")

    def test_source_is_file(self):
        self.market["plugins"][0]["source"] = "./plugins/sample/LICENSE"
        self.write_tree()
        self.fails("source directory")

    def test_source_symlink_escape(self):
        with tempfile.TemporaryDirectory() as outside:
            (self.root / "escape").symlink_to(outside, target_is_directory=True)
            self.market["plugins"][0]["source"] = "./escape"
            self.write_tree()
            self.fails("outside")

    def test_missing_manifest(self):
        self.manifest_path.unlink()
        self.fails("cannot read JSON")

    def test_manifest_name_mismatch(self):
        for name in (None, "different"):
            self.manifest["name"] = name
            self.write_tree()
            self.fails("manifest name")

    def test_invalid_versions(self):
        for version in (None, 1, "", "1.2", "v1.2.3", "01.2.3", "1.2.3-01", "1.2.3-", "1.2.3+", "1.2.3\n"):
            with self.subTest(version=version):
                self.manifest["version"] = version
                self.write_tree()
                self.fails("semver")

    def test_valid_semver_variants(self):
        for version in ("0.0.0", "1.2.3-alpha.0", "1.2.3-1a.2+build.01", "1.2.3+meta"):
            self.manifest["version"] = version
            self.write_tree()
            self.assertEqual(checker.validate(self.root), [])

    def test_missing_version_and_license(self):
        for field in ("version", "license"):
            value = self.manifest.pop(field)
            self.write_tree()
            self.fails("semver" if field == "version" else "license")
            self.manifest[field] = value

    def test_invalid_license(self):
        for value in (None, "", "  ", []):
            self.manifest["license"] = value
            self.write_tree()
            self.fails("license")

    def test_missing_license_file(self):
        (self.directory / "LICENSE").unlink()
        self.fails("LICENSE file")

    def test_malformed_or_nonobject_json(self):
        for path in (self.market_path, self.manifest_path):
            for text in ("{", "[]", "null"):
                self.write_tree()
                path.write_text(text, encoding="utf-8")
                self.assertTrue(checker.validate(self.root))


if __name__ == "__main__":
    unittest.main()
