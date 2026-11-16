import { test } from "node:test";
import assert from "node:assert/strict";
import { money } from "../../src/core/money.ts";
import { TAX_RATES, taxFor } from "../../src/tax.ts";

test("WA and FL", () => {
  assert.deepEqual(taxFor(money(10000), "WA"), money(650));
  assert.deepEqual(taxFor(money(1999), "FL"), money(120));
});

test("old rates unchanged", () => {
  assert.equal(TAX_RATES.CA, 7.25);
  assert.equal(TAX_RATES.NY, 4);
  assert.equal(TAX_RATES.TX, 6.25);
  assert.equal(TAX_RATES.OR, 0);
});
