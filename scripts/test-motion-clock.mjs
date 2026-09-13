import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Instrument only the clock in the actual drawing function. No production hooks.
const source=readFileSync(new URL('../js/viz.js',import.meta.url),'utf8');
const begin=source.indexOf('  function dotMatrix(ctr) {');
const end=source.indexOf('  /* ═══ REGISTRY',begin);
assert(begin>0&&end>begin,'The drawing function must be found without truncation.');
const drawing=source.slice(begin,end).replace('t += delta;','t += delta; samples.push(t);');
let checks=0;
function simulation(){
  let now=0,frame;
  const ctr={},state={single:false,paused:false,clockReset:false},samples=[];
  const ctx=new Proxy({}, {get:()=>()=>{}});
  const context={ctr,samples,reducedMotion:false,performance:{now:()=>now},vizState:new Map([[ctr,state]]),
    initCanvas:()=>({ctx,W:()=>390,H:()=>180}),C:()=>({hi:'rgba(0,0,0,'}),queueFrame:(_,draw)=>{frame=draw;}};
  vm.runInNewContext(drawing+';dotMatrix(ctr);',context);
  return {state,context,samples,tick(time){now=time;frame();},time:()=>samples.at(-1)};
}
for(const hz of [30,60,90,120,144]){
  const s=simulation();for(let frame=1;frame<=hz;frame++)s.tick(frame*1000/hz);
  assert(Math.abs(s.time()-60)<1e-9,`${hz}Hz must represent the same one second.`);checks++;
}
const s=simulation();s.tick(1000/60);const before=s.time();
s.state.paused=true;s.tick(50);assert.equal(s.time(),before);checks++;
s.state.paused=false;s.state.clockReset=true;s.tick(60);assert.equal(s.time(),before);checks++;
s.tick(60+1000/60);assert(Math.abs(s.time()-before-1)<1e-9);checks++;
const resume=s.time();s.tick(2000);assert.equal(s.time(),resume);checks++;
s.context.reducedMotion=true;s.tick(2016);assert.equal(s.time(),resume);checks++;
s.context.reducedMotion=false;s.state.single=true;s.tick(2032);assert.equal(s.time(),resume);checks++;
console.log(`${checks} motion-clock assertions passed (30–144Hz, pause/resume, long gaps, reduced motion, still repaint).`);
