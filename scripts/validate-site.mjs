import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".agents", ".codex", ".vercel", "node_modules", "dist", "docs"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const htmlFiles = walk(root).filter((path) => extname(path) === ".html");
const vizSource = readFileSync(join(root, "js", "viz.js"), "utf8");
const artManifest = JSON.parse(readFileSync(join(root, "docs", "work-artwork.json"), "utf8"));
const artPaths = new Set(artManifest.items.flatMap(item => Object.values(item.themes).map(theme => theme.full)));
const artOccurrences = new Map(artManifest.items.map(item => [item.key, []]));
const escapeAttribute = value => value?.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const explainerKeys = new Set(["inventory", "verifier", "security", "weather", "publishing"]);
const blogKeys = new Set(["breadth", "loss", "timeline", "voices", "process", "experiment"]);
const blogArt = JSON.parse(readFileSync(join(root, "docs", "blog-artwork.json"), "utf8"));
const learningCovers = JSON.parse(readFileSync(join(root, "docs", "learnings-covers.json"), "utf8"));
const registry = vizSource.match(/const vizMap = \{([\s\S]*?)\};/);
const vizKeys = new Set(
  (registry?.[1] ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean),
);

function resolveLocal(url) {
  const clean = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  if (!clean.startsWith("/")) return null;
  if (clean === "/") return join(root, "index.html");
  const direct = join(root, clean.slice(1));
  if (existsSync(direct)) return direct;
  if (!extname(direct) && existsSync(`${direct}.html`)) return `${direct}.html`;
  return direct;
}

for (const path of htmlFiles) {
  const label = relative(root, path);
  const html = readFileSync(path, "utf8");

  if (!/^<!DOCTYPE html>/i.test(html)) errors.push(`${label}: missing doctype`);
  if (!/<html[^>]+lang="en"/i.test(html)) errors.push(`${label}: missing lang=en`);
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${label}: missing title`);
  if (!/<meta\s+name="description"/i.test(html)) errors.push(`${label}: missing meta description`);
  if (!/<link\s+rel="canonical"/i.test(html)) errors.push(`${label}: missing canonical URL`);
  if ((html.match(/<h1(?:\s|>)/gi) ?? []).length !== 1) errors.push(`${label}: expected exactly one h1`);
  if (!html.includes('href="/about.html"')) errors.push(`${label}: navigation is missing About`);
  if (/[ÃÂ�]|â€|ðŸ/.test(html)) errors.push(`${label}: possible mojibake remains`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  for (const id of new Set(ids)) {
    if (ids.filter((value) => value === id).length > 1) errors.push(`${label}: duplicate id ${id}`);
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = resolveLocal(match[1]);
    if (target && !existsSync(target)) errors.push(`${label}: missing local target ${match[1]}`);
  }

  for (const match of html.matchAll(/data-viz="([^"]+)"/g)) {
    if (!vizKeys.has(match[1])) errors.push(`${label}: unknown visualization ${match[1]}`);
  }
  for (const [, attributes, key, body] of html.matchAll(/<figure\b([^>]*data-blog-visual="([^"]+)"[^>]*)>([\s\S]*?)<\/figure>/g)) {
    if (!blogKeys.has(key)) errors.push(`${label}: unknown blog figure ${key}`);
    if (!html.includes('/js/blog-visuals.min.js')) errors.push(`${label}: missing blog figure script`);
    const heading = attributes.match(/aria-labelledby="([^"]+)"/)?.[1];
    if (!heading || !ids.includes(heading)) errors.push(`${label}: blog figure needs a linked heading`);
    if (!/<figcaption>[\s\S]+<\/figcaption>/.test(body)) errors.push(`${label}: blog figure needs a caption`);
    if (!/class="bv-controls[^>]+hidden/.test(body)) errors.push(`${label}: blog controls must be hidden before enhancement`);
    const choices = [...body.matchAll(/data-choice="([^"]+)"/g)].map(match => match[1]);
    const panels = [...body.matchAll(/data-panel="([^"]+)"/g)].map(match => match[1]);
    if (key !== 'loss' && (choices.join(',') !== panels.join(',') || !choices.length)) errors.push(`${label}: every blog choice needs a static explanation`);
    if (key !== 'loss' && (body.match(/aria-pressed="true"/g) ?? []).length !== 1) errors.push(`${label}: blog figure needs one initial selection`);
  }
  if (label.startsWith('blog/')) {
    if (/data-viz=|\/js\/viz.min.js/.test(html)) errors.push(`${label}: obsolete ambient blog visualization remains`);
    if ((html.match(/data-blog-visual=/g) ?? []).length !== 2) errors.push(`${label}: expected two article-specific explanations`);
    if (!/class="essay-art essay-opening"/.test(html) || !/data-blog-dark media="not all"/.test(html)) errors.push(`${label}: expected themed editorial opening with a light no-JS fallback`);
    if (!/<p class="article-lede">/.test(html)) errors.push(`${label}: expected a short article introduction`);
    if (!/class="essay-next" aria-label="More essays"/.test(html)) errors.push(`${label}: expected a route to the other essays`);
    if (label === 'blog/agi.html' && (!html.includes('bv-loss-history') || !html.includes('data-update-equation'))) errors.push(`${label}: missing calculated learning-step explanation`);
    if (label === 'blog/dostoevsky.html' && (html.match(/class="bv-book bv-motion"/g) ?? []).length !== 5) errors.push(`${label}: expected five original book emblems`);
    if (label === 'blog/ideas.html' && (html.match(/data-message=/g) ?? []).length !== 4) errors.push(`${label}: expected four explicitly constructed sample messages`);
  }
  for (const [, attributes, key, body] of html.matchAll(/<figure\b([^>]*data-explainer="([^"]+)"[^>]*)>([\s\S]*?)<\/figure>/g)) {
    if (!explainerKeys.has(key)) errors.push(`${label}: unknown explainer ${key}`);
    if (!html.includes('/js/explainers.min.js')) errors.push(`${label}: missing explainer script`);
    const heading = attributes.match(/aria-labelledby="([^"]+)"/)?.[1];
    if (!heading || !ids.includes(heading)) errors.push(`${label}: explainer needs a linked heading`);
    if (!/<figcaption>[\s\S]+<\/figcaption>/.test(body)) errors.push(`${label}: explainer needs an evidence caption`);
    if (!/data-lab-controls hidden/.test(body)) errors.push(`${label}: hide inactive controls until enhancement succeeds`);
  }
  if (/data-(result-chart|trace-explorer|trust-demo|horizon-demo|superposition-demo|sparsity-demo)/.test(html) && !html.includes('/js/research.min.js')) {
    errors.push(`${label}: missing research interaction script`);
  }
  if (label.startsWith("research/") && /data-viz=|\/js\/viz.min.js/.test(html)) {
    errors.push(`${label}: research figures should be reader-controlled, not ambient animation loops`);
  }
  for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      const target = resolveLocal(url);
      if (target && !existsSync(target)) errors.push(`${label}: missing responsive image ${url}`);
    }
  }
  for (const [, attributes, content] of html.matchAll(/<a\b([^>]*\bdata-art\s[^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = attributes.match(/href="([^"]+)"/)?.[1];
    if (!artPaths.has(href)) errors.push(`${label}: illustration missing from provenance manifest`);
    const illustration = artManifest.items.find(item => item.full === href);
    if (illustration) artOccurrences.get(illustration.key).push(label);
    if (artManifest.version === 2) {
      if (!attributes.includes('data-art-style="painting"')) errors.push(`${label}: painted artwork must bypass cutout blend modes`);
      if (content.match(/alt="([^"]+)"/)?.[1] !== escapeAttribute(illustration?.alt)) errors.push(`${label}: illustration alt does not match its painting`);
      if (attributes.match(/data-art-caption="([^"]+)"/)?.[1] !== escapeAttribute(illustration?.caption)) errors.push(`${label}: illustration caption does not match its painting`);
    }
    for (const theme of ["light", "dark"]) {
      const target = attributes.match(new RegExp(`data-art-${theme}="([^"]+)"`))?.[1];
      if (target !== illustration?.themes[theme]?.full) errors.push(`${label}: incorrect ${theme} illustration pair`);
      const tag = content.match(theme === "dark" ? /<source\b[^>]+>/ : /<img\b[^>]+>/)?.[0];
      const srcset = tag?.match(/srcset="([^"]+)"/)?.[1];
      const expected = illustration?.themes[theme]?.responsive.map(image => `${image.src} ${image.width}w`).join(", ");
      if (!expected || srcset !== expected) errors.push(`${label}: incorrect responsive ${theme} artwork`);
    }
    if (!/<picture>/.test(content) || !/data-art-dark-source media="not all"/.test(content)) {
      errors.push(`${label}: illustration needs a theme-aware picture and a light no-JS fallback`);
    }
    if (!/data-art-title="[^"]+"/.test(attributes) || !/data-art-caption="[^"]+"/.test(attributes)) {
      errors.push(`${label}: illustration needs a title and conceptual caption`);
    }
    if (!/<img[^>]+alt="[^"]+"/.test(content) || !/width="\d+" height="\d+"/.test(content)) {
      errors.push(`${label}: illustration needs alt text and reserved dimensions`);
    }
    if (!html.includes('/js/work-art.min.js')) errors.push(`${label}: missing illustration viewer script`);
  }
  if ((label.startsWith("research/") || label.startsWith("projects/") || label === "research.html" || label === "projects.html") && /data-sketch=|\/js\/sketches.min.js/.test(html)) {
    errors.push(`${label}: obsolete looping artwork remains`);
  }

  if (label === "research.html" || label === "projects.html") {
    if (!html.includes('<body>') || !html.includes('class="site-container"') || !html.includes('class="page-header"')) {
      errors.push(`${label}: work index must retain the shared site shell`);
    }
    if (/work-intro-sketch|work-sketch-link|collection-layout/.test(html)) {
      errors.push(`${label}: redundant banner, duplicate sketch link, or separate layout remains`);
    }
    if (!html.includes('collection-page') || !html.includes('/js/reading-index.min.js')) errors.push(`${label}: use the shared Blog composition and theme enhancement`);
    const entries = [...html.matchAll(/<a class="essay-entry"([^>]*)>([\s\S]*?)<\/a>/g)];
    const expectedCount = label === 'projects.html' ? 7 : 5;
    if (entries.length !== expectedCount) errors.push(`${label}: expected ${expectedCount} entries`);
    for (const [, attributes, entry] of entries) {
      const heading = attributes.match(/aria-labelledby="([^"]+)"/)?.[1];
      const description = attributes.match(/aria-describedby="([^"]+)"/)?.[1];
      if (!ids.includes(heading) || !ids.includes(description)) errors.push(`${label}: each entry needs its title and description`);
      if (/<a\s/.test(entry) || /data-art\s/.test(entry)) errors.push(`${label}: one article link only, no nested viewer controls`);
      if (!entry.includes('class="entry-meta"') || !entry.includes('class="essay-copy"') || !/<picture class="essay-thumb/.test(entry)) errors.push(`${label}: use Blog metadata, copy and thumbnail structure`);
    }
    for (const [, key, body] of html.matchAll(/<picture\b[^>]*data-work-thumbnail="([^"]+)"[^>]*>([\s\S]*?)<\/picture>/g)) {
      const item = artManifest.items.find(i => i.key === key);
      if (!item) { errors.push(`${label}: unknown thumbnail ${key}`); continue; }
      artOccurrences.get(key).push(label);
      if (!/alt=""/.test(body) || !/width="1200" height="1200"/.test(body) || !/data-index-dark media="not all"/.test(body)) errors.push(`${label}: thumbnail must be decorative, reserve dimensions and have a light fallback`);
      for (const theme of ['light', 'dark']) {
        const tag = body.match(theme === 'dark' ? /<source\b[^>]+>/ : /<img\b[^>]+>/)?.[0];
        const srcset = tag?.match(/srcset="([^"]+)"/)?.[1];
        const expected = item.themes[theme].responsive.map(i => `${i.src} ${i.width}w`).join(', ');
        if (srcset !== expected) errors.push(`${label}: wrong ${theme} thumbnail for ${key}`);
      }
    }
  }
  if (label === 'blog.html' || label === 'learnings.html') {
    if (!html.includes('collection-page')) errors.push(`${label}: missing shared collection composition`);
    if (!html.includes('/js/reading-index.min.js')) errors.push(`${label}: missing progressive enhancement`);
  }
  if (label === 'blog.html') {
    const entries = [...html.matchAll(/<a class="essay-entry"([^>]*)>([\s\S]*?)<\/a>/g)];
    if (entries.length !== 3) errors.push('Blog: expected all three current essays');
    for (const [, attributes, body] of entries) {
      const heading = attributes.match(/aria-labelledby="([^"]+)"/)?.[1];
      if (!heading || !ids.includes(heading)) errors.push('Blog: each entry needs a linked title');
      if (!/data-index-dark media="not all"/.test(body)) errors.push('Blog: thumbnail needs a light no-JS fallback');
      if (!/<img[^>]+alt=""[^>]+width="360" height="240"/.test(body)) errors.push('Blog: decorative thumbnail needs reserved dimensions');
      if (!/<time datetime="2025-05-0[12]">/.test(body)) errors.push('Blog: preserve original publication dates');
    }
  }
  if (label === 'learnings.html') {
    const notes = [...html.matchAll(/<details class="learning-item" id="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g)];
    if (notes.length !== 2) errors.push('Learnings: expected the two competition notes');
    if (/id="(?:rl-notes|policy-gradients|exploration|offline-rl)"/.test(html)) errors.push('Learnings: removed RL note section must not return');
    for (const [, id, body] of notes) {
      if (!body.includes(`href="#${id}"`) || !body.includes('note-preview')) errors.push(`Learnings ${id}: missing preview or direct link`);
    }
    for (const id of ['competitions', 'music', 'books']) {
      if (!ids.includes(id) || !html.includes(`href="#${id}"`)) errors.push(`Learnings: missing navigable section ${id}`);
    }
    if ((html.match(/class="shelf-item"/g) ?? []).length !== 10) errors.push('Learnings: expected all ten existing shelf items');
    if (/evaluation-notebook|data-notebook-film|data-evidence-lab|evidence-notebook-/.test(html)) errors.push('Learnings: the removed evaluation section and painting must not return');
    if (!html.includes('data-learning-arcade') || !html.includes('data-arcade-board')) errors.push('Learnings: expected the compact maze simulator');
    if (!html.includes('class="arcade-settings"') || /class="arcade-settings"[^>]*\bopen\b/.test(html)) errors.push('Learnings: keep the secondary simulator controls collapsed initially');
    for (const theme of ['light', 'dark']) {
      const asset = `/assets/learnings/pond-${theme}.webp`;
      if (!html.includes(asset) || !existsSync(resolveLocal(asset))) errors.push(`Learnings: missing ${theme} pond texture`);
    }
    if (!/data-arcade-controls[^>]+hidden/.test(html)) errors.push('Learnings: hide game controls until enhancement succeeds');
    if (!html.includes('js/learning-arcade.min.js') || !html.includes('arcade-fallback')) errors.push('Learnings: expected game module and no-JS explanation');
    if (/<img[^>]+src="https?:/.test(html)) errors.push('Learnings: use locally cached catalog covers');
    if (!html.includes('Those\n                details are withheld')) errors.push('Learnings: preserve the qualification on unverified competition claims');
  }
}

for (const item of artManifest.items) {
  if (artManifest.version === 2) {
    const expected = [item.page.split('/')[0] + '.html', item.page].sort().join(',');
    if (artOccurrences.get(item.key).sort().join(',') !== expected) errors.push(`Artwork ${item.key}: expected one index icon and one matching detail-page image`);
    if (!item.full.startsWith('/assets/work/monet-v2/')) errors.push(`Artwork ${item.key}: obsolete cutout path`);
  }
  for (const theme of ["light", "dark"]) {
    const variant = item.themes?.[theme];
    if (!variant?.prompt) { errors.push(`Artwork ${item.key}: missing ${theme} provenance`); continue; }
    // Editable source masters are local-only. Their digest preserves provenance;
    // all public variants must exist even in a clean checkout.
    if (!/^[a-f0-9]{64}$/.test(variant.originalSha256 ?? '')) errors.push(`Artwork ${item.key}: missing source-master digest`);
    for (const url of [variant.full, variant.thumbnail, ...variant.responsive.map(image => image.src)]) {
      if (!existsSync(resolveLocal(url))) errors.push(`Artwork ${item.key}: missing ${url}`);
    }
    if (variant.responsive.map(image => image.width).join(",") !== "160,320,640") {
      errors.push(`Artwork ${item.key}: incomplete responsive ${theme} sizes`);
    }
  }
  if (!item.prompt || !item.caption || !item.alt) errors.push(`Artwork ${item.key}: incomplete provenance`);
}

for (const item of learningCovers.items) {
  if (!item.source.startsWith('https://') || !item.title || !item.creator) errors.push(`Learning cover ${item.key}: missing source metadata`);
  if (item.variants.map(v => v.width).join(',') !== '240,480') errors.push(`Learning cover ${item.key}: incomplete responsive sizes`);
  for (const variant of item.variants) {
    if (!existsSync(resolveLocal(variant.path))) errors.push(`Learning cover ${item.key}: missing ${variant.path}`);
  }
}

for (const id of ['agi', 'dostoevsky', 'ideas']) {
  for (const theme of ['light', 'dark']) {
    const item = blogArt.entries.find(entry => entry.id === id && entry.theme === theme);
    if (!item?.prompt) { errors.push(`Blog artwork ${id}/${theme}: missing provenance`); continue; }
    if (!/^[a-f0-9]{64}$/.test(item.originalSha256 ?? '')) errors.push(`Blog artwork ${id}/${theme}: missing source-master digest`);
    for (const path of item.variants.map(variant => variant.path)) {
      if (!existsSync(join(root, path))) errors.push(`Blog artwork: missing ${path}`);
    }
    if (item.variants.map(variant => variant.width).join(',') !== '360,720,1200') errors.push(`Blog artwork ${id}/${theme}: incomplete responsive sizes`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML files.`);
