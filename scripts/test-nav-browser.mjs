import { readFileSync, writeFileSync } from 'node:fs';
import { browser } from './qa-browser.mjs';

const b = await browser();
const base = 'http://127.0.0.1:3001';
const { tabTitles } = JSON.parse(readFileSync(new URL('../docs/favicon-artwork.json', import.meta.url), 'utf8'));
const checks = [];
const check = (name, passed, detail) => {
  checks.push({ name, passed: !!passed, detail });
  if (!passed) console.log('FAIL', name, detail);
};
const frame = 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))';
const geometry = `[...document.querySelectorAll('.site-nav,.site-nav>a,.theme-toggle')].map(e => {
  const r=e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height];
})`;
const visibleEarth = `(() => {
  const images=[...document.querySelectorAll('img.nav-earth')];
  const visible=images.filter(i=>getComputedStyle(i).visibility==='visible');
  return {count:visible.length,src:visible[0]?.src,filter:visible[0]&&getComputedStyle(visible[0]).filter,loaded:images.every(i=>i.complete&&i.naturalWidth===96),
    instant:images.every(i=>getComputedStyle(i).transitionDuration==='0s'&&getComputedStyle(i).animationName==='none')};
})()`;

try {
  for (const stored of [null, 'invalid']) {
    await b.navigate(base + '/');
    await b.evaluate(stored === null ? `localStorage.removeItem('theme')` : `localStorage.setItem('theme','invalid')`);
    for (const page of Object.keys(tabTitles)) {
      await b.navigate(base + '/' + page, 390, 'dark');
      check(page + ' ' + (stored ?? 'unset') + ' choice defaults to light on dark OS', await b.evaluate(`document.documentElement.dataset.theme==='light'&&document.querySelector('.theme-toggle').getAttribute('aria-label')==='Switch to dark mode'`));
      check(page + ' has no email link or structured contact property', await b.evaluate(`!document.querySelector('a[href^="mailto:"]')&&[...document.querySelectorAll('script[type="application/ld+json"]')].every(s=>!('email' in JSON.parse(s.textContent)))`));
      if (page.startsWith('blog/')) {
        check(page + ' artwork follows light default', await b.evaluate(`[...document.querySelectorAll('[data-blog-dark]')].every(s=>s.media==='not all')`));
      }
    }
  }
  for (const theme of ['light', 'dark']) {
    await b.navigate(base + '/');
    await b.evaluate(`localStorage.setItem('theme',${JSON.stringify(theme)})`);
    for (const page of Object.keys(tabTitles)) {
      // Opposite system preference proves the saved choice wins before display.
      await b.navigate(base + '/' + page, 390, theme === 'light' ? 'dark' : 'light');
      const brand = await b.evaluate(`(() => {
        const a=document.querySelector('.nav-name'),r=a.getBoundingClientRect();
        return {text:a.textContent.trim(),label:a.getAttribute('aria-label'),href:a.getAttribute('href'),
          width:r.width,height:r.height,theme:document.documentElement.dataset.theme,images:a.querySelectorAll('img').length};
      })()`);
      const label = page + ' ' + theme;
      check(label + ' native Home target', brand.href === '/' && brand.width >= 44 && brand.height >= 44, brand);
      check(label + ' saved theme', brand.theme === theme, brand.theme);
      if (page === 'index.html') {
        check(label + ' keeps name', brand.text === 'Sonu Babu' && brand.images === 0, brand);
      } else {
        check(label + ' icon-only accessible link', brand.text === '' && brand.label === 'Sonu Babu — Home' && brand.images === 1, brand);
        await b.evaluate(`document.querySelector('.nav-earth').decode()`);
        const earth = await b.evaluate(visibleEarth);
        check(label + ' one loaded, motionless theme image', earth.count === 1 && earth.loaded && earth.instant && earth.src.includes('/earth-96.png') && earth.filter === (theme === 'dark' ? 'brightness(0.9) saturate(0.86)' : 'none'), earth);
      }
    }
  }

  await b.navigate(base + '/research.html');
  await b.call('Accessibility.enable');
  const tree = await b.call('Accessibility.getFullAXTree');
  check('Screen reader identifies Home link', tree.nodes.some(n => n.role?.value === 'link' && n.name?.value === 'Sonu Babu — Home'));
  const originalGeometry = await b.evaluate(geometry);
  for (let i = 0; i < 12; i++) await b.evaluate(`document.querySelector('.theme-toggle').click()`);
  await b.evaluate(frame);
  check('Rapid theme changes never move navigation', JSON.stringify(await b.evaluate(geometry)) === JSON.stringify(originalGeometry));
  check('Rapid theme changes settle to one Earth', (await b.evaluate(visibleEarth)).count === 1);

  for (const theme of ['light', 'dark']) {
    await b.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const alpha = await b.evaluate(`(() => {
      const img=document.querySelector('.nav-earth');
      const c=document.createElement('canvas'); c.width=c.height=96;
      const ctx=c.getContext('2d');ctx.filter=getComputedStyle(img).filter;ctx.drawImage(img,0,0);
      const d=ctx.getImageData(0,0,96,96).data;const a=(x,y)=>d[(y*96+x)*4+3];
      let transparent=0;for(let n=3;n<d.length;n+=4)if(d[n]===0)transparent++;
      return {corners:[a(0,0),a(95,0),a(0,95),a(95,95)],center:a(48,48),transparent};
    })()`);
    check(theme + ' genuine transparent surround', alpha.corners.every(a => a <= 1) && alpha.center >= 250 && alpha.transparent > 9216 * .2, alpha);
  }

  // Tab, not a mouse click, must expose focus and activate native navigation.
  await b.evaluate(`document.activeElement.blur()`);
  await b.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', windowsVirtualKeyCode: 9 });
  await b.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', windowsVirtualKeyCode: 9 });
  // The skip link is first, so advance to the brand link if needed.
  if (!await b.evaluate(`document.activeElement.matches('.nav-name')`)) {
    await b.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', windowsVirtualKeyCode: 9 });
    await b.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', windowsVirtualKeyCode: 9 });
  }
  check('Keyboard focus is visible', await b.evaluate(`document.activeElement.matches('.nav-name:focus-visible')&&getComputedStyle(document.activeElement).outlineStyle!=='none'`));
  await b.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await b.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
  for (let n=0; n<50; n++) {
    if (await b.evaluate(`location.pathname==='/'&&document.readyState==='complete'`)) break;
    await new Promise(r=>setTimeout(r,50));
  }
  check('Enter returns Home and restores name', await b.evaluate(`location.pathname==='/'&&document.querySelector('.nav-name').textContent==='Sonu Babu'`));

  await b.call('Emulation.setScriptExecutionDisabled', { value: true });
  await b.navigate(base + '/about.html', 390, 'dark', false);
  const noJS = await b.evaluate(visibleEarth);
  check('No-JS has one visible daylight fallback', noJS.count === 1 && noJS.src.includes('/earth-96.png') && noJS.filter === 'none', noJS);
  await b.call('Emulation.setScriptExecutionDisabled', { value: false });

  const {identifier} = await b.call('Page.addScriptToEvaluateOnNewDocument', {source:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})`});
  await b.navigate(base + '/about.html', 390, 'dark');
  check('Blocked storage defaults to light despite dark system preference', (await b.evaluate(visibleEarth)).filter === 'none');
  await b.call('Page.removeScriptToEvaluateOnNewDocument', {identifier});
  await b.call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await b.evaluate(`document.querySelector('.theme-toggle').click()`);
  check('Reduced motion stays instant', (await b.evaluate(visibleEarth)).instant);

  // Removing the injected hook affects future documents, not the current one.
  await b.navigate(base + '/');
  for (const width of [1280, 390]) for (const theme of ['light', 'dark']) {
    await b.evaluate(`localStorage.setItem('theme',${JSON.stringify(theme)})`);
    for (const page of ['index.html', 'about.html', 'research.html']) {
      await b.navigate(base + '/' + page, width, theme);
      await b.capture(`nav-${page.replace('.html','')}-${width}-${theme}`);
    }
  }
} finally {
  await b.call('Emulation.setScriptExecutionDisabled', { value: false });
  await b.call('Emulation.setEmulatedMedia', { features: [] });
  b.close();
  writeFileSync(process.env.QA_OUTPUT + '/nav-report.json', JSON.stringify({checks}, null, 2));
}
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} navigation checks passed.`);
if (checks.some(c=>!c.passed)) process.exitCode = 1;
