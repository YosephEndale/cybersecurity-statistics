# Homework 1 — Elliptic-Curve Scalar Multiplication: A Statistical Exploration

**Course:** Statistics  
**Programme:** MSc Cybersecurity  
**Focus:** Toy private-key to public-key transformation and statistical properties

## 1. Aim and context

In this assignment, I wanted to understand the calculation behind the expression **Q = kG**, rather than treating public-key generation as a black box. In Ethereum, a private key is a scalar and the associated public key is obtained by multiplying a fixed elliptic-curve point by that scalar. This operation is efficient in one direction, while reversing it on an appropriately chosen large curve is believed to be computationally infeasible.

I used the small curve from the assignment so that I could inspect every calculation and plot the available points. I then examined whether the resulting coordinates looked evenly distributed, whether their binary digits were balanced, and whether consecutive scalar values showed any simple statistical relationship. The aim is descriptive and educational: **this toy example is not a security test of Ethereum's secp256k1 curve**.

## 2. Mathematical model

The curve is defined over the finite field with 17 elements:

\[
E: y^2 \equiv x^3 + 7 \pmod{17}.
\]

The default base point is **G = (1, 5)**, and the starting private scalar is **k = 6**. I checked that G belongs to the curve:

\[
5^2 \bmod 17 = 25 \bmod 17 = 8
\]

and

\[
1^3 + 7 = 8 \pmod{17}.
\]

Scalar multiplication means adding the same curve point to itself repeatedly. It does **not** mean multiplying the x-coordinate and y-coordinate by k.

For distinct finite points \(A=(x_1,y_1)\) and \(B=(x_2,y_2)\), I used:

\[
\lambda=(y_2-y_1)(x_2-x_1)^{-1}\pmod{17}.
\]

For a doubling operation \(A=B\), the slope becomes:

\[
\lambda=(3x_1^2)(2y_1)^{-1}\pmod{17}.
\]

Once the slope is known, the new point is:

\[
x_3=\lambda^2-x_1-x_2\pmod{17},
\qquad
 y_3=\lambda(x_1-x_3)-y_1\pmod{17}.
\]

The inverse notation matters here: division modulo 17 is **multiplication by the modular inverse**. The code calculates inverses using the extended Euclidean algorithm. It also handles the point at infinity, written \(\mathcal{O}\), which is the identity of the elliptic-curve group. If two points are inverses, their sum is \(\mathcal{O}\).

### One worked example: doubling G

Starting from \(G=(1,5)\):

\[
\lambda = 3(1)^2 \cdot 10^{-1} \pmod{17}.
\]

Because \(10\times12\equiv1\pmod{17}\), the inverse of 10 is 12. Therefore:

\[
\lambda =3\times12\pmod{17}=2.
\]

The coordinates of \(2G\) are then:

\[
x_3=2^2-1-1=2,
\qquad
 y_3=2(1-2)-5=-7\equiv10\pmod{17}.
\]

So **2G = (2,10)**.

## 3. Implementation and result

I wrote the experiment in plain HTML, CSS, and JavaScript. The files have separate responsibilities:

- `js/ecc.js` handles elliptic-curve arithmetic and scalar multiplication.
- `js/homework1.js` controls the experiment, the SVG visualization, and the statistics.
- `homework1.html` defines the content and interactive controls.
- `css/style.css` contains the layout and presentation.

The main operation can be calculated using repeated point addition. I also implemented the binary **double-and-add** method, which requires on the order of \(\log_2 k\) group operations and is more practical for larger scalar values. I cross-checked the two implementations against the same expected points.

| Scalar | Calculated point |
|---:|:---|
| 1G | (1, 5) |
| 2G | (2, 10) |
| 3G | (5, 9) |
| 4G | (12, 1) |
| 5G | (12, 16) |
| **6G** | **(5, 8)** |
| 7G | (2, 7) |
| 8G | (1, 12) |
| 9G | \(\mathcal{O}\) |
| 10G | (1, 5) |

For the requested starting values, my result is:

\[
\boxed{Q=6G=(5,8).}
\]

The point map in the webpage is **discrete**. It displays coordinates that satisfy the curve equation over the finite field. The dashed connections represent the sequence of results, not the geometric line-and-tangent rule for a real-valued curve.

## 4. Statistical procedure

For the first experiment I kept **G = (1,5)** and generated outputs for **k = 1, 2, ..., 72**. I chose 72 because it is a multiple of the base point's order, allowing complete cycles to be observed without a partially sampled final cycle.

For each scalar, I recorded its resulting point. For finite points, I calculated frequencies of x- and y-coordinates and converted each coordinate into a five-bit binary representation. Five bits are enough to represent the possible values 0 to 16.

For two successive **finite** points, I calculated the Hamming distance of the concatenated ten-bit representations (`xxxxx|yyyyy`). I also calculated Pearson's correlation coefficient between k and the x- and y-coordinates separately. The identity point has no finite coordinates, so I counted it but excluded it from coordinate, bit, correlation, and Hamming-distance calculations. A transition across the identity was excluded rather than inventing a binary encoding for it.

All statistics here describe a **deterministic sequence**. These observations are not independent random samples; that limitation is crucial to the interpretation.

## 5. Results with G = (1,5)

| Statistic | Observed value |
|:---|---:|
| Scalars examined | 72 |
| Finite point observations | 64 |
| Identity-point observations | 8 |
| Different finite points observed | 8 |
| Distinct x-coordinates | 4 |
| Distinct y-coordinates | 8 |
| Zero bits across finite x/y encodings | 432 (67.5%) |
| One bits across finite x/y encodings | 208 (32.5%) |
| Valid consecutive finite-to-finite comparisons | 56 |
| Mean Hamming distance (out of 10) | 4.5714 |
| Pearson r between k and x | 0.0000 |
| Pearson r between k and y | 0.0329 |

**X-coordinate frequencies:** x = 1, 2, 5, and 12 each occurred 16 times. All other integers from 0 through 16 occurred zero times.

**Y-coordinate frequencies:** y = 1, 5, 7, 8, 9, 10, 12, and 16 each occurred eight times. Other values did not occur.

These results are not surprising once the group structure is considered. The curve contains **17 finite points plus the identity**, making 18 points in total. However, **G = (1,5) has order 9**. Its multiples visit eight different finite points and the identity before starting over. Therefore, 72 consecutive values are simply **eight repetitions of a nine-point cycle**.

## 6. A second base point: G = (6,6)

I also compared the initial base point with **G = (6,6)**, which is another valid point on the same curve. This point has **order 18**, so it generates the entire toy curve group. The webpage allows the base point to be changed from the dropdown menu.

For the same 72 consecutive scalars, the comparison is:

| Measurement | G = (1,5), order 9 | G = (6,6), order 18 |
|:---|---:|---:|
| Finite outputs | 64 | 68 |
| Identity outputs | 8 | 4 |
| Distinct finite points | 8 | 17 |
| Zeros in five-bit coordinate encodings | 432 / 640 (67.5%) | 420 / 680 (61.8%) |
| Mean 10-bit Hamming distance | 4.5714 | 4.6875 |

Changing G increases the number of reachable finite points in this example. It does not remove the deterministic structure or make the system secure. Even the order-18 base point repeats after only 18 scalar values.

## 7. Interpretation of the statistics

### Coordinate distributions and uniformity

The x-values are not uniformly distributed over all integers 0 to 16, because the curve equation restricts which coordinate pairs are valid. Moreover, G = (1,5) generates only a subgroup rather than the whole group. There is a useful distinction between **uniform selection among subgroup elements** and **uniform distribution of their coordinates**. The points of a subgroup can be visited equally often while their x-coordinates still repeat.

### Bit frequencies

The experiment produced 67.5% zeros in its ten-bit point encodings for the initial base point. One reason is that small values such as 1 or 2 become `00001` and `00010`, which contain several leading zeros. The imbalance is a property of the small chosen set and its representation. It would be inappropriate to generalize from this result to the quality of secp256k1 public keys.

### Correlation

Pearson's r was zero between k and x in the initial 72-value experiment. This only means that there was **no linear correlation measured in that sample**. It does not mean k and Q are statistically or mathematically independent. In fact, their relationship is exact:

\[
(k+1)G = kG + G.
\]

Correlation is useful as a descriptive measure, but cannot replace analysis of the underlying algebra.

### Hamming distance and avalanche-like behaviour

Consecutive ten-bit public-point encodings differed by about 4.57 bits on average. This is close to half of ten, but the comparison is not an avalanche test in the normal sense. Hash-function avalanche experiments generally **flip individual input bits** and examine changes across an output of fixed length. Here I compared consecutive integers k and k+1, which do not always differ by one input bit, and elliptic-curve scalar multiplication is not a cryptographic hash function.

### What the experiment cannot demonstrate

None of these measurements establishes the hardness of the **Elliptic Curve Discrete Logarithm Problem (ECDLP)**. For this toy curve, it is easy to try every possible k and recover a scalar. Real Ethereum uses the much larger secp256k1 parameters. Statistical patterns alone cannot establish one-wayness, discrete-logarithm hardness, or digital-signature security.

## 8. Conclusion

The calculation gave the expected result, **Q = (5,8)**, for k = 6 and G = (1,5). Working through the operations made it clear that scalar multiplication relies on modular inverses, point addition, and a group identity—not ordinary coordinate multiplication.

The statistical part was equally informative. At first glance, the coordinate graphs seem uneven and the Pearson correlations seem small. The repeated nine-point cycle explains both observations more directly than a generic randomness argument. The main lesson I take from this experiment is that **cryptographic data should be analyzed together with the mathematical structure that generates it**. A descriptive statistic is useful, but interpreting it without the group structure can be misleading.

---

**Reproducibility:** Open `homework1.html`; select G=(1,5), N=72, k=6, then inspect the point trace and statistical charts. Change G to (6,6) for the comparison in Section 6. All calculations run locally in the browser and require no wallet or internet connection.

**Safety:** This is a deliberately insecure educational curve. Never use the code to generate genuine cryptocurrency keys or signatures.
