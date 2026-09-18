# SCAN_NOTES — Edition 1

**Date:** 2026-09-18

**Notes:** price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.; price-history fetch budget exhausted; finishing with what we have.

**Price path source:**
- Prefer CLOB `prices-history` when present.
- Fall back to `data-api.polymarket.com/trades` to rebuild paths for closed markets (CLOB drops resolved history).

**Exclusions:** crypto ≤15m by design.

**Rescan:**
```bash
cd /var/www/build100/005 && PYTHONPATH=. python3 -m research.scan_library --out data/library.json --edition N
```
