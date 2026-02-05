function hlc3(k) {
  return (k.high + k.low + k.close) / 3;
}

function gaussian(x, h) {
  return Math.exp(-(x * x) / (2 * h * h));
}

function nadarayaWatsonLux(values, h = 8, lookback = 60) {
  const result = [];

  for (let i = 0; i < values.length; i++) {
    let num = 0, den = 0;
    const start = Math.max(0, i - lookback);

    for (let j = start; j <= i; j++) {
      const w = gaussian(i - j, h);
      num += values[j] * w;
      den += w;
    }

    result.push(num / den);
  }

  return result;
}

function envelopeLux(nw, values, lookback = 60, mult = 2) {
  const upper = [], lower = [];

  for (let i = 0; i < nw.length; i++) {
    const start = Math.max(0, i - lookback);
    const slice = values.slice(start, i + 1);
    const mean = nw[i];

    const variance =
      slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length;

    const std = Math.sqrt(variance);

    upper.push(mean + std * mult);
    lower.push(mean - std * mult);
  }

  return { upper, lower };
}

module.exports = { hlc3, nadarayaWatsonLux, envelopeLux };
