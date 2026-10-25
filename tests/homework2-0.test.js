'use strict';
const assert = require('node:assert/strict');
const ecc = require('../js/secp256k1-toy.js');
const caesar = require('../js/classical-cipher.js');

assert.equal(ecc.mod(ecc.G.y * ecc.G.y - (ecc.G.x * ecc.G.x * ecc.G.x + 7n)), 0n, 'generator must lie on secp256k1');
assert.equal(ecc.pointEquals(ecc.scalarMultiply(1n), ecc.G), true, '1G must equal G');
assert.equal(ecc.scalarMultiply(0n), null, '0G must be the point at infinity');
assert.equal(ecc.scalarMultiply(ecc.N), null, 'nG must be the point at infinity');

const privateKey = 37n;
const publicKey = ecc.publicKeyFromPrivate(privateKey);
assert.deepEqual(ecc.bruteForcePrivateKey(publicKey, 1000), { privateKey: 37, checks: 37 }, 'restricted private key should be recoverable');
let nextEphemeral = 101n;
const encrypted = ecc.encryptText('Hello, world!', publicKey, () => {
  const current = nextEphemeral;
  nextEphemeral += 2n;
  return current;
});
assert.equal(ecc.decryptText(encrypted, privateKey), 'Hello, world!', 'ECC demonstration should round-trip printable ASCII');
assert.equal(encrypted.length, 'Hello, world!'.length, 'one ciphertext point pair should be produced per character');

assert.equal(caesar.caesarTransform('Hello, world!', 7), 'Olssv, dvysk!', 'Caesar encryption should shift letters and preserve punctuation');
assert.equal(caesar.caesarTransform('Olssv, dvysk!', -7), 'Hello, world!', 'Caesar decryption should restore the message');

const englishSample = (`Statistical analysis helps us understand patterns in data. The letter E is common in English, and T, A, O, I and N also appear frequently. A Caesar cipher shifts letters but preserves the frequency profile under different letter labels. A longer sample gives the attack more evidence, while short texts and unusual vocabulary can mislead the frequency score. `).repeat(5);
const encryptedSample = caesar.caesarTransform(englishSample, 7);
const attack = caesar.frequencyAttack(encryptedSample);
assert.equal(attack.key, 7, 'frequency attack should recover the shift from a sufficiently long English sample');
assert.equal(attack.plaintext, englishSample, 'frequency attack plaintext should match the known sample');

console.log('Homework 2.0 tests passed.');
