/*
 * Toy elliptic-curve arithmetic for Statistics Homework 1.
 * Curve: y² = x³ + 7 (mod 17).
 *
 * This is a teaching example, NOT an implementation of secp256k1.
 * null represents the point at infinity (the additive identity).
 */

const ToyECC = (() => {
  "use strict";

  const P = 17;
  const DEFAULT_BASE = Object.freeze({ x: 1, y: 5 });

  // JavaScript % can return a negative value, so normalize to [0, 16].
  function mod(value) {
    return ((value % P) + P) % P;
  }

  function isOnCurve(point) {
    if (point === null) return true;
    if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) return false;
    if (point.x < 0 || point.x >= P || point.y < 0 || point.y >= P) return false;
    return mod(point.y ** 2 - point.x ** 3 - 7) === 0;
  }

  function equals(a, b) {
    if (a === null || b === null) return a === b;
    return a.x === b.x && a.y === b.y;
  }

  function formatPoint(point, compact = false) {
    if (point === null) return compact ? "∞" : "∞ (identity)";
    return compact ? `(${point.x},${point.y})` : `(${point.x}, ${point.y})`;
  }

  // Extended Euclidean algorithm finds a^-1 (mod 17).
  function inverse(value) {
    let remainder = mod(value);
    if (remainder === 0) throw new Error("Zero does not have a modular inverse.");

    let oldR = remainder;
    let r = P;
    let oldT = 1;
    let t = 0;

    while (r !== 0) {
      const quotient = Math.floor(oldR / r);
      [oldR, r] = [r, oldR - quotient * r];
      [oldT, t] = [t, oldT - quotient * t];
    }

    if (oldR !== 1) throw new Error("This denominator is not invertible.");
    return mod(oldT);
  }

  // Return both the sum and a short explanation for the animation.
  function addWithExplanation(a, b) {
    if (!isOnCurve(a) || !isOnCurve(b)) {
      throw new Error("At least one supplied point is not on the toy curve.");
    }

    if (a === null) {
      return { point: b, explanation: `∞ + ${formatPoint(b, true)} = ${formatPoint(b, true)} (identity rule).` };
    }
    if (b === null) {
      return { point: a, explanation: `${formatPoint(a, true)} + ∞ = ${formatPoint(a, true)} (identity rule).` };
    }

    // Points with the same x and opposite y cancel to the identity.
    // This also covers doubling a point for which y = 0.
    if (a.x === b.x && mod(a.y + b.y) === 0) {
      return { point: null, explanation: `${formatPoint(a, true)} + ${formatPoint(b, true)} = ∞ (inverse points).` };
    }

    const doubling = equals(a, b);
    const numerator = doubling ? mod(3 * a.x ** 2) : mod(b.y - a.y);
    const denominator = doubling ? mod(2 * a.y) : mod(b.x - a.x);
    const denominatorInverse = inverse(denominator);
    const slope = mod(numerator * denominatorInverse);
    const x = mod(slope ** 2 - a.x - b.x);
    const y = mod(slope * (a.x - x) - a.y);
    const point = { x, y };

    if (!isOnCurve(point)) throw new Error("Point-addition calculation failed.");

    return {
      point,
      explanation: `${doubling ? "Doubling" : "Adding"} ${formatPoint(a, true)}${doubling ? "" : " + " + formatPoint(b, true)}: ` +
        `λ = ${numerator} × ${denominatorInverse} mod 17 = ${slope}; ` +
        `x₃ = ${x}, y₃ = ${y}. Result: ${formatPoint(point, true)}.`
    };
  }

  function add(a, b) {
    return addWithExplanation(a, b).point;
  }

  function enumeratePoints() {
    const results = [];
    for (let x = 0; x < P; x += 1) {
      for (let y = 0; y < P; y += 1) {
        const point = { x, y };
        if (isOnCurve(point)) results.push(point);
      }
    }
    return results;
  }

  function pointOrder(base) {
    if (base === null || !isOnCurve(base)) throw new Error("Choose a finite point on the curve.");
    let accumulator = null;
    for (let count = 1; count <= 2 * P + 4; count += 1) {
      accumulator = add(accumulator, base);
      if (accumulator === null) return count;
    }
    throw new Error("Unable to determine the point order.");
  }

  // Binary double-and-add uses O(log k) group operations.
  function multiply(scalar, base) {
    if (!Number.isSafeInteger(scalar) || scalar < 0) {
      throw new Error("The scalar must be a non-negative integer.");
    }
    if (!isOnCurve(base)) throw new Error("Base point is not on the curve.");

    let result = null;
    let addend = base;
    let remaining = scalar;

    while (remaining > 0) {
      if (remaining % 2 === 1) result = add(result, addend);
      remaining = Math.floor(remaining / 2);
      if (remaining > 0) addend = add(addend, addend);
    }
    return result;
  }

  function repeatedSteps(scalar, base) {
    const steps = [];
    let current = null;

    for (let n = 1; n <= scalar; n += 1) {
      const operation = addWithExplanation(current, base);
      current = operation.point;
      steps.push({
        title: `${n}G`,
        point: current,
        accumulator: current,
        explanation: n === 1
          ? `Start with G = ${formatPoint(base)}. ${operation.explanation}`
          : `${n}G = (${n - 1})G + G. ${operation.explanation}`
      });
    }
    return steps;
  }

  function fastSteps(scalar, base) {
    const steps = [];
    let accumulator = null;
    let addend = base;
    let remaining = scalar;
    let bit = 0;

    while (remaining > 0) {
      if (remaining % 2 === 1) {
        const operation = addWithExplanation(accumulator, addend);
        accumulator = operation.point;
        steps.push({
          title: `Add 2^${bit}G`,
          point: accumulator,
          accumulator,
          explanation: `Bit ${bit} of k is 1, so add ${formatPoint(addend, true)} to the accumulator. ${operation.explanation}`
        });
      }

      remaining = Math.floor(remaining / 2);
      if (remaining > 0) {
        const operation = addWithExplanation(addend, addend);
        addend = operation.point;
        steps.push({
          title: `Double 2^${bit}G`,
          point: addend,            // Point being doubled, for the trace.
          accumulator,             // Public-key accumulator remains unchanged.
          explanation: `Prepare the next power of two. ${operation.explanation} The accumulator does not change.`
        });
      }
      bit += 1;
    }
    return steps;
  }

  return Object.freeze({
    P, DEFAULT_BASE, mod, inverse, isOnCurve, equals, formatPoint,
    add, addWithExplanation, enumeratePoints, pointOrder,
    multiply, repeatedSteps, fastSteps
  });
})();

// Browser scripts work from a local folder (no server or build tooling needed).
if (typeof window !== "undefined") window.ToyECC = ToyECC;
// Also export the pure mathematical functions for Node.js tests.
if (typeof module !== "undefined" && module.exports) module.exports = ToyECC;
