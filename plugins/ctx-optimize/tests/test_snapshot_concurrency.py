"""Snapshots must survive reports that finish in the same second.

`write_snapshot` used to write `usage-<stamp>.json`, so a second run in the same second silently replaced the first.
Names are now claimed atomically (a hard link fails if the name exists), suffixed `-2`, `-3`, ... and never reused
while a higher one exists, so retention (`prune_snapshots`) cannot delete a snapshot that was just written.
"""
import errno
import json
import os
import threading

import pytest

from ctx_optimize.snapshot import prune_snapshots, read_snapshot, write_snapshot

STAMP = "20261019T100000"


def test_forty_concurrent_writers_with_one_stamp_lose_nothing(tmp_path):
    paths, errors, barrier = [], [], threading.Barrier(40)

    def work(i):
        try:
            barrier.wait(20)
            paths.append(write_snapshot({"i": i}, tmp_path, STAMP))
        except BaseException as e:  # noqa: BLE001 - reported below
            errors.append(repr(e))

    threads = [threading.Thread(target=work, args=(i,)) for i in range(40)]
    [t.start() for t in threads]
    [t.join(60) for t in threads]
    assert errors == []
    assert len(set(paths)) == 40
    assert sorted(read_snapshot(p)["i"] for p in paths) == list(range(40))
    assert sorted(p.name for p in tmp_path.iterdir()) == sorted(p.name for p in paths)  # no temp leftovers


def test_an_existing_file_is_never_overwritten(tmp_path):
    (tmp_path / f"usage-{STAMP}.json").write_text('"orig"')
    assert write_snapshot({"a": 1}, tmp_path, STAMP).name == f"usage-{STAMP}-2.json"
    assert (tmp_path / f"usage-{STAMP}.json").read_text() == '"orig"'
    assert write_snapshot({"a": 2}, tmp_path, STAMP).name == f"usage-{STAMP}-3.json"


def test_the_first_write_has_no_suffix_and_creates_the_directory(tmp_path):
    assert write_snapshot({}, tmp_path / "new", STAMP).name == f"usage-{STAMP}.json"


def test_a_name_freed_by_pruning_is_not_reused(tmp_path):
    """Reusing the lowest free name would put a brand-new snapshot in the oldest slot, where the next prune deletes it."""
    for n in range(1, 6):
        write_snapshot({"n": n}, tmp_path, STAMP)
    prune_snapshots(tmp_path, 3)  # removes the unsuffixed file and -2
    assert write_snapshot({"n": 6}, tmp_path, STAMP).name == f"usage-{STAMP}-6.json"


def test_without_hard_links_it_still_never_overwrites(tmp_path, monkeypatch):
    def no_links(*_a, **_k):
        raise OSError(errno.EPERM, "hard links not supported")

    monkeypatch.setattr(os, "link", no_links)
    first = write_snapshot({"a": 1}, tmp_path, STAMP)
    second = write_snapshot({"a": 2}, tmp_path, STAMP)
    assert (first.name, second.name) == (f"usage-{STAMP}.json", f"usage-{STAMP}-2.json")
    assert read_snapshot(first) == {"a": 1} and read_snapshot(second) == {"a": 2}
    assert [p.name for p in tmp_path.iterdir() if p.suffix == ".tmp"] == []


def test_prune_orders_numerically_and_ignores_other_files(tmp_path):
    names = ["usage-20261019T100000.json", "usage-20261019T100000-2.json", "usage-20261019T100000-9.json",
             "usage-20261019T100000-10.json", "usage-20261019T090000-5.json", "usage-20261019T110000.json"]
    other = ["notes.txt", "usage-x.tmp", "usage-.json", "usage-20261019T100000-2.json.bak", "tmpabc.tmp",
             "usage-2026-10-19.json", "usage-shared.json"]
    for n in names + other:
        (tmp_path / n).write_text("{}")
    gone = prune_snapshots(tmp_path, 3)
    assert [p.name for p in gone] == ["usage-20261019T090000-5.json", "usage-20261019T100000.json",
                                      "usage-20261019T100000-2.json"]
    assert sorted(p.name for p in tmp_path.iterdir()) == sorted(
        ["usage-20261019T100000-9.json", "usage-20261019T100000-10.json", "usage-20261019T110000.json"] + other)


def test_prune_edges(tmp_path):
    assert prune_snapshots(tmp_path / "missing", 3) == []
    write_snapshot({}, tmp_path, STAMP)
    assert prune_snapshots(tmp_path, 5) == []
    for bad in (0, -1):
        with pytest.raises(ValueError):
            prune_snapshots(tmp_path, bad)


def test_prune_reports_only_what_it_deleted(tmp_path, monkeypatch):
    for n in range(3):
        write_snapshot({}, tmp_path, STAMP)
    real_unlink = type(tmp_path).unlink

    def racing_unlink(self, *a, **k):  # another process removed it first
        real_unlink(self, *a, **k)
        raise FileNotFoundError(self)

    monkeypatch.setattr(type(tmp_path), "unlink", racing_unlink)
    assert prune_snapshots(tmp_path, 1) == []


def test_concurrent_prune_and_write_raise_nothing_and_leave_valid_files(tmp_path):
    errors = []

    def writer(k):
        try:
            for i in range(20):
                write_snapshot({"k": k, "i": i}, tmp_path, "20261019T10%04d" % (i % 3))
        except BaseException as e:  # noqa: BLE001
            errors.append(repr(e))

    def pruner():
        try:
            for _ in range(40):
                prune_snapshots(tmp_path, 5)
        except BaseException as e:  # noqa: BLE001
            errors.append(repr(e))

    threads = [threading.Thread(target=writer, args=(k,)) for k in range(4)] + \
              [threading.Thread(target=pruner) for _ in range(3)]
    [t.start() for t in threads]
    [t.join(60) for t in threads]
    assert errors == []
    for p in tmp_path.glob("usage-*.json"):
        json.loads(p.read_text())
