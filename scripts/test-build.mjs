import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
const walk = dir => readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const files = walk('dist');
const pages = files.filter(f=>f.endsWith('.html'));
assert.equal(pages.length,23);
let references=0;
for(const page of pages) {
  const html=readFileSync(page,'utf8');
  for(const [,attr,value] of html.matchAll(/\b(href|src|srcset|data-art-light|data-art-dark|content)="([^"]+)"/g)) {
    const urls=attr==='srcset'?value.split(',').map(v=>v.trim().split(/\s+/)[0]):[value];
    for(let url of urls) {
      url=url.replace(/^https:\/\/sonubabu\.me(?=\/)/,'');
      if(!url.startsWith('/')||url.startsWith('//'))continue;
      const path=decodeURIComponent(url.split(/[?#]/)[0]);
      let local=join('dist',path==='/'?'index.html':path);
      if(!extname(local)&&!existsSync(local))local+='.html';
      assert.ok(existsSync(local),`${page}: unpublished dependency ${url}`);
      if(/\.(?:css|js)$/.test(path) || /^\/assets\/brand\/earth-(?:32|96)\.png$/.test(path)) {
        const revision=url.match(/\?v=([a-f0-9]{12})$/)?.[1];
        const bytes=/\.(?:css|js)$/.test(path)?readFileSync(local,'utf8').trimEnd():readFileSync(local);
        const actual=createHash('sha256').update(bytes).digest('hex').slice(0,12);
        assert.equal(revision,actual,`${page}: stale runtime URL ${url}`);
      }
      references++;
    }
  }
}
for(const file of files) {
  if (/\.(?:html|css|js|mjs|svg|txt)$/.test(file)) {
    assert.ok(!/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(readFileSync(file,'utf8')),`Public email address in ${file}`);
  }
  assert.ok(!/\/(?:originals|docs|node_modules|scripts|newest-research)\//.test(file),`Non-public directory: ${file}`);
  assert.ok(!/\.(?:json|md|zip|log)$/.test(file),`Non-public file: ${file}`);
  if(file.endsWith('.png'))assert.ok(['dist/assets/projects/openx-origin.png','dist/assets/brand/earth-32.png','dist/assets/brand/earth-96.png'].includes(file),`Unexpected published PNG: ${file}`);
}
assert.ok(!existsSync('dist/favicon.svg'),'The old letter favicon must not ship');
const icon=readFileSync('dist/favicon.ico');
assert.equal(icon.readUInt16LE(2),1,'ICO type');
assert.equal(icon.readUInt16LE(4),3,'ICO frame count');
for(const [index,size] of [16,32,48].entries()) {
  assert.equal(icon[6+index*16],size,'ICO width');
  assert.equal(icon[7+index*16],size,'ICO height');
}
assert.ok(statSync('dist/css/home.min.css').size<35000,'Home CSS budget');
assert.ok(statSync('dist/js/viz.min.js').size+statSync('dist/js/main.min.js').size<10000,'Home JavaScript budget');
assert.ok(statSync('dist/css/work.min.css').size<80000,'Research/Project CSS budget');
const arcade=readFileSync('dist/js/learning-arcade.min.js','utf8');
const engineHash=createHash('sha256').update(readFileSync('dist/js/maze-engine.mjs')).digest('hex').slice(0,12);
assert.ok(arcade.includes(`./maze-engine.mjs?v=${engineHash}`),'The game engine import must be versioned too');
console.log(`Production build: ${pages.length} pages, ${references} local references, source exclusions and size budgets passed.`);
