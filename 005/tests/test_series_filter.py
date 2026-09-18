import unittest
from research.series_filter import is_crypto_short, should_include

class TestFilter(unittest.TestCase):
    def test_exclude_15m(self):
        self.assertTrue(is_crypto_short("Bitcoin Up or Down - 15 minutes", 15 * 60))
        self.assertTrue(is_crypto_short("ETH 5m", 5 * 60))

    def test_keep_hourly_crypto(self):
        self.assertFalse(is_crypto_short("Bitcoin Up or Down - 1 hour", 3600))

    def test_keep_weather(self):
        self.assertTrue(should_include({
            "title": "Highest temperature in Madrid on August 17?",
            "lifetime_sec": 86400,
            "tags": ["weather"],
        }))

    def test_drop_short_crypto(self):
        self.assertFalse(should_include({
            "title": "Bitcoin Up or Down - 15 minutes",
            "lifetime_sec": 15 * 60,
            "tags": ["crypto"],
        }))

    def test_drop_short_crypto_title_only(self):
        self.assertFalse(should_include({
            "title": "Solana up or down in 10 minutes?",
            "lifetime_sec": 10 * 60,
            "tags": [],
        }))

    def test_drop_long_duration_crypto_short_lifetime(self):
        # title looks crypto, duration 15m, but tag says weather-ish — still crypto by title
        self.assertTrue(is_crypto_short("Bitcoin Up or Down - 1 hour", 15 * 60))

    def test_keep_short_weather(self):
        self.assertTrue(should_include({
            "title": "Highest temperature in Madrid on August 17?",
            "lifetime_sec": 15 * 60,
            "tags": ["weather"],
        }))

if __name__ == "__main__":
    unittest.main()