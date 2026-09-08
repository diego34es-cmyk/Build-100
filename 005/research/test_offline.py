"""Offline unit tests for LOCK-005 research math. No network."""

import unittest

from research.aggregate import build_curve, pick_lock
from research.dwell_flip import dwell_seconds_for_lifetime, first_dwell_end
from research.guard import should_refuse_live_write
from research.series_filter import should_include


class SeriesFilterTests(unittest.TestCase):
    def test_drops_short_crypto(self):
        self.assertFalse(should_include({"title": "BTC up or down", "lifetime_sec": 300, "tags": ["crypto"]}))
        self.assertTrue(should_include({"title": "CPI print", "lifetime_sec": 300, "tags": ["macro"]}))
        self.assertTrue(should_include({"title": "Bitcoin ETF flows", "lifetime_sec": 86400, "tags": ["crypto"]}))


class DwellTests(unittest.TestCase):
    def test_lifetime_buckets(self):
        self.assertEqual(dwell_seconds_for_lifetime(1800), 120)
        self.assertEqual(dwell_seconds_for_lifetime(10_000), 600)
        self.assertEqual(dwell_seconds_for_lifetime(200_000), 1800)

    def test_first_dwell_end(self):
        prices = [(0, 0.5), (30, 0.9), (100, 0.91), (200, 0.92)]
        self.assertEqual(first_dwell_end(prices, 0.9, 150), 180)
        self.assertIsNone(first_dwell_end(prices, 0.9, 400))


class GuardTests(unittest.TestCase):
    def test_default_network_scan_cannot_overwrite_library(self):
        self.assertTrue(should_refuse_live_write("data/library.json", False, False))
        self.assertFalse(should_refuse_live_write("data/library.json", True, False))
        self.assertFalse(should_refuse_live_write("data/library.json", False, True))
        self.assertFalse(should_refuse_live_write("/tmp/library.dry.json", False, False))


class AggregateTests(unittest.TestCase):
    def test_pick_lock_ready_then_thin(self):
        grid = [0.8, 0.9]
        events = [{"price": 0.8, "flip": False}] * 50
        curve = build_curve(events, grid)
        price, status = pick_lock(curve)
        self.assertEqual(status, "ready")
        self.assertEqual(price, 0.8)

        thin_events = [{"price": 0.8, "flip": False}] * 20
        price, status = pick_lock(build_curve(thin_events, grid))
        self.assertEqual(status, "thin")

        empty = pick_lock(build_curve([], grid))
        self.assertEqual(empty, (None, "insufficient"))


if __name__ == "__main__":
    unittest.main()
