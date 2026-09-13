import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PurgeCSS } from 'purgecss';
import CleanCSS from 'clean-css';
import { minify } from 'terser';
import './package-favicon.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
const pagesIn = folder => readdirSync(join(root, folder)).filter(name => name.endsWith('.html')).sort().map(name => `${folder}/${name}`);
const groups = {
  home: ['index.html'],
  about: ['about.html'],
  collections: ['blog.html', 'projects.html', 'research.html'],
  essay: pagesIn('blog'),
  work: [...pagesIn('projects'), ...pagesIn('research')],
  learnings: ['learnings.html'],
  'not-found': ['404.html'],
};
const pages = Object.values(groups).flat();
const cssParts = ['reset', 'variables', 'base', 'components', 'pages', 'work', 'explainers', 'work-reading', 'research-reading', 'reading', 'shelf', 'blog-visuals', 'collections', 'learning-arcade', 'interactions'];
// PurgeCSS 8 drops some nested logical selectors when one alternative is absent.
// Preserve those complete rules: a few extra bytes beat changing the cascade.
const stylesheet = cssParts.map(name => read(`css/${name}.css`)).join('\n')
  .replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector) => /:(?:is|where|not|has)\(/.test(selector)
    ? `/* purgecss start ignore */\n${rule}\n/* purgecss end ignore */` : rule);
const scripts = ['main', 'viz', 'research', 'explainers', 'work-art', 'learnings', 'blog-visuals', 'reading-index', 'learning-arcade'];
// State attributes are set at runtime. Keep their value selectors and JS-built UI.
const dynamicAttributes = [...new Set([...stylesheet.matchAll(/\[((?:data-|aria-)[\w-]+|open|hidden)\b/g)].map(match => match[1]))];
const revisions = new Map();
for (const path of ['favicon.ico', 'assets/brand/earth-32.png', 'assets/brand/earth-96.png']) {
  revisions.set('/' + path, hash(readFileSync(join(root, path))));
}
const cssBytes = {};
for (const [name, files] of Object.entries(groups)) {
  const htmlSources = files.map(file => ({ raw: read(file), extension: 'html' }));
  const usedScripts = scripts.filter(script => htmlSources.some(({ raw }) => raw.includes(`/js/${script}.min.js`)));
  const scriptSources = usedScripts.map(script => ({ raw: read(`js/${script}.js`), extension: 'js' }));
  const [result] = await new PurgeCSS().purge({
    content: [...htmlSources, ...scriptSources],
    css: [{ raw: stylesheet }],
    dynamicAttributes,
    safelist: { standard: [/^is-/, /^has-/] },
    keyframes: true,
    // CSS custom properties are also read by canvas and SVG scripts.
    variables: false,
  });
  const compressed = new CleanCSS({ level: 1 }).minify(result.css);
  if (compressed.errors.length) throw new Error(compressed.errors.join('\n'));
  const path = `css/${name}.min.css`;
  writeFileSync(join(root, path), compressed.styles + '\n');
  revisions.set('/' + path, hash(compressed.styles));
  cssBytes[name] = Buffer.byteLength(compressed.styles);
}

const engineRevision = hash(read('js/maze-engine.mjs'));
for (const name of scripts) {
  const module = name === 'learning-arcade';
  const source = read(`js/${name}.js`).replace('./maze-engine.mjs', `./maze-engine.mjs?v=${engineRevision}`);
  const result = await minify(source, { compress: true, mangle: true, module });
  const path = `js/${name}.min.js`;
  writeFileSync(join(root, path), result.code + '\n');
  revisions.set('/' + path, hash(result.code));
}

// Versioned URLs prevent a new HTML release from reusing stale cached CSS/JS.
for (const [name, files] of Object.entries(groups)) {
  for (const file of files) {
    const html = read(file)
      .replace(/\/css\/[\w-]+\.min\.css(?:\?v=[\w]+)?/g, `/css/${name}.min.css`)
      .replace(/\/(?:(?:css|js)\/[\w-]+\.min\.(?:css|js)|favicon\.ico|assets\/brand\/earth-(?:32|96)\.png)(?:\?v=[\w]+)?/g, url => {
        const path = url.split('?')[0];
        if (!revisions.has(path)) throw new Error(`Unbuilt runtime file: ${path}`);
        return `${path}?v=${revisions.get(path)}`;
      });
    if (html !== read(file)) writeFileSync(join(root, file), html);
  }
}

// Publish an allowlist, never the repository root (notes, source PNGs or tools).
const publicFiles = new Set([...pages, 'robots.txt', 'sitemap.xml', 'favicon.ico', 'og-image.svg', 'js/maze-engine.mjs']);
for (const file of pages) {
  for (const [, attribute, value] of read(file).matchAll(/\b(href|src|srcset|data-art-light|data-art-dark|content)="([^"]+)"/g)) {
    const urls = attribute === 'srcset' ? value.split(',').map(part => part.trim().split(/\s+/)[0]) : [value];
    for (let url of urls) {
      url = url.replace(/^https:\/\/sonubabu\.me(?=\/)/, '');
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const path = decodeURIComponent(url.split(/[?#]/)[0]).slice(1);
      if (!path || !existsSync(join(root, path)) || !statSync(join(root, path)).isFile()) continue;
      if (!/^(assets\/|pdf-research-files\/|css\/[\w-]+\.min\.css$|js\/[\w-]+\.min\.js$|favicon\.ico$|og-image\.svg$|[\w/-]+\.html$)/.test(path)) {
        throw new Error(`Review unexpected public dependency: ${path}`);
      }
      publicFiles.add(path);
    }
  }
}
const out = join(root, 'dist');
const marker = join(out, '.generated-site');
if (existsSync(out)) {
  if (!existsSync(marker)) throw new Error('Refusing to replace an unrecognized dist directory.');
  rmSync(out, { recursive: true });
}
mkdirSync(out);
writeFileSync(marker, 'Generated by scripts/build.mjs; do not edit.\n');
let bytes = 0;
for (const file of [...publicFiles].sort()) {
  mkdirSync(dirname(join(out, file)), { recursive: true });
  copyFileSync(join(root, file), join(out, file));
  bytes += statSync(join(root, file)).size;
}
console.log(JSON.stringify({ pages: pages.length, publicFiles: publicFiles.size, publicBytes: bytes, cssBytes }, null, 2));
