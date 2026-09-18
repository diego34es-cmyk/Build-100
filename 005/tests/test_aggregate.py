import unittest
from research.aggregate import build_curve, pick_lock

class TestAggregate(unittest.TestCase):
    def test_build_curve_buckets_by_grid(self):
        events = [
            {"price": 0.80, "flip": False},
            {"price": 0.80, "flip": False},
            {"price": 0.80, "flip": True},
            {"price": 0.85, "flip": True},
        ]
        grid = [0.80, 0.85, 0.90]
        curve = build_curve(events, grid)
        by_price = {row["price"]: row for row in curve}
        self.assertEqual(by_price[0.80]["n"], 4)
        self.assertEqual(by_price[0.80]["flip"], 2 / 4)
        self.assertEqual(by_price[0.85]["n"], 1)
        self.assertEqual(by_price[0.85]["flip"], 1.0)
        self.assertEqual(by_price[0.90]["n"], 0)
        self.assertIsNone(by_price[0.90]["flip"])

    def test_build_curve_empty_events(self):
        curve = build_curve([], [0.80, 0.85])
        for row in curve:
            self.assertEqual(row["n"], 0)
            self.assertIsNone(row["flip"])

    def test_pick_lock_ready(self):
        curve = [
            {"price": 0.80, "flip": 0.04, "n": 80},
            {"price": 0.85, "flip": 0.0, "n": 60},
        ]
        lock, status = pick_lock(curve)
        self.assertEqual(lock, 0.85)
        self.assertEqual(status, "ready")

    def test_pick_lock_ready_nflip_edge(self):
        curve = [{"price": 0.90, "flip": 0.0, "n": 50}]
        lock, status = pick_lock(curve)
        self.assertEqual(lock, 0.90)
        self.assertEqual(status, "ready")

    def test_pick_lock_thin_by_sample(self):
        curve = [{"price": 0.90, "flip": 0.0, "n": 30}]
        lock, status = pick_lock(curve)
        self.assertEqual(lock, 0.90)
        self.assertEqual(status, "thin")

    def test_pick_lock_thin_by_flip(self):
        curve = [{"price": 0.90, "flip": 0.02, "n": 80}]
        lock, status = pick_lock(curve)
        self.assertEqual(lock, 0.90)
        self.assertEqual(status, "thin")

    def test_pick_lock_insufficient(self):
        curve = [{"price": 0.90, "flip": 0.2, "n": 10}]
        lock, status = pick_lock(curve)
        self.assertIsNone(lock)
        self.assertEqual(status, "insufficient")

    def test_pick_lock_insufficient_no_flips(self):
        curve = [
            {"price": 0.85, "flip": 0.10, "n": 60},
            {"price": 0.90, "flip": None, "n": 0},
        ]
        lock, status = pick_lock(curve)
        self.assertIsNone(lock)
        self.assertEqual(status, "insufficient")

    def test_pick_lock_prefers_lowest_ready(self):
        curve = [
            {"price": 0.80, "flip": 0.0, "n": 55},
            {"price": 0.85, "flip": 0.0, "n": 60},
        ]
        lock, status = pick_lock(curve)
        self.assertEqual(lock, 0.80)
        self.assertEqual(status, "ready")

    def test_pick_lock_thin_prefers_zero_flip(self):
        curve = [
            {"price": 0.80, "flip": 0.025, "n": 39},
            {"price": 0.85, "flip": 0.0, "n": 34},
            {"price": 0.90, "flip": 0.0, "n": 24},
        ]
        lock, status = pick_lock(curve)
        self.assertEqual(lock, 0.85)
        self.assertEqual(status, "thin")

if __name__ == "__main__":
    unittest.main()