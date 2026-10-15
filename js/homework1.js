/*
 * Homework 1 interface and statistical analysis.
 * This file deliberately keeps UI code separate from elliptic-curve arithmetic.
 * It depends on js/ecc.js, loaded first in homework1.html.
 */
(() => {
  "use strict";

  const ecc = window.ToyECC;
  const $ = id => document.getElementById(id);
  const points = ecc.enumeratePoints();
  const pointLabel = p => ecc.formatPoint(p, true);
  const fullLabel = p => ecc.formatPoint(p);

  const state = {
    base: { ...ecc.DEFAULT_BASE },
    scalar: 6,
    order: 9,
    method: "repeated",
    steps: [],
    currentStep: -1,
    timer: null
  };

  // Populate the list of valid finite points, including points with small order.
  for (const point of points) {
    const option = document.createElement("option");
    option.value = `${point.x},${point.y}`;
    option.textContent = `${fullLabel(point)} · order ${ecc.pointOrder(point)}`;
    option.selected = point.x === 1 && point.y === 5;
    $("basePoint").append(option);
  }

  function selectedBase() {
    const [x, y] = $("basePoint").value.split(",").map(Number);
    return { x, y };
  }

  function selectedScalar() {
    const value = Number($("privateKey").value);
    if (!Number.isInteger(value) || value < 1 || value > 5000) {
      $("status").textContent = "Please enter a whole-number scalar from 1 to 5000.";
      return null;
    }
    return value;
  }

  function selectMethod(scalar) {
    const preference = $("algorithm").value;
    // Repeated addition gets very long for big scalars, so use the faster path.
    if (preference === "fast" || scalar > 64) return "fast";
    return "repeated";
  }

  function pause() {
    if (state.timer !== null) clearInterval(state.timer);
    state.timer = null;
    $("play").textContent = "▶ Animate";
  }

  function calculate() {
    pause();
    const scalar = selectedScalar();
    if (scalar === null) return;

    state.base = selectedBase();
    state.scalar = scalar;
    state.order = ecc.pointOrder(state.base);
    state.method = selectMethod(scalar);
    state.steps = state.method === "fast"
      ? ecc.fastSteps(scalar, state.base)
      : ecc.repeatedSteps(scalar, state.base);

    const result = ecc.multiply(scalar, state.base);
    const lastAccumulator = state.steps.at(-1).accumulator;
    if (!ecc.equals(result, lastAccumulator)) {
      throw new Error("The step-by-step and double-and-add results do not agree.");
    }

    state.currentStep = state.steps.length - 1;
    $("pointInfo").textContent =
      `Order of G: ${state.order}. Its subgroup contains ${state.order - 1} finite points and the identity.`;
    $("orderText").textContent = state.order;
    $("curveCount").textContent = points.length + 1;
    $("publicKey").textContent = fullLabel(result);
    $("outputDetail").textContent = `${scalar}G = ${fullLabel(result)}` +
      (result === null ? " · The identity is not an ordinary public key." : "");

    $("status").textContent = state.method === "fast"
      ? `Computed using double-and-add (${state.steps.length} displayed operations).`
      : `Computed by ${scalar} successive additions of G.`;

    showStep(state.currentStep);
    updateStatistics();
  }

  // Draw finite-field points as a discrete coordinate diagram, NOT a smooth curve.
  const SVG_NS = "http://www.w3.org/2000/svg";
  function svgElement(tag, attributes, parent, content) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (content !== undefined) node.textContent = content;
    parent.append(node);
    return node;
  }

  function drawPointMap(active, path) {
    const svg = $("pointPlot");
    svg.replaceChildren();
    const left = 52;
    const top = 35;
    const step = 27.2;
    const px = x => left + x * step;
    const py = y => top + (16 - y) * step;

    for (let value = 0; value < ecc.P; value += 1) {
      const major = value % 4 === 0;
      const stroke = major ? "#d0cdc1" : "#e5e1d8";
      svgElement("line", { x1: left, y1: py(value), x2: px(16), y2: py(value), stroke }, svg);
      svgElement("line", { x1: px(value), y1: py(0), x2: px(value), y2: py(16), stroke }, svg);
      if (major) {
        svgElement("text", { x: px(value), y: py(0) + 24, "text-anchor": "middle", fill: "#6a726e", "font-size": 12 }, svg, String(value));
        svgElement("text", { x: left - 17, y: py(value) + 4, "text-anchor": "middle", fill: "#6a726e", "font-size": 12 }, svg, String(value));
      }
    }
    svgElement("text", { x: px(16) + 20, y: py(0) + 24, fill: "#6a726e", "font-size": 12 }, svg, "x");
    svgElement("text", { x: left - 18, y: top - 14, fill: "#6a726e", "font-size": 12 }, svg, "y");

    const subgroup = new Set();
    let current = null;
    for (let i = 0; i < state.order; i += 1) {
      current = ecc.add(current, state.base);
      if (current !== null) subgroup.add(pointLabel(current));
    }

    for (const point of points) {
      const highlighted = subgroup.has(pointLabel(point));
      svgElement("circle", {
        cx: px(point.x), cy: py(point.y), r: highlighted ? 5.5 : 4,
        fill: highlighted ? "#34627b" : "#aab0a8", opacity: highlighted ? 0.88 : 0.7
      }, svg);
    }

    // Dashed lines indicate only the sequence of observations.
    // They DO NOT encode geometric point addition in a finite field.
    for (let i = 1; i < path.length; i += 1) {
      const before = path[i - 1];
      const after = path[i];
      if (before === null || after === null) continue;
      svgElement("line", {
        x1: px(before.x), y1: py(before.y), x2: px(after.x), y2: py(after.y),
        stroke: "#c84b32", "stroke-width": 2, "stroke-dasharray": "5 6", opacity: 0.58
      }, svg);
    }

    svgElement("circle", {
      cx: px(state.base.x), cy: py(state.base.y), r: 10,
      fill: "none", stroke: "#dd9c39", "stroke-width": 2
    }, svg);

    if (active !== null) {
      svgElement("circle", { cx: px(active.x), cy: py(active.y), r: 13, fill: "#c84b32", opacity: 0.16 }, svg);
      svgElement("circle", {
        cx: px(active.x), cy: py(active.y), r: 7,
        fill: "#c84b32", stroke: "#ffffff", "stroke-width": 2
      }, svg);
      svgElement("text", {
        x: px(active.x) + 11, y: py(active.y) - 12,
        fill: "#a23c25", "font-size": 14, "font-weight": 700
      }, svg, pointLabel(active));
    } else {
      svgElement("text", {
        x: 285, y: 494, "text-anchor": "middle", fill: "#a23c25", "font-size": 15
      }, svg, "Accumulator: ∞ (no finite coordinates)");
    }
  }

  function showStep(index) {
    const step = state.steps[index];
    if (!step) {
      drawPointMap(state.base, [state.base]);
      return;
    }

    // With binary multiplication, doubling the addend doesn't modify the answer.
    const path = state.method === "repeated"
      ? state.steps.slice(0, index + 1).map(entry => entry.accumulator)
      : state.steps.slice(0, index + 1)
          .filter(entry => entry.title.startsWith("Add "))
          .map(entry => entry.accumulator);
    drawPointMap(step.accumulator, path.slice(-20));

    const explanation = $("stepExplanation");
    explanation.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = step.title;
    const details = document.createElement("span");
    details.className = "mathline";
    details.textContent = step.explanation;
    explanation.append(title, document.createElement("br"), details);

    const timeline = $("timeline");
    timeline.replaceChildren();
    const start = Math.max(0, index - 50);
    const end = Math.min(state.steps.length, index + 8);
    for (let i = start; i < end; i += 1) {
      const entry = state.steps[i];
      const chip = document.createElement("span");
      chip.className = "chip" + (i === index ? " active" : "") + (entry.accumulator === null ? " infinity" : "");
      chip.textContent = `${entry.title} → ${pointLabel(entry.accumulator)}`;
      chip.title = entry.explanation;
      timeline.append(chip);
    }
    if (start > 0) {
      const note = document.createElement("span");
      note.className = "small";
      note.textContent = `Recent steps shown (total: ${state.steps.length}).`;
      timeline.prepend(note);
    }
    $("plotBadge").textContent = `Step ${index + 1} / ${state.steps.length}`;
  }

  function advance() {
    if (state.currentStep + 1 >= state.steps.length) {
      pause();
      $("status").textContent = "The animation has finished.";
      return;
    }
    state.currentStep += 1;
    showStep(state.currentStep);
    if (state.currentStep === state.steps.length - 1) {
      pause();
      $("status").textContent = "The animation has finished.";
    }
  }

  function toggleAnimation() {
    if (state.timer !== null) {
      pause();
      $("status").textContent = "Animation paused.";
      return;
    }
    if (state.currentStep >= state.steps.length - 1) {
      state.currentStep = -1;
      $("plotBadge").textContent = "Ready";
      drawPointMap(state.base, [state.base]);
      $("stepExplanation").textContent = "Starting from the base point G…";
    }

    $("play").textContent = "❚❚ Pause";
    advance();
    if (state.currentStep < state.steps.length - 1) {
      state.timer = window.setInterval(advance, Number($("speed").value));
      $("status").textContent = "Animation running. Use Pause or Next step to examine an operation.";
    }
  }

  // Statistic helpers are separate so the calculations are easy to inspect.
  const fiveBits = x => x.toString(2).padStart(5, "0");
  const encodePoint = point => (point.x << 5) | point.y;

  function hammingDistance(a, b) {
    let bits = a ^ b;
    let count = 0;
    while (bits !== 0) {
      count += bits & 1;
      bits >>= 1;
    }
    return count;
  }

  function pearsonCorrelation(xs, ys) {
    if (xs.length < 2) return null;
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let crossProduct = 0;
    let sumSquaresX = 0;
    let sumSquaresY = 0;

    for (let i = 0; i < n; i += 1) {
      const x = xs[i] - meanX;
      const y = ys[i] - meanY;
      crossProduct += x * y;
      sumSquaresX += x * x;
      sumSquaresY += y * y;
    }
    if (sumSquaresX === 0 || sumSquaresY === 0) return null;
    return crossProduct / Math.sqrt(sumSquaresX * sumSquaresY);
  }

  function renderBars(targetId, frequencies, alternate = false) {
    const container = $(targetId);
    container.replaceChildren();
    const maximum = Math.max(1, ...frequencies);
    frequencies.forEach((count, value) => {
      const unit = document.createElement("div");
      unit.className = "barUnit";
      unit.title = `Value ${value}: observed ${count} time(s)`;
      const countLabel = document.createElement("span");
      countLabel.className = "barTop";
      countLabel.textContent = count === 0 ? "" : count;
      const bar = document.createElement("div");
      bar.className = "bar" + (alternate ? " alt" : "");
      bar.style.height = count === 0 ? "0px" : `${Math.max(5, count / maximum * 140)}px`;
      const tick = document.createElement("span");
      tick.className = "barLabel";
      tick.textContent = value;
      unit.append(countLabel, bar, tick);
      container.append(unit);
    });
  }

  function updateStatistics() {
    const totalScalars = Number($("sampleSize").value);
    const xFrequency = Array(ecc.P).fill(0);
    const yFrequency = Array(ecc.P).fill(0);
    const hammingFrequency = Array(11).fill(0); // Distances 0–10.
    const finiteScalars = [];
    const observedX = [];
    const observedY = [];
    const transitions = [];
    const distinct = new Set();
    const rows = [];

    let runningPoint = null;
    let previousFinite = null;
    let identities = 0;
    let zeros = 0;
    let ones = 0;

    for (let k = 1; k <= totalScalars; k += 1) {
      runningPoint = ecc.add(runningPoint, state.base);
      rows.push({ k, point: runningPoint });
      if (runningPoint === null) {
        identities += 1;
        previousFinite = null; // Do not treat ∞ as a binary coordinate pair.
        continue;
      }

      xFrequency[runningPoint.x] += 1;
      yFrequency[runningPoint.y] += 1;
      finiteScalars.push(k);
      observedX.push(runningPoint.x);
      observedY.push(runningPoint.y);
      distinct.add(pointLabel(runningPoint));

      for (const bit of fiveBits(runningPoint.x) + fiveBits(runningPoint.y)) {
        if (bit === "0") zeros += 1;
        else ones += 1;
      }

      if (previousFinite !== null) {
        const distance = hammingDistance(encodePoint(previousFinite), encodePoint(runningPoint));
        transitions.push(distance);
        hammingFrequency[distance] += 1;
      }
      previousFinite = runningPoint;
    }

    const finite = totalScalars - identities;
    const meanDistance = transitions.length
      ? transitions.reduce((a, b) => a + b, 0) / transitions.length
      : null;
    const bitTotal = zeros + ones;
    const zeroPercent = bitTotal ? 100 * zeros / bitTotal : 0;
    const onePercent = bitTotal ? 100 * ones / bitTotal : 0;
    const correlationX = pearsonCorrelation(finiteScalars, observedX);
    const correlationY = pearsonCorrelation(finiteScalars, observedY);
    const correlationLabel = value => value === null ? "undefined" : value.toFixed(4);

    $("finiteCount").textContent = finite;
    $("uniqueCount").textContent = distinct.size;
    $("infinityCount").textContent = identities;
    $("meanHamming").textContent = meanDistance === null ? "n/a" : `${meanDistance.toFixed(2)} / 10`;

    renderBars("xBars", xFrequency);
    renderBars("yBars", yFrequency, true);
    renderBars("hammingBars", hammingFrequency, true);
    $("xCaption").textContent = `${finite} finite observations; ${xFrequency.filter(n => n > 0).length} different x-values.`;
    $("yCaption").textContent = `${finite} finite observations; ${yFrequency.filter(n => n > 0).length} different y-values.`;
    $("hammingCaption").textContent = `${transitions.length} consecutive finite-to-finite comparisons (identity transitions excluded).`;

    $("bit0").style.width = `${zeroPercent}%`;
    $("bit1").style.width = `${onePercent}%`;
    $("zeroLabel").textContent = `0 bits: ${zeros} (${zeroPercent.toFixed(1)}%)`;
    $("oneLabel").textContent = `1 bits: ${ones} (${onePercent.toFixed(1)}%)`;
    $("bitCaption").textContent = `${bitTotal} bits across ${finite} finite points. Five-bit encoding includes leading zeros.`;
    $("correlations").textContent =
      `r(k, x) = ${correlationLabel(correlationX)}\nr(k, y) = ${correlationLabel(correlationY)}`;

    $("sampleConclusion").textContent =
      `The chosen base point has order ${state.order}. For k = 1 to ${totalScalars}, ` +
      `${identities} outputs are the identity and ${distinct.size} distinct finite points appear. ` +
      `The outputs repeat every ${state.order} scalars. These are repeated, dependent ` +
      `observations, not ${totalScalars} independent public-key samples. ` +
      (state.order < points.length + 1
        ? "This base point generates a proper subgroup of the curve."
        : "This base point generates the whole curve group.");

    const body = $("dataRows");
    body.replaceChildren();
    for (const row of rows.slice(0, 24)) {
      const tr = document.createElement("tr");
      const data = [
        row.k,
        pointLabel(row.point),
        row.point === null ? "—" : row.point.x,
        row.point === null ? "—" : row.point.y,
        row.point === null ? "No affine bits" : `${fiveBits(row.point.x)} | ${fiveBits(row.point.y)}`
      ];
      for (const value of data) {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.append(td);
      }
      body.append(tr);
    }
  }

  $("calculate").addEventListener("click", calculate);
  $("play").addEventListener("click", toggleAnimation);
  $("step").addEventListener("click", () => {
    pause();
    if (state.currentStep >= state.steps.length - 1) state.currentStep = -1;
    advance();
  });
  $("reset").addEventListener("click", () => {
    pause();
    $("privateKey").value = "6";
    $("basePoint").value = "1,5";
    $("algorithm").value = "auto";
    $("sampleSize").value = "72";
    $("speed").value = "650";
    $("speedLabel").textContent = "650 ms / step";
    calculate();
  });
  $("basePoint").addEventListener("change", calculate);
  $("sampleSize").addEventListener("change", updateStatistics);
  $("algorithm").addEventListener("change", calculate);
  $("privateKey").addEventListener("keydown", event => {
    if (event.key === "Enter") calculate();
  });
  $("speed").addEventListener("input", () => {
    $("speedLabel").textContent = `${$("speed").value} ms / step`;
    if (state.timer !== null) {
      pause();
      toggleAnimation();
    }
  });
  calculate();
})();
