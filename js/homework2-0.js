(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ecc = window.ToyECC;
  const caesar = window.ClassicalCipher;
  let eccState = null;

  const DEFAULT_CORPUS = `Zebra puzzles quickly confuse a basic frequency model. Quiet foxes jump over lazy dogs, while uncommon words distort the distribution. A short passage may not match standard English letter frequencies, even if it is valid English.

Statistical analysis helps us understand patterns in data, but the meaning of a pattern depends on how the data was produced. In cryptography, frequency counts can reveal weaknesses in simple ciphers, while careful experiments help distinguish evidence from assumption. A useful method begins with a clear question, records the procedure, and compares the observed result with a reasonable expectation.

In ordinary English, some letters appear much more often than others. The letter E is common, as are T, A, O, I, and N. Letters such as Q, X, and Z appear less often. A Caesar cipher shifts every letter by the same number of positions, so it changes the labels of the letters but preserves their frequency counts. This makes the cipher vulnerable when an attacker has enough ciphertext and knows the language of the original message.

The attack can test every possible shift and score each candidate plaintext. One simple score uses the chi-square statistic to compare observed letter counts with expected English frequencies. The candidate with the smallest score is selected as the likely decryption. For a short sentence, the letter counts may be too irregular for the best score to identify the correct key. Longer passages usually provide more evidence, although unusual vocabulary, names, quotations, and non-English text can still mislead the method.

Public-key cryptography uses a different mathematical structure. On an elliptic curve, a private scalar is multiplied by a public base point to produce a public point. Multiplication is efficient, but recovering the scalar from the point is designed to be computationally difficult when the private key is chosen from the full permitted range. If a demonstration restricts the key to a few hundred candidates, however, an attacker can simply calculate each candidate public point and compare it with the known public point.

These experiments show why the size and structure of a key space matter. A cipher with only twenty-six possible shifts can be searched almost instantly. A properly generated elliptic-curve private key has an enormous search space, so direct enumeration is not a practical attack. Still, using a large key space is not enough on its own: the scheme, implementation, randomness, and handling of secret material must also be sound. Statistical tests can help reveal simple patterns, but they do not prove that a cryptographic system is secure.`;

  function parseIntegerInput(id, min, max, label) {
    const raw = $(id).value.trim();

    if (raw === '') {
      throw new Error(label + ' is required.');
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(
        label + ' must be an integer from ' + min + ' to ' + max + '.'
      );
    }

    return value;
  }

  function secureRandomScalar() {
    if (
      !window.crypto ||
      typeof window.crypto.getRandomValues !== 'function'
    ) {
      throw new Error(
        'This browser does not expose a secure random-number generator. ' +
        'Open the page through VS Code Live Server or another modern browser.'
      );
    }

    while (true) {
      const bytes = new Uint8Array(32);
      window.crypto.getRandomValues(bytes);

      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');

      const candidate = BigInt('0x' + hex);

      if (candidate > 0n && candidate < ecc.N) {
        return candidate;
      }
    }
  }

  function shortHex(value) {
    const hex = value.toString(16).padStart(64, '0');
    return '0x' + hex.slice(0, 10) + '…' + hex.slice(-8);
  }

  function shortPoint(point) {
    if (point === null) return '∞';

    return '(x ' + shortHex(point.x) +
      ', y ' + shortHex(point.y) + ')';
  }

  function addCell(row, value, className) {
    const cell = document.createElement('td');
    cell.textContent = value;

    if (className) {
      cell.className = className;
    }

    row.appendChild(cell);
    return cell;
  }

  function renderPublicKey(publicKey) {
    const hex = ecc.pointHex(publicKey);

    $('eccPublicKey').textContent =
      'x = ' + hex.x + '\ny = ' + hex.y;
  }

  // --------------------------------------------------
  // Elliptic-curve encryption and decryption
  // --------------------------------------------------

  function runEccEncryption() {
    try {
      const privateKey = parseIntegerInput(
        'eccPrivateKey', 1, 1000, 'Private scalar'
      );

      const message = $('eccMessage').value;

      ecc.validatePrintableAscii(message);

      const publicKey = ecc.publicKeyFromPrivate(
        BigInt(privateKey)
      );

      const ciphertext = ecc.encryptText(
        message,
        publicKey,
        secureRandomScalar
      );

      const decrypted = ecc.decryptText(
        ciphertext,
        BigInt(privateKey)
      );

      eccState = {
        privateKey,
        publicKey,
        ciphertext,
        message
      };

      renderPublicKey(publicKey);

      $('eccDecrypted').textContent = decrypted;
      $('eccPairCount').textContent = String(ciphertext.length);

      $('eccCipherRows').replaceChildren();

      const shown = ciphertext.slice(0, 4);

      shown.forEach((item, index) => {
        const row = document.createElement('tr');
        const character = message[index];

        addCell(
          row,
          character === ' ' ? 'space' : character
        );

        addCell(row, String(message.charCodeAt(index)));
        addCell(row, shortPoint(item.c1));
        addCell(row, shortPoint(item.c2));

        $('eccCipherRows').appendChild(row);
      });

      if (ciphertext.length > shown.length) {
        const row = document.createElement('tr');

        const cell = addCell(
          row,
          '… ' + (ciphertext.length - shown.length) +
          ' additional point pairs not shown'
        );

        cell.colSpan = 4;
        $('eccCipherRows').appendChild(row);
      }

      $('eccStatus').textContent =
        'Encryption and decryption completed. ' +
        'The decrypted message matches the input: ' +
        String(decrypted === message) + '.';

      $('eccAttackResult').textContent =
        'The public point is ready for the restricted-key attack. ' +
        'The attack checks candidate points dG; it does not use ' +
        'the private scalar as its search input.';

    } catch (error) {
      $('eccStatus').textContent = error.message;
    }
  }

  function runEccAttack() {
    try {
      const selectedPrivateKey = parseIntegerInput(
        'eccPrivateKey', 1, 1000, 'Private scalar'
      );

      const currentMessage = $('eccMessage').value;

      const hasCurrentCiphertext = Boolean(
        eccState &&
        eccState.privateKey === selectedPrivateKey &&
        eccState.message === currentMessage &&
        eccState.ciphertext
      );

      const publicKey = hasCurrentCiphertext
        ? eccState.publicKey
        : ecc.publicKeyFromPrivate(BigInt(selectedPrivateKey));

      const result = ecc.bruteForcePrivateKey(publicKey, 1000);

      if (result.privateKey === null) {
        $('eccAttackResult').textContent =
          'No matching private scalar was found in the candidate range 1–1,000.';
        return;
      }

      let message =
        'Attack successful: the public point matched d = ' +
        result.privateKey + ' after ' + result.checks +
        ' candidate check(s).';

      if (hasCurrentCiphertext) {
        const recovered = ecc.decryptText(
          eccState.ciphertext,
          BigInt(result.privateKey)
        );

        message += '\nRecovered plaintext: ' + recovered;

      } else {
        message +=
          '\nNo ciphertext for the current message is saved. ' +
          'Click “Encrypt and decrypt” first, then run the attack again.';
      }

      $('eccAttackResult').textContent = message;

    } catch (error) {
      $('eccAttackResult').textContent = error.message;
    }
  }

  function invalidateOldEccCiphertext() {
    if (!eccState) return;

    if (
      eccState.message === $('eccMessage').value &&
      eccState.privateKey === Number($('eccPrivateKey').value)
    ) {
      return;
    }

    eccState = null;

    $('eccDecrypted').textContent = '—';
    $('eccPairCount').textContent = '—';
    $('eccCipherRows').replaceChildren();

    const row = document.createElement('tr');

    const cell = addCell(
      row,
      'Enter your message and click “Encrypt and decrypt” to create new ciphertext.'
    );

    cell.colSpan = 4;
    $('eccCipherRows').appendChild(row);

    $('eccStatus').textContent =
      'The message or private scalar changed. ' +
      'Encrypt and decrypt again to update the result.';

    $('eccAttackResult').textContent =
      'The previous ciphertext was cleared because it belongs ' +
      'to a different message or key.';
  }

  // --------------------------------------------------
  // Caesar cipher
  // --------------------------------------------------

  function runCaesarEncrypt() {
    try {
      const shift = parseIntegerInput(
        'caesarShift', 0, 25, 'Caesar shift'
      );

      const message = $('caesarMessage').value;

      $('caesarCiphertext').value =
        caesar.caesarTransform(message, shift);

      // Clear any previous decrypted result.
      $('caesarPlaintext').value = '';

      $('caesarStatus').textContent =
        'Message encrypted with shift ' + shift +
        '. Now click “Decrypt” to recover the message.';

    } catch (error) {
      $('caesarStatus').textContent = error.message;
    }
  }

  function runCaesarDecrypt() {
    try {
      const shift = parseIntegerInput(
        'caesarShift', 0, 25, 'Caesar shift'
      );

      const ciphertext = $('caesarCiphertext').value;

      if (ciphertext.trim() === '') {
        $('caesarPlaintext').value = '';

        $('caesarStatus').textContent =
          'There is no ciphertext to decrypt. Enter your message, ' +
          'click “Encrypt”, and then click “Decrypt”.';

        return;
      }

      $('caesarPlaintext').value =
        caesar.caesarTransform(ciphertext, -shift);

      $('caesarStatus').textContent =
        'Decryption completed with shift ' + shift + '.';

    } catch (error) {
      $('caesarStatus').textContent = error.message;
    }
  }

  // Clear old results when the original message or shift changes.
  function invalidateCaesarOutput() {
    $('caesarCiphertext').value = '';
    $('caesarPlaintext').value = '';

    $('caesarStatus').textContent =
      'The message or shift changed. Click “Encrypt” first, ' +
      'then click “Decrypt” to test the new message.';
  }

  // --------------------------------------------------
  // Statistical cryptanalysis of the Caesar cipher
  // --------------------------------------------------

  function encryptCorpus() {
    try {
      const shift = parseIntegerInput(
        'frequencyShift', 0, 25, 'Known experiment shift'
      );

      $('frequencyCiphertext').value =
        caesar.caesarTransform(
          $('frequencyCorpus').value,
          shift
        );

      $('frequencyAttackResult').textContent =
        'Corpus encrypted using shift ' + shift +
        '. The attack below does not use this key; it estimates ' +
        'the shift from the ciphertext letter frequencies.';

      $('frequencyRecoveredText').textContent = '';
      $('frequencyLengthRows').replaceChildren();

      const row = document.createElement('tr');

      const cell = addCell(
        row,
        'Choose “Test different lengths” to evaluate sample sizes.'
      );

      cell.colSpan = 4;
      $('frequencyLengthRows').appendChild(row);

    } catch (error) {
      $('frequencyAttackResult').textContent = error.message;
    }
  }

  function runFrequencyAttack() {
    const ciphertext = $('frequencyCiphertext').value;
    const result = caesar.frequencyAttack(ciphertext);

    if (!result) {
      $('frequencyAttackResult').textContent =
        'The ciphertext contains no A–Z letters to analyse.';

      $('frequencyRecoveredText').textContent = '';
      return;
    }

    let knownShift = null;

    try {
      knownShift = parseIntegerInput(
        'frequencyShift', 0, 25, 'Known experiment shift'
      );
    } catch (_) {
      // The attack itself does not require the known shift.
    }

    const matchText = knownShift === null
      ? ''
      : (
          result.key === knownShift
            ? ' The estimated key matches the experiment key.'
            : ' The estimate does not match the experiment key for this sample.'
        );

    $('frequencyAttackResult').textContent =
      'Estimated decryption shift: ' + result.key +
      '. Chi-square score: ' + result.score.toFixed(2) + '.' +
      matchText +
      ' The expected key is used only to evaluate the experiment, ' +
      'not to select the estimate.';

    $('frequencyRecoveredText').textContent =
      'Candidate plaintext:\n' +
      result.plaintext.slice(0, 1100) +
      (result.plaintext.length > 1100
        ? '\n… (display shortened)'
        : '');
  }

  function runLengthExperiment() {
    const ciphertext = $('frequencyCiphertext').value;
    const totalLetters = caesar.letterCount(ciphertext);

    if (totalLetters === 0) {
      $('frequencyAttackResult').textContent =
        'The ciphertext contains no A–Z letters to analyse.';
      return;
    }

    let expectedShift = null;

    try {
      expectedShift = parseIntegerInput(
        'frequencyShift', 0, 25, 'Known experiment shift'
      );
    } catch (_) {
      // The expected shift is optional for this comparison.
    }

    const requestedSizes = [
      20, 40, 80, 120, 200, 400, 800, 1200, totalLetters
    ];

    const sizes = [
      ...new Set(
        requestedSizes
          .filter((size) => size <= totalLetters)
          .concat([totalLetters])
      )
    ].sort((a, b) => a - b);

    const tbody = $('frequencyLengthRows');
    tbody.replaceChildren();

    sizes.forEach((size) => {
      const sample = caesar.prefixByLetters(ciphertext, size);
      const observedLetters = caesar.letterCount(sample);
      const result = caesar.frequencyAttack(sample);

      const row = document.createElement('tr');

      addCell(row, String(observedLetters));
      addCell(row, result ? String(result.key) : '—');

      addCell(
        row,
        expectedShift === null
          ? 'Not checked'
          : (
              result && result.key === expectedShift
                ? 'Yes'
                : 'No'
            )
      );

      addCell(
        row,
        result ? result.score.toFixed(2) : '—'
      );

      tbody.appendChild(row);
    });

    $('frequencyAttackResult').textContent =
      'Tested ' + sizes.length +
      ' ciphertext lengths. Short samples can produce a misleading ' +
      'frequency profile; larger samples usually give a more stable ' +
      'estimate, but the result still depends on the language and text content.';

    $('frequencyRecoveredText').textContent = '';
  }

  function showAllCaesarCandidates() {
    const ciphertext = $('frequencyCiphertext').value;

    if (caesar.letterCount(ciphertext) === 0) {
      $('frequencyAttackResult').textContent =
        'The ciphertext contains no A–Z letters to analyse.';
      return;
    }

    const rows = [];

    for (let key = 0; key < 26; key += 1) {
      const plaintext = caesar.caesarTransform(ciphertext, -key);

      rows.push({
        key,
        plaintext,
        score: caesar.chiSquareForPlaintext(plaintext)
      });
    }

    rows.sort((a, b) => a.score - b.score);

    const tbody = $('frequencyCandidateRows');
    tbody.replaceChildren();

    rows.forEach((candidate) => {
      const row = document.createElement('tr');

      addCell(row, String(candidate.key));

      addCell(
        row,
        candidate.plaintext.slice(0, 100).replace(/\s+/g, ' ') +
        (candidate.plaintext.length > 100 ? '…' : '')
      );

      addCell(row, candidate.score.toFixed(2));
      tbody.appendChild(row);
    });

    $('candidateDetails').open = true;
  }

  // --------------------------------------------------
  // Page setup
  // --------------------------------------------------

  function initialize() {
    $('frequencyCorpus').value = DEFAULT_CORPUS;

    $('eccEncryptBtn').addEventListener(
      'click', runEccEncryption
    );

    $('eccAttackBtn').addEventListener(
      'click', runEccAttack
    );

    $('eccMessage').addEventListener(
      'input', invalidateOldEccCiphertext
    );

    $('eccPrivateKey').addEventListener(
      'input', invalidateOldEccCiphertext
    );

    $('caesarEncryptBtn').addEventListener(
      'click', runCaesarEncrypt
    );

    $('caesarDecryptBtn').addEventListener(
      'click', runCaesarDecrypt
    );

    $('caesarMessage').addEventListener(
      'input', invalidateCaesarOutput
    );

    $('caesarShift').addEventListener(
      'input', invalidateCaesarOutput
    );

    $('frequencyEncryptBtn').addEventListener(
      'click', encryptCorpus
    );

    $('frequencyAttackBtn').addEventListener(
      'click', runFrequencyAttack
    );

    $('frequencyLengthsBtn').addEventListener(
      'click', runLengthExperiment
    );

    $('frequencyCandidatesBtn').addEventListener(
      'click', showAllCaesarCandidates
    );

    // Set up the default examples when the page loads.
    runCaesarEncrypt();
    runCaesarDecrypt();
    encryptCorpus();
    runFrequencyAttack();
    runLengthExperiment();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();