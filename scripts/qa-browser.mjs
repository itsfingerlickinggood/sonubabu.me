import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const directory = process.env.QA_OUTPUT;
const profile = process.env.QA_CHROME_PROFILE;
if (!directory || !profile) throw new Error('Set QA_OUTPUT and QA_CHROME_PROFILE to dedicated QA directories.');
mkdirSync(directory, {recursive: true});
const [port, path] = readFileSync(profile + '/DevToolsActivePort', 'utf8').split('\n');
export async function browser() {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const job = pending.get(data.id); pending.delete(data.id);
      if (data.error) job.reject(new Error(JSON.stringify(data.error))); else job.resolve(data.result);
    } else events.push(data);
  };
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => { const key = ++id; pending.set(key, {resolve, reject}); ws.send(JSON.stringify({id:key, method, params, sessionId})); });
  }
  const targets = await send('Target.getTargets');
  const target = targets.targetInfos.find(t => t.type === 'page');
  const { sessionId } = await send('Target.attachToTarget', {targetId: target.targetId, flatten:true});
  const call = (method, params) => send(method, params, sessionId);
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Network.setCacheDisabled', {cacheDisabled:true});
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  return {
    call, evaluate, events,
    async navigate(url, width = 1280, theme = 'light', scripts = true, dpr = 1) {
      await call('Emulation.setDeviceMetricsOverride', {width, height:900, deviceScaleFactor:dpr, mobile:dpr > 1});
      await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-color-scheme',value:theme}]});
      events.length = 0;
      const result = await call('Page.navigate', {url});
      if (result.errorText) throw new Error(result.errorText);
      for (let count=0; result.loaderId && count<100; count++) {
        if (events.some(e => e.method === 'Page.loadEventFired')) break;
        await new Promise(r => setTimeout(r,100));
      }
      if (scripts) {
        await evaluate('document.fonts.ready.then(() => true)');
        await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))');
      }
    },
    async capture(name, selector) {
      if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'}); true`);
      const shot = await call('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
      writeFileSync(directory + '/' + name + '.png', Buffer.from(shot.data,'base64'));
      return directory + '/' + name + '.png';
    },
    async shutdown() { await send('Browser.close'); ws.close(); },
    close() { ws.close(); }
  };
}
