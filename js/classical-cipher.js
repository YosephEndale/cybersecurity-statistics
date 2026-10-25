/* Caesar cipher and English letter-frequency attack for the coursework demo. */
(function (root) {
  'use strict';

  const ENGLISH_FREQUENCIES = [
    0.08167, 0.01492, 0.02782, 0.04253, 0.12702, 0.02228, 0.02015,
    0.06094, 0.06966, 0.00153, 0.00772, 0.04025, 0.02406, 0.06749,
    0.07507, 0.01929, 0.00095, 0.05987, 0.06327, 0.09056, 0.02758,
    0.00978, 0.02360, 0.00150, 0.01974, 0.00074
  ];

  function normalizeShift(shift) {
    const value = Number(shift);
    if (!Number.isFinite(value)) throw new Error('Shift must be a number.');
    return ((Math.trunc(value) % 26) + 26) % 26;
  }

  function caesarTransform(text, shift) {
    const amount = normalizeShift(shift);
    return Array.from(text).map((character) => {
      const code = character.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + amount) % 26) + 65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + amount) % 26) + 97);
      return character;
    }).join('');
  }

  function letterCount(text) {
    let count = 0;
    for (const character of text) {
      const code = character.toLowerCase().charCodeAt(0);
      if (code >= 97 && code <= 122) count += 1;
    }
    return count;
  }

  function chiSquareForPlaintext(plaintext) {
    const counts = new Array(26).fill(0);
    let total = 0;
    for (const character of plaintext.toLowerCase()) {
      const code = character.charCodeAt(0) - 97;
      if (code >= 0 && code < 26) {
        counts[code] += 1;
        total += 1;
      }
    }
    if (total === 0) return Infinity;

    let score = 0;
    for (let index = 0; index < 26; index += 1) {
      const expected = ENGLISH_FREQUENCIES[index] * total;
      const difference = counts[index] - expected;
      score += (difference * difference) / expected;
    }
    return score;
  }

  // Returns the likely encryption shift, plaintext candidate and chi-square score.
  function frequencyAttack(ciphertext) {
    if (letterCount(ciphertext) === 0) return null;
    let best = null;
    for (let key = 0; key < 26; key += 1) {
      const plaintext = caesarTransform(ciphertext, -key);
      const score = chiSquareForPlaintext(plaintext);
      if (best === null || score < best.score) best = { key, plaintext, score };
    }
    return best;
  }

  function prefixByLetters(text, targetLetters) {
    if (targetLetters <= 0) return '';
    let seen = 0;
    let end = 0;
    for (const character of text) {
      end += character.length;
      if (/[A-Za-z]/.test(character)) seen += 1;
      if (seen >= targetLetters) break;
    }
    return text.slice(0, end);
  }

  const api = {
    ENGLISH_FREQUENCIES, normalizeShift, caesarTransform, letterCount,
    chiSquareForPlaintext, frequencyAttack, prefixByLetters
  };
  root.ClassicalCipher = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
