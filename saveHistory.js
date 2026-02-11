const fs = require("fs");
const path = require("path");

const templates = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seoTemplates.json"))
);

function slugify(s) {
  return s.toLowerCase().replace("usdt", "");
}

function buildUrls(symbol, tf) {
  const coin = slugify(symbol);

  return templates.map(t => {
    return {
      url: "/" + t.slug
        .replace("{coin}", coin)
        .replace("{tf}", tf),
      title: t.title
        .replace(/{coin}/g, coin.toUpperCase())
        .replace("{tf}", tf),
      desc: t.desc
        .replace(/{coin}/g, coin.toUpperCase())
        .replace("{tf}", tf),
    };
  });
}

function saveHistory(signal) {
  const file = path.join(__dirname, "history.json");

  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(file));
  } catch {}

  const urls = buildUrls(signal.symbol, signal.interval);

  history.unshift({
    ...signal,
    urls,
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

module.exports = { saveHistory };
