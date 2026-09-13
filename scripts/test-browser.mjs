import { readdirSync, writeFileSync } from 'node:fs';
import { browser } from './qa-browser.mjs';
const b = await browser();
const base = process.env.QA_URL || 'http://127.0.0.1:3001';
const mainPages = ['index.html','about.html','projects.html','research.html','blog.html','learnings.html'];
const pages = [...mainPages, '404.html', ...['blog','projects','research'].flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.html')).map(f => dir+'/'+f))];
const checks = [], measurements = [];
const check = (name, passed, detail) => { checks.push({ name, passed: !!passed, detail }); if (!passed) console.log('FAIL',name,JSON.stringify(detail)); };
async function load(page, width=1280, theme='light', height=900) {
  await b.navigate(base+'/'+page, width, theme);
  await b.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await b.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  await b.evaluate(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{})}))`);
}
async function key(key, code) {
  await b.call('Input.dispatchKeyEvent',{type:'keyDown',key,windowsVirtualKeyCode:code,...(key==='Enter'?{text:'\r'}:{})});
  await b.call('Input.dispatchKeyEvent',{type:'keyUp',key,windowsVirtualKeyCode:code});
}
try {
  for (const width of [1280,768,540,390,320]) for (const theme of ['light','dark']) {
    let reference;
    for (const page of pages) {
      await load(page,width,theme);
      const label=`${page} ${width} ${theme}`;
      const state=await b.evaluate(`(()=>{
        const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100)};
        return {width:document.documentElement.scrollWidth,viewport:innerWidth,nav:[...document.querySelectorAll('.site-nav,.site-nav>a,.theme-toggle')].map(rect),title:rect(document.querySelector('h1')),bodyFont:getComputedStyle(document.body).fontFamily,images:[...document.images].every(i=>!i.getAttribute('src')||i.complete&&i.naturalWidth),headings:document.querySelectorAll('h1').length,localAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash),scripts:performance.getEntriesByType('resource').filter(r=>/\\.(?:css|js)(?:\\?|$)/.test(r.name)).map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize})),theme:document.documentElement.dataset.theme};
      })()`);
      reference ||= state;
      check(label+' no horizontal overflow or autozoom',state.width<=width+1&&state.viewport<=width+1,[state.width,state.viewport]);
      check(label+' identical navigation geometry',JSON.stringify(state.nav)===JSON.stringify(reference.nav),state.nav);
      if(mainPages.includes(page))check(label+' aligned page title',Math.abs(state.title[1]-reference.title[1])<1,[reference.title[1],state.title[1]]);
      check(label+' images and headings',state.images&&state.headings===1);
      check(label+' system typography',state.bodyFont.includes('system-ui'));
      check(label+' local section links',state.localAnchors.length===0,state.localAnchors);
      check(label+' no JavaScript exceptions',!b.events.some(e=>e.method==='Runtime.exceptionThrown'),b.events.filter(e=>e.method==='Runtime.exceptionThrown'));
      check(label+' resources return successfully',!b.events.some(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400),b.events.filter(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400).map(e=>e.params.response.url));
      if(width===1280&&theme==='light')measurements.push({page,...state});
      if(mainPages.includes(page)&&[1280,390].includes(width))await b.capture(page.replace('.html','')+'-'+width+'-'+theme);
      if(page==='learnings.html') {
        check(label+' ten original picks',await b.evaluate(`document.querySelectorAll('.shelf-item').length===10&&document.querySelectorAll('.book-list .shelf-item').length===3&&document.querySelectorAll('.story-list .shelf-item').length===2`));
        check(label+' covers are uncropped',await b.evaluate(`[...document.querySelectorAll('.shelf-cover img')].every(i=>getComputedStyle(i).objectFit==='contain')`));
        if([1280,390].includes(width))for(const id of ['music','books'])await b.capture(id+'-'+width+'-'+theme,'#'+id);
      }
    }
  }
  for(const page of pages) {
    await load(page,390);
    await b.evaluate(`document.documentElement.style.fontSize='200%'`);
    check(page+' 200% text reflow',await b.evaluate(`document.documentElement.scrollWidth<=391`));
  }
  for(const [width,height] of [[1280,720],[1366,768],[375,812],[390,844]]) {
    await load('index.html',width,'light',height);
    check(`Home fits ${width}×${height}`,await b.evaluate(`document.documentElement.scrollHeight<=innerHeight+1`),await b.evaluate(`document.documentElement.scrollHeight`));
  }
  await load('index.html');
  check('Home has no Email button',await b.evaluate(`!document.querySelector('a[href^="mailto:"]')`));
  await b.evaluate(`document.querySelector('.theme-toggle').focus()`);await key('Enter',13);
  check('Keyboard theme change is instant',await b.evaluate(`document.documentElement.dataset.theme==='dark'&&getComputedStyle(document.querySelector('.theme-toggle svg')).transitionDuration==='0s'`));
  await b.navigate(base+'/about.html');
  check('Theme survives navigation',await b.evaluate(`document.documentElement.dataset.theme==='dark'`));
  await load('blog.html');
  check('Blog follow-up removed',await b.evaluate(`!document.body.textContent.includes('For working notes and things worth returning to')`));
  await load('learnings.html');
  await b.evaluate(`document.querySelector('.learning-item summary').focus()`);await key('Enter',13);
  check('Learning note opens with keyboard',await b.evaluate(`document.querySelector('.learning-item').open&&!document.querySelector('[data-disclosure-moving]')`));
  await b.evaluate(`new Promise(resolve=>{const i=document.querySelector('.shelf-cover img');i.addEventListener('error',resolve,{once:true});i.removeAttribute('srcset');i.src='data:image/webp;base64,invalid'})`);
  check('Missing cover preserves readable fallback',await b.evaluate(`getComputedStyle(document.querySelector('.shelf-placeholder')).display==='grid'&&document.querySelectorAll('.shelf-copy h3').length===10`));
  await b.evaluate(`document.querySelector('[data-learning-arcade]').scrollIntoView({block:'center'});new Promise(r=>setTimeout(r,100))`);
  await b.evaluate(`document.querySelector('[data-arcade-train]').click()`);
  for(let n=0;n<100&&await b.evaluate(`Number(document.querySelector('[data-arcade-episodes]').textContent.replaceAll(',',''))<500`);n++)await new Promise(r=>setTimeout(r,50));
  check('Arcade training completes',await b.evaluate(`!document.querySelector('[data-arcade-train]').disabled&&document.querySelector('[data-arcade-episodes]').textContent.includes('500')`));
  for(const page of ['blog/agi.html','blog/dostoevsky.html','blog/ideas.html']) {
    await load(page,390);
    await b.evaluate(`document.querySelector('[data-choice]:last-child').click()`);
    check(page+' figure state switches',await b.evaluate(`document.querySelector('[data-choice]:last-child').getAttribute('aria-pressed')==='true'`));
  }
  await load('projects/market01.html',390);
  await b.evaluate(`const s=document.querySelector('#memory-floor');s.value='80';s.dispatchEvent(new Event('change',{bubbles:true}))`);
  check('Project filter remains usable',await b.evaluate(`document.querySelector('#memory-floor').value==='80'&&!document.querySelector('[data-lab-controls]').hidden`));
  await b.call('Emulation.setScriptExecutionDisabled',{value:true});
  for(const page of mainPages) {
    await b.navigate(base+'/'+page,390,'light',false);
    check(page+' no-JS content and layout',await b.evaluate(`!!document.querySelector('main h1')&&document.documentElement.scrollWidth<=391&&getComputedStyle(document.querySelector('.site-nav')).display==='flex'`));
  }
  await b.call('Emulation.setScriptExecutionDisabled',{value:false});
  const {identifier}=await b.call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})`});
  await load('index.html');
  check('Blocked storage has no script errors',!b.events.some(e=>e.method==='Runtime.exceptionThrown'));
  await b.evaluate(`document.querySelector('.theme-toggle').click()`);
  check('Theme works without storage',await b.evaluate(`document.documentElement.dataset.theme==='dark'`));
  await b.call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
} finally {
  await b.call('Emulation.setScriptExecutionDisabled',{value:false});
  b.close();
  writeFileSync(process.env.QA_OUTPUT+'/site-report.json',JSON.stringify({checks,measurements},null,2));
}
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} site checks passed.`);
if(checks.some(c=>!c.passed))process.exitCode=1;
