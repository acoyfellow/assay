# Free shipping over $50

Orders of $50.00 or more ship free in every region.

Acceptance:
- src/shipping.ts exports freeShippingFor(region: string, subtotal: Money): Money
- It returns zero in the subtotal's currency when subtotal is 5000 cents or more
- Otherwise it returns shippingFor(region, subtotal.currency)
- An unknown region still throws RangeError, even over $50

Files you will most likely change: src/shipping.ts, test/shipping.test.ts
