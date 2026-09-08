"""Refuse accidental live library overwrites. Network scans need --force-write."""

from os.path import basename, normpath


def is_live_library_path(out: str) -> bool:
    path = normpath(out or "")
    return basename(path) == "library.json" and not path.endswith("library.fixture.json")


def should_refuse_live_write(out: str, no_history: bool, force_write: bool) -> bool:
    if no_history or force_write:
        return False
    return is_live_library_path(out)
