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
      if(/\.(?:css|js)$/.test(path)) {
        const revision=url.match(/\?v=([a-f0-9]{12})$/)?.[1];
        const actual=createHash('sha256').update(readFileSync(local,'utf8').trimEnd()).digest('hex').slice(0,12);
        assert.equal(revision,actual,`${page}: stale runtime URL ${url}`);
      }
      references++;
    }
  }
}
for(const file of files) {
  assert.ok(!/\/(?:originals|docs|node_modules|scripts|newest-research)\//.test(file),`Non-public directory: ${file}`);
  assert.ok(!/\.(?:json|md|zip|log)$/.test(file),`Non-public file: ${file}`);
  if(file.endsWith('.png'))assert.equal(file,'dist/assets/projects/openx-origin.png');
}
assert.ok(statSync('dist/css/home.min.css').size<35000,'Home CSS budget');
assert.ok(statSync('dist/js/viz.min.js').size+statSync('dist/js/main.min.js').size<10000,'Home JavaScript budget');
assert.ok(statSync('dist/css/work.min.css').size<80000,'Research/Project CSS budget');
const arcade=readFileSync('dist/js/learning-arcade.min.js','utf8');
const engineHash=createHash('sha256').update(readFileSync('dist/js/maze-engine.mjs')).digest('hex').slice(0,12);
assert.ok(arcade.includes(`./maze-engine.mjs?v=${engineHash}`),'The game engine import must be versioned too');
console.log(`Production build: ${pages.length} pages, ${references} local references, source exclusions and size budgets passed.`);
