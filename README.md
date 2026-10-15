# Cybersecurity Statistics

**MSc Cybersecurity | Statistics coursework**

This repository contains individual interactive homework assignments. Homework 1 uses a small elliptic curve to explain scalar multiplication and explore statistical properties of the resulting points. The implementation is deliberately educational rather than suitable for real cryptography.

## Folder structure

```text
cybersecurity-statistics/
├── index.html               # Landing page for assignments
├── homework1.html           # Homework 1: experiment and visualizations
├── css/
│   └── style.css            # All site styling
├── js/
│   ├── ecc.js               # Point addition, modular inverse, scalar multiplication
│   └── homework1.js         # Page controls, SVG animation, statistical charts
├── HOMEWORK1_REPORT.md      # Written analysis, results and interpretation
├── tests/
│   └── ecc.test.js          # Optional mathematical correctness checks
└── README.md
```

## How to open the assignment in VS Code

1. Download/extract the project folder.
2. Open the **`cybersecurity-statistics`** folder in VS Code (File → Open Folder).
3. Open `homework1.html` in a browser. No installation is needed; the webpage also works offline.
4. Change k, choose a valid base point, run the animation, and compare the statistical outputs.
5. See `HOMEWORK1_REPORT.md` for the methodology, results, and discussion.

**Do not** rename or move `css/style.css`, `js/ecc.js`, or `js/homework1.js` without updating their paths in the HTML.

## What was implemented

- Curve: `y² = x³ + 7 (mod 17)`; default `G = (1,5)` and `k = 6`.
- Elliptic-curve point addition and doubling, modular inverse, point at infinity.
- Repeated scalar multiplication, and binary double-and-add for larger k.
- SVG point map with adjustable animation and step trace.
- Statistical experiments for k=1...N: x/y frequency charts, five-bit coordinate frequencies, Pearson correlations, consecutive-point Hamming distances and alternative base points.
- A written analysis that interprets results and discusses the limits of statistics as evidence of cryptographic security.

## Check expected results

The starting example gives `6G = (5,8)`. `9G` is the identity and `10G = G` because the point G=(1,5) has order 9. The full curve group has 18 elements, including the identity.

With Node.js installed, mathematical checks can be run from the repository root:

```bash
node tests/ecc.test.js
```

This tests the expected point sequence, modular inversion, group orders, and agreement between the two multiplication methods.

## GitHub Pages submission

1. Create a **public** GitHub repository called `cybersecurity-statistics` in your existing GitHub account.
2. Upload the whole folder's **contents** (keeping the `css/`, `js/` and `tests/` subfolders), not an extra folder around them.
3. In repository **Settings → Pages**, select **Deploy from a branch**, branch `main`, root `/`, then save.
4. After publishing, the Homework 1 page should be:

   `https://yosephendale.github.io/cybersecurity-statistics/homework1.html`

This is a proposed URL; it will work only after the repository exists and GitHub Pages is enabled. Your personal website remains separate.

## Scope and safety

This is **not** an Ethereum key generator and does not implement secp256k1. Never enter real wallet keys or seed phrases into an educational demo. The toy point group is small enough to enumerate, so it offers no real cryptographic security.
