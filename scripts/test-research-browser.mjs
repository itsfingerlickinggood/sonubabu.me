import { readFileSync, writeFileSync } from 'node:fs';
import { browser } from './qa-browser.mjs';
const base = process.env.QA_URL || 'http://127.0.0.1:3001';
const b = await browser();
const out = process.env.QA_OUTPUT + '/';
const checks = [], errors = [], measurements = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
const check = (name, passed, detail) => {
  checks.push({ name, passed: !!passed, ...(detail === undefined ? {} : { detail }) });
  if (!passed) console.log('FAIL', name, detail ?? '');
};
const articles = ['alignment-faking','temporal-refusal-timing','prompt-injection','long-horizon','mechanistic-interpretability'];
async function load(page, width = 1280, theme = 'light', height = 900, reduced = false) {
  await b.navigate(base + '/' + page, width, theme, true, width < 600 ? 2 : 1);
  await b.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await b.call('Emulation.setTouchEmulationEnabled', { enabled: width < 600 });
  await b.call('Emulation.setEmulatedMedia', { features: [{name:'prefers-color-scheme', value:theme},{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}] });
  await b.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{})}))`);
  await pause(50);
}
async function capture(name, selector) {
  if (selector) await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
  const shot = await b.call('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  writeFileSync(out + name + '.png', Buffer.from(shot.data, 'base64'));
}
async function key(key, code) {
  await b.call('Input.dispatchKeyEvent', {type:'keyDown',key,windowsVirtualKeyCode:code,...(key==='Enter'?{text:'\r'}:{})});
  await b.call('Input.dispatchKeyEvent', {type:'keyUp',key,windowsVirtualKeyCode:code});
}
async function click(selector) {
  await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
  const r = await b.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await b.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});
  await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});
}
async function range(selector,value){
  await b.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
}
try {
  for (const width of [1280,390]) for (const theme of ['light','dark']) for (const slug of articles) {
    const page='research/'+slug, label=`${slug} ${width} ${theme}`;
    await load(page,width,theme,width===390?844:900);
    const data=await b.evaluate(`({width:document.documentElement.scrollWidth,inner:innerWidth,images:[...document.images].every(i=>!i.getAttribute('src')||i.complete&&i.naturalWidth>0),h1:document.querySelectorAll('h1').length,firstSection:document.querySelector('.article-body>h2').getBoundingClientRect().top,metaColumns:getComputedStyle(document.querySelector('.publication-meta')).gridTemplateColumns,brokenAnchors:[...document.querySelectorAll('.article-toc a')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)})`);
    measurements.push({page,width,theme,...data});
    check(label+' no document overflow or automatic mobile zoom',data.width<=width+1&&data.inner<=width+1,data);
    check(label+' images load and one main heading',data.images&&data.h1===1);
    check(label+' all contents links resolve',data.brokenAnchors.length===0,data.brokenAnchors);
    check(label+' compact opening and truthful summary',await b.evaluate(`!!document.querySelector('.research-opening')&&!document.querySelector('.evidence-strip')&&document.querySelector('.publication-abstract').innerText.startsWith('In brief')`));
    check(label+' matching image palette',await b.evaluate(`document.querySelector('[data-art] img').currentSrc.includes('-${theme}-')`));
    await capture(slug+'-'+width+'-'+theme);
    await b.evaluate(`document.querySelector('.research-contents summary').focus()`); await key('Enter',13);
    check(label+' native keyboard contents',await b.evaluate(`document.querySelector('.research-contents').open`));
    await key('Enter',13);
    await b.evaluate(`document.querySelector('[data-art]').focus()`); await key('Enter',13);
    check(label+' keyboard artwork viewer',await b.evaluate(`document.querySelector('.art-dialog').open&&document.querySelector('.art-dialog').hasAttribute('data-instant')`));
    await key('Escape',27); await pause(30);
    check(label+' viewer restores focus',await b.evaluate(`!document.querySelector('.art-dialog').open&&document.activeElement.matches('[data-art]')`));
    if(slug==='long-horizon'){
      const heights=[];
      for(const step of [1,2,3,4]){
        await click(`[data-horizon-step="${step}"]`);
        const state=await b.evaluate(`({selected:[...document.querySelectorAll('[data-horizon-step][aria-pressed="true"]')].map(b=>Number(b.dataset.horizonStep)),available:document.querySelectorAll('[data-horizon-context]:not(.is-pending)').length,phase:document.querySelector('[data-horizon-phase]').textContent,question:document.querySelector('[data-horizon-question]').textContent,height:document.querySelector('[data-horizon-demo]').getBoundingClientRect().height,listStyle:getComputedStyle(document.querySelector('.horizon-context li')).listStyleType,font:getComputedStyle(document.querySelector('[data-horizon-description]')).fontSize})`);
        check(label+' phase '+step+' updates the conversation',state.selected.length===1&&state.selected[0]===step&&state.available===step&&state.phase.startsWith('0'+step),state);
        check(label+' phase '+step+' has quiet legible typesetting',state.listStyle==='none'&&state.font==='14px');
        heights.push(state.height);
      }
      check(label+' diagram does not jump between phases',Math.max(...heights)-Math.min(...heights)<=1,heights);
      await capture('horizon-map-'+width+'-'+theme,'[data-horizon-demo]');
      await capture('horizon-observation-'+width+'-'+theme,'.horizon-observation');
      await b.evaluate(`document.querySelector('[data-horizon-step="2"]').focus()`); await key('Enter',13);
      check(label+' keyboard phase updates immediately',await b.evaluate(`document.querySelector('[data-horizon-step="2"]').getAttribute('aria-pressed')==='true'&&getComputedStyle(document.querySelector('[data-horizon-step="2"]')).transitionDuration==='0s'`));
    }
    if(slug==='alignment-faking'){
      await click('[data-chart-phase="replication"]');
      check(label+' replication chart switches',await b.evaluate(`document.querySelector('[data-phase-panel="pilot"]').hidden&&!document.querySelector('[data-phase-panel="replication"]').hidden&&document.querySelector('[data-chart-summary]').textContent.includes('0.25')`));
      await click('[data-chart-phase="compare"]');
      await capture('alignment-chart-'+width+'-'+theme,'[data-result-chart]');
    }
    if(slug==='temporal-refusal-timing'){
      await range('[data-trace-explorer] input',5);
      check(label+' temporal endpoint and path remain distinct',await b.evaluate(`document.querySelector('[data-endpoint-reading]').textContent.includes('refusal')&&document.querySelector('[data-path-reading]').textContent.includes('Earlier assistance')`));
      await b.evaluate(`document.querySelector('.research-correction summary').focus()`); await key('Enter',13);
      check(label+' correction history still accessible',await b.evaluate(`document.querySelector('.research-correction').open&&document.querySelector('.research-correction').innerText.includes('0 self-corrections')`));
      await capture('temporal-trace-'+width+'-'+theme,'[data-trace-explorer]');
    }
    if(slug==='prompt-injection'){
      await click('[data-trust-mode="separated"]');
      check(label+' authority boundary updates',await b.evaluate(`document.querySelector('[data-trust-demo]').dataset.mode==='separated'&&document.querySelector('[data-authority-reading]').textContent.includes('rejects authority')`));
      await capture('trust-boundary-'+width+'-'+theme,'[data-trust-demo]');
      check(label+' evaluation has four readable lenses',await b.evaluate(`document.querySelectorAll('.evaluation-lenses > div').length===4&&document.querySelector('.evaluation-lenses').scrollWidth<=document.querySelector('.evaluation-lenses').clientWidth`));
    }
    if(slug==='mechanistic-interpretability'){
      await range('[data-superposition-demo] input',18); await range('#feature-probe',18);
      check(label+' geometry uses the chosen direction',await b.evaluate(`document.querySelectorAll('.feature-vector').length===18&&document.querySelector('[data-feature-projection]').textContent.includes('Direction 18')`));
      await range('[data-sparsity-demo] input',0);
      check(label+' sparse vector supports zero',await b.evaluate(`document.querySelectorAll('[data-sparse-cell].is-active').length===0`));
      await range('[data-sparsity-demo] input',24);
      check(label+' sparse vector supports all entries',await b.evaluate(`document.querySelectorAll('[data-sparse-cell].is-active').length===24`));
      await capture('feature-geometry-'+width+'-'+theme,'[data-superposition-demo]');
    }
    check(label+' overflowing comparisons are keyboard reachable',await b.evaluate(`[...document.querySelectorAll('[data-reading-comparison]')].every(e=>(e.scrollWidth>e.clientWidth+1)===(e.tabIndex===0))`));
    errors.push(...b.events.filter(e=>e.method==='Runtime.exceptionThrown'||e.method==='Network.loadingFailed').map(e=>({page,width,theme,event:e})));
  }
  for (const theme of ['light','dark']) for (const [width,height] of [[1366,768],[1280,800],[1280,720],[390,844],[375,812]]) {
    await load('',width,theme,height);
    const fit=await b.evaluate(`({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewport:innerHeight,footer:document.querySelector('footer').getBoundingClientRect().bottom})`);
    measurements.push({page:'home',width,height,theme,...fit});
    check(`home ${width}×${height} ${theme} single screen`,fit.height<=height+1&&fit.width<=width+1,fit);
    check(`home ${width} ${theme} no clipping or nested scroll`,await b.evaluate(`getComputedStyle(document.querySelector('.home-left')).overflowY==='visible'&&document.querySelector('.home-left').scrollHeight<=document.querySelector('.home-left').clientHeight+1&&document.querySelector('footer').getBoundingClientRect().top>document.querySelector('.home-left').getBoundingClientRect().bottom`));
    if(width!==1280)await capture('home-'+width+'-'+theme);
  }
  for (const theme of ['light','dark']) for(const width of [1280,390]) {
    await load('projects',width,theme);
    check(`originals ${width} ${theme} use intact source dimensions`,await b.evaluate(`[...document.querySelectorAll('.essay-thumb-original')].every(p=>{const i=p.querySelector('img'),s=getComputedStyle(i),r=p.getBoundingClientRect();return s.objectFit==='contain'&&s.filter==='none'&&s.transform==='none'&&Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<.01})`));
    check(`originals ${width} ${theme} remain original files`,await b.evaluate(`document.querySelector('.essay-thumb-cinema img').getAttribute('src')==='/assets/projects/gotham-origin.jpg'&&document.querySelector('.essay-thumb-logo img').getAttribute('src')==='/assets/projects/openx-origin.png'`));
    await capture('original-concepts-'+width+'-'+theme,'.work-concepts');
  }
  for (const page of ['','projects','research',...articles.map(s=>'research/'+s)]) for(const width of [320,375,540,541,768]) {
    await load(page,width,'light');
    const size=await b.evaluate(`({width:document.documentElement.scrollWidth,inner:innerWidth})`);
    check(`${page||'home'} ${width} responsive fit`,size.width<=width+1&&size.inner<=width+1,size);
  }
  for (const page of ['','projects',...articles.map(s=>'research/'+s)]) {
    await load(page,390,'dark');
    await b.evaluate(`document.documentElement.style.fontSize='200%'`);
    check(`${page||'home'} enlarged text reflows`,await b.evaluate(`document.documentElement.scrollWidth<=390+1`));
  }
  await load('research/long-horizon',390,'dark',844,true);
  await b.evaluate(`document.documentElement.dataset.input='pointer'`);
  await click('[data-horizon-step="1"]');
  check('reduced motion phase remains instant and usable',await b.evaluate(`document.querySelector('[data-horizon-phase]').textContent.startsWith('01')&&getComputedStyle(document.querySelector('[data-horizon-step="1"]')).transitionDuration==='0s'`));
  await capture('horizon-reduced-motion','[data-horizon-demo]');
  await b.call('Emulation.setScriptExecutionDisabled',{value:true});
  for(const slug of articles){
    await b.navigate(base + '/research/'+slug,390,'light',false);
    check(slug+' no-JavaScript reading fallback',await b.evaluate(`document.querySelectorAll('.article-body>h2').length>=6&&!!document.querySelector('.research-contents summary')&&document.querySelector('[data-art]').getAttribute('href').endsWith('-light.webp')&&!document.querySelector('.art-dialog')`));
    if(slug==='long-horizon'){
      check('horizon no-JavaScript complete static context',await b.evaluate(`document.querySelector('[data-horizon-controls]').hidden&&document.querySelectorAll('[data-horizon-context]').length===4&&document.querySelector('[data-horizon-question]').textContent.includes('combined')`));
      await capture('horizon-no-javascript','[data-horizon-demo]');
    }
  }
  await b.call('Emulation.setScriptExecutionDisabled',{value:false});
  check('No browser JavaScript or resource failures',errors.length===0,errors);
  console.log(`${checks.filter(c=>c.passed).length}/${checks.length} browser checks passed.`);
  writeFileSync(out+'research-report.json',JSON.stringify({checks,errors,measurements},null,2));
  if(checks.some(c=>!c.passed))process.exitCode=1;
} finally { await b.call('Emulation.setScriptExecutionDisabled',{value:false}); b.close(); }
