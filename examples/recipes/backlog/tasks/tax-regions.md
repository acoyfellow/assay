# Add two tax regions

We now sell in Washington and Florida.

Acceptance:
- TAX_RATES in src/tax.ts has WA at 6.5 and FL at 6
- taxFor works for both, rounded the same way as the other regions
- No other rate changes

Files you will most likely change: src/tax.ts, test/tax.test.ts
