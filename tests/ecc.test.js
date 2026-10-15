/* Optional verification: run `node tests/ecc.test.js` from the repository root. */
const assert = require("node:assert/strict");
const ecc = require("../js/ecc.js");

const expected = [
  [1, { x: 1, y: 5 }],
  [2, { x: 2, y: 10 }],
  [3, { x: 5, y: 9 }],
  [4, { x: 12, y: 1 }],
  [5, { x: 12, y: 16 }],
  [6, { x: 5, y: 8 }],
  [7, { x: 2, y: 7 }],
  [8, { x: 1, y: 12 }],
  [9, null],
  [10, { x: 1, y: 5 }]
];

for (const [scalar, point] of expected) {
  assert.deepEqual(ecc.multiply(scalar, ecc.DEFAULT_BASE), point, `${scalar}G`);
  assert.deepEqual(ecc.repeatedSteps(scalar, ecc.DEFAULT_BASE).at(-1).point, point);
  assert.deepEqual(ecc.fastSteps(scalar, ecc.DEFAULT_BASE).at(-1).accumulator, point);
}

assert.equal(ecc.enumeratePoints().length, 17);
assert.equal(ecc.pointOrder(ecc.DEFAULT_BASE), 9);
assert.equal(ecc.inverse(10), 12);
for (const base of ecc.enumeratePoints()) {
  const order = ecc.pointOrder(base);
  assert.equal(18 % order, 0, `Order of ${ecc.formatPoint(base)} must divide 18`);
  assert.deepEqual(ecc.multiply(order, base), null);
  for (let scalar = 1; scalar < 35; scalar += 1) {
    const direct = ecc.repeatedSteps(scalar, base).at(-1).point;
    assert.deepEqual(ecc.multiply(scalar, base), direct);
  }
}
console.log("All toy-curve checks passed: sequence, point count, inverse, group orders and both algorithms.");
