import { readFileSync, writeFileSync } from 'node:fs';
import { browser } from './qa-browser.mjs';
const b=await browser();
const checks=[];
const check=(name,passed,detail)=>{checks.push({name,passed:!!passed,detail});if(!passed)console.log('FAIL',name,detail)};
const {tabTitles:titles}=JSON.parse(readFileSync(new URL('../docs/favicon-artwork.json',import.meta.url),'utf8'));
for(const [page,title] of Object.entries(titles)) {
  await b.navigate('http://127.0.0.1:3001/'+page);
  const state=await b.evaluate(`({title:document.title,icons:[...document.querySelectorAll('link[rel="icon"]')].map(i=>({url:i.href,size:i.sizes.value,type:i.type})),h1:document.querySelector('h1').textContent})`);
  check(page+' exact short tab title',state.title===title,state.title);
  check(page+' Earth links',state.icons.length===2&&state.icons.every(i=>i.type==='image/png'&&/earth-(32|96)\.png\?v=[a-f0-9]+$/.test(i.url)),state.icons);
  for(const icon of state.icons) {
    const status=await b.evaluate(`fetch(${JSON.stringify(icon.url)}).then(r=>({status:r.status,type:r.headers.get('content-type')}))`);
    check(page+' '+icon.size+' icon loads',status.status===200&&status.type.includes('image/png'),status);
  }
  check(page+' no JavaScript errors',!b.events.some(e=>e.method==='Runtime.exceptionThrown'));
}
await b.navigate('http://127.0.0.1:3001/');
const alpha=await b.evaluate(`(async()=>{
  const img=new Image();img.src=document.querySelector('link[rel="icon"][sizes="96x96"]').href;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
  const d=ctx.getImageData(0,0,img.width,img.height).data;let transparent=0,opaque=0;for(let i=3;i<d.length;i+=4){if(d[i]===0)transparent++;if(d[i]>=240)opaque++;}
  const a=(x,y)=>d[(y*img.width+x)*4+3];return {size:[img.width,img.height],corners:[a(0,0),a(95,0),a(0,95),a(95,95)],center:a(48,48),transparent,opaque};
})()`);
// Allow one 8-bit alpha level of resampling noise, not a visible backdrop.
check('Transparent corners (resampling tolerance)',alpha.corners.every(a=>a<=1),alpha);
check('Opaque-looking globe and transparent surround',alpha.center>=250&&alpha.transparent>9216*.2&&alpha.opaque>9216*.4,alpha);
check('Conventional favicon fallback',await b.evaluate(`fetch('/favicon.ico').then(r=>r.ok)`));
await b.evaluate(`(()=>{
 const icon=document.querySelector('link[rel="icon"][sizes="96x96"]').href;
 document.title='Earth';document.body.innerHTML='';document.body.style.cssText='margin:0;padding:60px;font-family:system-ui;background:#ddd';
 for(const theme of ['light','dark']){const section=document.createElement('section');section.style.cssText='padding:32px;margin-bottom:24px;display:flex;align-items:center;gap:40px;background:'+(theme==='light'?'#fafaf9':'#0c0a09')+';color:'+(theme==='light'?'#1c1917':'#e7e5e4');
 const label=document.createElement('span');label.textContent=theme;label.style.width='45px';section.append(label);
 for(const size of [16,32,48,96]){const img=new Image();img.src=icon;img.width=size;img.height=size;img.alt=size+'px Earth';section.append(img)}document.body.append(section)}
 return Promise.all([...document.images].map(i=>i.decode()));
})()`);
await b.capture('earth-light-dark');
writeFileSync(process.env.QA_OUTPUT+'/identity-report.json',JSON.stringify({checks,alpha},null,2));
b.close();
console.log(checks.filter(c=>c.passed).length+'/'+checks.length+' identity checks passed.');
if(checks.some(c=>!c.passed))process.exitCode=1;
