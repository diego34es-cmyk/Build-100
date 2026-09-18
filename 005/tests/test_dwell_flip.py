import unittest
from research.dwell_flip import dwell_seconds_for_lifetime, first_dwell_end, flipped_after_dwell

class TestDwell(unittest.TestCase):
    def test_dwell_scale(self):
        self.assertEqual(dwell_seconds_for_lifetime(3600), 120)       # <2h → 2m
        self.assertEqual(dwell_seconds_for_lifetime(10 * 3600), 600)  # <1d → 10m
        self.assertEqual(dwell_seconds_for_lifetime(3 * 86400), 1800) # <7d → 30m
        self.assertEqual(dwell_seconds_for_lifetime(30 * 86400), 7200)

    def test_dwell_scale_edges(self):
        self.assertEqual(dwell_seconds_for_lifetime(2 * 3600 - 1), 120)
        self.assertEqual(dwell_seconds_for_lifetime(2 * 3600), 600)
        self.assertEqual(dwell_seconds_for_lifetime(7 * 86400), 7200)

    def test_first_dwell_end(self):
        # prices: (ts_seconds, mid)
        series = [(0, 0.5), (100, 0.95), (200, 0.96), (800, 0.97)]
        # dwell 600s at >=0.95 → ends at 100+600=700
        self.assertEqual(first_dwell_end(series, 0.95, 600), 700)

    def test_first_dwell_end_never_completes(self):
        series = [(0, 0.5), (100, 0.95), (500, 0.96), (650, 0.97)]
        self.assertIsNone(first_dwell_end(series, 0.95, 600))

    def test_first_dwell_end_reset_on_drop(self):
        # trade jumps across threshold but drops before dwell set → reset;
        # completes only once a later event timestamp confirms the dwell elapsed
        series = [(0, 0.5), (100, 0.95), (200, 0.4), (300, 0.95), (800, 0.96), (910, 0.97)]
        self.assertEqual(first_dwell_end(series, 0.95, 600), 900)

    def test_flip_yes(self):
        self.assertTrue(flipped_after_dwell(side="Yes", resolved="No"))
        self.assertFalse(flipped_after_dwell(side="Yes", resolved="Yes"))

    def test_flip_case_insensitive(self):
        self.assertTrue(flipped_after_dwell(side="yes", resolved="No"))
        self.assertFalse(flipped_after_dwell(side="Yes", resolved="yes"))

if __name__ == "__main__":
    unittest.main()