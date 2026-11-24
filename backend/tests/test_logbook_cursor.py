from datetime import timezone

from logbook import _parse_cursor


def test_cursor_reads_server_time_with_or_without_zone():
    parsed = _parse_cursor("2026-11-24T10:00:00.123456+00:00")
    assert parsed is not None and parsed.tzinfo is not None
    bare = _parse_cursor("2026-11-24T10:00:00Z")
    assert bare is not None and bare.utcoffset() == timezone.utc.utcoffset(None)


def test_bad_cursor_means_a_full_pull():
    assert _parse_cursor(None) is None
    assert _parse_cursor("") is None
    assert _parse_cursor("yesterday") is None
