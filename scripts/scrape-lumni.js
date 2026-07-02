import fetch from "node-fetch";
import cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("Usage: node scripts/scrape-lumni.js <url>");
  process.exit(1);
}
const startUrl = argv[0];

async function scrape(url) {
  console.log(`Fetching ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "BrevDoc-scraper/1.0 (+https://example.com)" },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];

  $("a").each((i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (!href) return;
    let full = href;
    try {
      if (href.startsWith("/")) full = new URL(href, url).href;
      else if (!href.startsWith("http")) full = new URL(href, url).href;
    } catch (e) {
      // ignore malformed
    }
    const lower = (full || "").toLowerCase();
    if (lower.endsWith(".pdf") || lower.includes("lumni")) {
      results.push({
        title: text || path.basename(full),
        url: full,
        type: lower.endsWith(".pdf") ? "pdf" : "link",
      });
    }
  });

  // Remove duplicates by url
  const unique = Array.from(new Map(results.map((r) => [r.url, r])).values());
  return unique;
}

(async () => {
  try {
    const items = await scrape(startUrl);
    const outDir = path.resolve("./data");
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `lumni-resources-${Date.now()}.json`);
    await fs.writeFile(outPath, JSON.stringify(items, null, 2), "utf8");
    console.log(`Wrote ${items.length} resources to ${outPath}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
