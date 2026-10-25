/*
 * Educational EC-ElGamal-style demonstration over secp256k1.
 * This is deliberately not production cryptography.
 */
(function (root) {
  'use strict';

  const P = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  const N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
  const G = Object.freeze({
    x: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
    y: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8')
  });

  function mod(value, modulus = P) {
    const result = value % modulus;
    return result >= 0n ? result : result + modulus;
  }

  function modInverse(value, modulus = P) {
    let oldR = mod(value, modulus);
    let r = modulus;
    let oldS = 1n;
    let s = 0n;

    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }

    if (oldR !== 1n) throw new Error('Modular inverse does not exist.');
    return mod(oldS, modulus);
  }

  function pointAdd(first, second) {
    if (first === null) return second;
    if (second === null) return first;

    if (first.x === second.x && mod(first.y + second.y) === 0n) return null;

    let slope;
    if (first.x === second.x && first.y === second.y) {
      if (first.y === 0n) return null;
      slope = mod(3n * first.x * first.x * modInverse(2n * first.y));
    } else {
      slope = mod((second.y - first.y) * modInverse(second.x - first.x));
    }

    const x = mod(slope * slope - first.x - second.x);
    const y = mod(slope * (first.x - x) - first.y);
    return { x, y };
  }

  function pointNegate(point) {
    return point === null ? null : { x: point.x, y: mod(-point.y) };
  }

  function pointSubtract(first, second) {
    return pointAdd(first, pointNegate(second));
  }

  function scalarMultiply(scalar, point = G) {
    let k = BigInt(scalar);
    if (k < 0n) return scalarMultiply(-k, pointNegate(point));
    k = mod(k, N);

    let result = null;
    let addend = point;
    while (k > 0n) {
      if ((k & 1n) === 1n) result = pointAdd(result, addend);
      addend = pointAdd(addend, addend);
      k >>= 1n;
    }
    return result;
  }

  function pointEquals(first, second) {
    if (first === null || second === null) return first === second;
    return first.x === second.x && first.y === second.y;
  }

  function pointKey(point) {
    if (point === null) return 'INFINITY';
    return point.x.toString(16) + ':' + point.y.toString(16);
  }

  function pointHex(point) {
    if (point === null) return 'point at infinity';
    return {
      x: '0x' + point.x.toString(16).padStart(64, '0'),
      y: '0x' + point.y.toString(16).padStart(64, '0')
    };
  }

  function publicKeyFromPrivate(privateKey) {
    const d = BigInt(privateKey);
    if (d <= 0n || d >= N) throw new Error('Private scalar must be in the interval 1..n−1.');
    return scalarMultiply(d, G);
  }

  function validatePrintableAscii(message) {
    for (const character of message) {
      const code = character.charCodeAt(0);
      if (code < 32 || code > 126) {
        throw new Error('For this demonstration, use printable ASCII characters only (space through ~).');
      }
    }
  }

  let asciiPointMap = null;
  function getAsciiPointMap() {
    if (asciiPointMap) return asciiPointMap;
    asciiPointMap = new Map();
    for (let code = 32; code <= 126; code += 1) {
      asciiPointMap.set(pointKey(scalarMultiply(BigInt(code), G)), code);
    }
    return asciiPointMap;
  }

  function encryptText(message, publicKey, randomScalar) {
    validatePrintableAscii(message);
    if (typeof randomScalar !== 'function') throw new Error('A random-scalar function is required.');

    return Array.from(message).map((character) => {
      const messagePoint = scalarMultiply(BigInt(character.charCodeAt(0)), G);
      const r = BigInt(randomScalar());
      if (r <= 0n || r >= N) throw new Error('Ephemeral scalar must be in the interval 1..n−1.');
      const c1 = scalarMultiply(r, G);
      const c2 = pointAdd(messagePoint, scalarMultiply(r, publicKey));
      return { c1, c2 };
    });
  }

  function decryptText(ciphertext, privateKey) {
    const d = BigInt(privateKey);
    const lookup = getAsciiPointMap();
    return ciphertext.map((item) => {
      const messagePoint = pointSubtract(item.c2, scalarMultiply(d, item.c1));
      const code = lookup.get(pointKey(messagePoint));
      if (code === undefined) {
        throw new Error('The decrypted point did not map to printable ASCII. Check the key and ciphertext.');
      }
      return String.fromCharCode(code);
    }).join('');
  }

  // The attack uses only the public point Q and a declared candidate range.
  // It does not need the private-key input value.
  function bruteForcePrivateKey(publicKey, maxCandidate = 1000) {
    let candidatePoint = null;
    for (let candidate = 1; candidate <= maxCandidate; candidate += 1) {
      candidatePoint = pointAdd(candidatePoint, G);
      if (pointEquals(candidatePoint, publicKey)) {
        return { privateKey: candidate, checks: candidate };
      }
    }
    return { privateKey: null, checks: maxCandidate };
  }

  const api = {
    P, N, G, mod, modInverse, pointAdd, pointNegate, pointSubtract,
    scalarMultiply, pointEquals, pointKey, pointHex, publicKeyFromPrivate,
    validatePrintableAscii, encryptText, decryptText, bruteForcePrivateKey
  };

  root.ToyECC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
