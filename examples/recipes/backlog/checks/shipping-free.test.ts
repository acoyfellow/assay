import { test } from "node:test";
import assert from "node:assert/strict";
import { money } from "../../src/core/money.ts";
import { freeShippingFor } from "../../src/shipping.ts";

test("free at and over $50", () => {
  assert.deepEqual(freeShippingFor("CA", money(5000)), money(0));
  assert.deepEqual(freeShippingFor("NY", money(12000, "EUR")), money(0, "EUR"));
});

test("normal shipping under $50", () => {
  assert.deepEqual(freeShippingFor("CA", money(4999)), money(599));
  assert.deepEqual(freeShippingFor("TX", money(100, "EUR")), money(649, "EUR"));
});

test("unknown region still refused", () => {
  assert.throws(() => freeShippingFor("ZZ", money(9000)), RangeError);
});
