#!/usr/bin/env node
/** Acceptance checks using installed Chrome and its DevTools protocol. */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { lensDisplayPoint } from "../src/crt.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, ".qa");
const PORT = Number(process.env.QA_PORT || 5199);
const DEBUG_PORT = Number(process.env.QA_DEBUG_PORT || 9333);
const BASE = process.env.QA_URL || `http://127.0.0.1:${PORT}/`;
const CHROME = process.env.CHROME || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find(existsSync);
const results = [], errors = [], badResponses = [];
const resources = {};
const repos = {
  seal: "seal", packager: "packager",
  "spectral-corruptor": "spectral-corruptor-plugin",
  dtblkfx: "dtblkfx4mackintosh",
};

function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        for (const handler of this.handlers.get(message.method) || []) handler(message.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) {
    const list = this.handlers.get(method) || [];
    list.push(handler);
    this.handlers.set(method, list);
  }
}

async function poll(fn, timeout = 15000, label = "condition") {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const value = await fn(); if (value) return value; } catch { /* page or server is starting */ }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function cleanup() {
  resources.cdp?.ws.close();
  if (resources.chrome) {
    resources.chrome.kill("SIGKILL");
    await sleep(300);
  }
  if (resources.vite?.pid) {
    try { process.kill(-resources.vite.pid, "SIGKILL"); } catch { /* already exited */ }
  }
  if (resources.profile) rmSync(resources.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

const hook = `(() => {
  const stats = window.__qa = { sounds: [], errors: [] };
  const Context = window.AudioContext || window.webkitAudioContext;
  if (Context) {
    const create = Context.prototype.createBufferSource;
    Context.prototype.createBufferSource = function() {
      const source = create.call(this), start = source.start.bind(source), stop = source.stop.bind(source);
      let record;
      source.start = (...args) => {
        record = { at: performance.now(), duration: source.buffer?.duration || 0, loop: source.loop };
        stats.sounds.push(record);
        return start(...args);
      };
      source.stop = (...args) => { if (record) record.stopped = true; return stop(...args); };
      return source;
    };
  }
  window.addEventListener('error', event => stats.errors.push(String(event.message)));
  window.addEventListener('unhandledrejection', event => stats.errors.push(String(event.reason)));
})();`;

async function main() {
  if (!CHROME) throw new Error("Install Chrome or set CHROME to its executable path.");
  mkdirSync(OUT, { recursive: true });
  if (!process.env.QA_URL) {
    if (process.env.QA_PREVIEW === "1") await run("npm", ["run", "build"]);
    let inUse = false;
    try { inUse = (await fetch(BASE)).ok; } catch { /* available */ }
    if (inUse) throw new Error(`Port ${PORT} is already in use; set QA_URL or another QA_PORT.`);
    resources.vite = spawn("npx", ["vite", process.env.QA_PREVIEW === "1" ? "preview" : "dev", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore", detached: true });
  }
  await poll(async () => (await fetch(BASE)).ok, 30000, "site response");
  resources.profile = join(tmpdir(), `portfolio-qa-${Date.now()}`);
  resources.chrome = spawn(CHROME, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--autoplay-policy=user-gesture-required", `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${resources.profile}`, "--window-size=1440,980", "about:blank"], { stdio: "ignore" });
  const target = await poll(async () => (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find(t => t.type === "page"), 20000, "Chrome");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  const cdp = resources.cdp = new CDP(ws);
  cdp.on("Runtime.exceptionThrown", p => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  cdp.on("Network.responseReceived", p => { if (p.response.status >= 400) badResponses.push(`${p.response.status} ${p.response.url}`); });
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: hook });
  const evaluate = async expression => {
    const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  };
  const wait = (expression, timeout = 15000, label = expression) => poll(() => evaluate(expression), timeout, label);
  const shot = async name => {
    if (process.env.QA_SHOTS === "0") return;
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  };
  const click = async selector => {
    const scroll = `(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)return;e.scrollIntoView({block:'center',behavior:'instant'});if(document.querySelector('#site').contains(e)){const r=e.getBoundingClientRect();window.scrollBy({top:r.top+r.height/2-innerHeight/2,behavior:'instant'})}})()`;
    await evaluate(scroll);
    await sleep(360);
    await evaluate(scroll);
    await sleep(100);
    const box = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()`);
    if (!box?.w || !box?.h) throw new Error(`Control is not visible: ${selector}`);
    const optical = await evaluate(`({active:document.documentElement.classList.contains('crt-mode')&&!document.querySelector('#preview-dialog').open,width:document.documentElement.clientWidth,height:innerHeight})`);
    const point = optical.active ? lensDisplayPoint(box.x, box.y, optical.width, optical.height) : {x:box.x,y:box.y};
    for (const type of ["mousePressed", "mouseReleased"]) await cdp.send("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1, buttons: type === "mousePressed" ? 1 : 0 });
  };
  const key = async (key, code = key) => {
    for (const type of ["keyDown", "keyUp"]) await cdp.send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: key === "Escape" ? 27 : undefined });
  };
  const setSearch = async text => {
    await evaluate(`document.querySelector('#search').value=${JSON.stringify(text)};document.querySelector('#search').dispatchEvent(new Event('input',{bubbles:true}))`);
    await sleep(100);
  };
  const go = async view => {
    await click(`[data-nav="${view}"]`);
    await wait(`document.querySelector('.shell').dataset.view===${JSON.stringify(view)} && !document.querySelector('.workspace').inert`);
  };
  const viewport = async (width, height = 900) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await sleep(350);
  };

  await viewport(1440);
  await cdp.send("Page.navigate", { url: BASE });
  await wait(`document.querySelector('#enter') && !document.querySelector('#enter').disabled`, 60000, "archive readiness");
  check("portal keeps the site inert until entry", await evaluate(`!document.querySelector('#boot').hidden && document.querySelector('#site').inert`));
  check("all loading completes before language choice", await evaluate(`document.querySelector('.boot-progress').getAttribute('aria-valuenow')==='100' && document.querySelectorAll('[data-enter]').length===2`));
  await shot("01-entry");
  await click("#enter");
  await wait(`document.querySelector('#boot').hidden && !document.querySelector('#site').inert`, 20000, "entry assembly");
  check("GitHub projects open as the first module", await evaluate(`document.querySelector('.shell').dataset.view==='projects' && document.querySelectorAll('#project-list [data-project]').length===4`));
  check("audio navigation leads to dirtyoctopus.net", await evaluate(`document.querySelector('#audio-portfolio').href==='https://dirtyoctopus.net/'`));
  check("navigation ends with a distinct unnumbered audio link", await evaluate(`(()=>{const nav=document.querySelector('nav'),items=[...nav.querySelectorAll('[data-nav],#audio-portfolio')],link=document.querySelector('#audio-portfolio');return JSON.stringify(items.map(e=>e.dataset.nav||e.id))===JSON.stringify(['projects','overview','contact','audio-portfolio'])&&!link.hasAttribute('data-nav')&&![...link.querySelectorAll('span')].some(e=>/^\\s*\\d{2}/.test(e.textContent))})()`));
  check("playground and floating sound controls are absent", await evaluate(`!document.querySelector('[data-nav="fun"],.playground,#rotary-knob,#neuraa-slider,.transport,.project-transport,#volume,#mute,#spectrum')`));
  check("Chinese entry localizes the document", await evaluate(`document.documentElement.lang==='zh-CN' && /GitHub|项目|作品集/i.test(document.title)`));
  check("background music starts as a loop", await evaluate(`window.__qa.sounds.some(s=>s.loop)`));
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  await shot("02-projects-desktop");

  await evaluate(`document.activeElement.blur()`);
  await key("/", "Slash");
  await wait(`document.activeElement===document.querySelector('#search')`);
  check("slash focuses the project search", true);
  await key("Escape");

  for (const [id, repo] of Object.entries(repos)) {
    await click(`[data-project="${id}"]`);
    await wait(`document.querySelector('#project-image').complete && document.querySelector('#project-image').naturalWidth>0 && document.querySelector('#project-repository').href==='https://github.com/Dirty-Octopus/${repo}'`);
    check(`${id} selects its preview and repository`, await evaluate(`document.querySelector('[data-project="${id}"]').getAttribute('aria-pressed')==='true' && document.querySelector('#project-title').textContent.trim().length>0`));
    await shot(`03-project-${id}`);
  }
  await click('#project-filters [data-category="desktop"]');
  check("desktop filter shows Seal and Packager", await evaluate(`document.querySelectorAll('#project-list [data-project]').length===2 && !!document.querySelector('#project-list [data-project="seal"]') && !!document.querySelector('#project-list [data-project="packager"]')`));
  await click('#project-filters [data-category="audio"]');
  check("audio tools filter shows both plugin projects", await evaluate(`document.querySelectorAll('#project-list [data-project]').length===2 && !!document.querySelector('#project-list [data-project="spectral-corruptor"]') && !!document.querySelector('#project-list [data-project="dtblkfx"]')`));
  await click('#project-filters [data-category="all"]');
  await setSearch("seal");
  check("project search narrows the archive", await evaluate(`document.querySelectorAll('#project-list [data-project]').length===1 && !!document.querySelector('#project-list [data-project="seal"]')`));
  await setSearch("no-such-project-98765");
  check("unmatched search shows an empty result", await evaluate(`document.querySelectorAll('#project-list [data-project]').length===0 && document.querySelector('#project-list').textContent.trim().length>0`));
  await setSearch("");
  await click('[data-project="spectral-corruptor"]');
  await click("#preview-open");
  await wait(`document.querySelector('#preview-dialog').open`);
  check("image preview opens with a loaded image", await evaluate(`!![...document.querySelectorAll('#preview-dialog img')].find(i=>i.complete&&i.naturalWidth>0)`));
  await wait(`document.querySelector('#preview-image').getAnimations().every(a=>a.playState==='finished'||a.playState==='idle')`);
  check("desktop preview settles at a readable centered size", await evaluate(`(()=>{const r=document.querySelector('#preview-image').getBoundingClientRect(),s=document.querySelector('.preview-full-stage').getBoundingClientRect();return r.width>600&&Math.abs(r.left+r.width/2-s.left-s.width/2)<3&&Math.abs(r.top+r.height/2-s.top-s.height/2)<3})()`));
  await shot("04-full-preview");
  await key("Escape");
  await wait(`!document.querySelector('#preview-dialog').open`);
  check("Escape closes preview and restores its trigger focus", await evaluate(`document.activeElement===document.querySelector('#preview-open')`));
  if (process.env.QA_ONLY === "preview") {
    check("preview verification has no browser or asset errors", errors.length === 0 && badResponses.length === 0, [...errors, ...badResponses].join(" | "));
    writeFileSync(join(OUT, "preview-results.json"), JSON.stringify({ url: BASE, results, errors, badResponses }, null, 2));
    const failed = results.filter(result => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} preview checks passed`);
    if (failed.length) process.exitCode = 1;
    return;
  }

  await go("overview");
  check("profile identifies Andy Yu and Jinan University", await evaluate(`(()=>{const b=document.querySelector('.biography');return b.offsetWidth>0&&b.textContent.includes('Andy Yu')&&b.textContent.includes('暨南大学')&&b.textContent.includes('独立开发')})()`));
  check("profile covers audio DSP, web development, UNIX and FOSS", await evaluate(`(()=>{const text=document.querySelector('.biography').textContent;return /Audio\\s*DSP/i.test(text)&&/Web(?:\\s*Dev|\\s*开发)/i.test(text)&&/UNIX/i.test(text)&&/FOSS/i.test(text)})()`));
  check("profile lists the two game project download achievements", await evaluate(`(()=>{const credits=document.querySelector('.profile-credits'),items=[...credits.children];return items.length===2&&items[0].textContent.includes('1K')&&/Minecraft/i.test(items[0].textContent)&&items[1].textContent.includes('3K+')&&/Terraria/i.test(items[1].textContent)&&!credits.querySelector('a')})()`));
  await shot("05-about");
  await go("contact");
  check("contact module preserves email and social IDs", await evaluate(`document.querySelector('.contact').offsetWidth>0 && document.querySelector('.contact a[href="mailto:yuandy24@icloud.com"]') && document.querySelectorAll('[data-copy-contact]').length===4`));
  await shot("06-contact");

  await click("#sfx-toggle");
  const silentBefore = await evaluate(`window.__qa.sounds.length`);
  await evaluate(`document.querySelector('[data-nav="projects"]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}))`);
  await sleep(100);
  check("SFX can be disabled while BGM remains enabled", await evaluate(`window.__qa.sounds.length===${silentBefore} && document.querySelector('#sfx-toggle').getAttribute('aria-pressed')==='false' && document.querySelector('#bgm-toggle').getAttribute('aria-pressed')==='true'`));
  await click("#bgm-toggle");
  check("BGM can be disabled independently", await evaluate(`document.querySelector('#bgm-toggle').getAttribute('aria-pressed')==='false'`));
  const loopsBefore = await evaluate(`window.__qa.sounds.filter(s=>s.loop).length`);
  await click("#bgm-toggle");
  await wait(`window.__qa.sounds.filter(s=>s.loop).length>${loopsBefore}`);
  check("BGM restarts while SFX stays off", await evaluate(`document.querySelector('#sfx-toggle').getAttribute('aria-pressed')==='false'`));
  await click("#sfx-toggle");
  await click("#system-open");
  await wait(`document.querySelector('#system-dialog').open && !document.querySelector('.system-content').inert`);
  check("settings isolate the site", await evaluate(`document.querySelector('#site').inert && document.querySelector('#system-open').getAttribute('aria-expanded')==='true'`));
  await click('#system-dialog [data-language="en"]');
  await wait(`document.documentElement.lang==='en'`);
  check("language changes preserve the open settings surface", await evaluate(`document.querySelector('#system-dialog').open && document.querySelector('#site').inert`));
  for (const theme of ["duotone", "mono", "halftone"]) {
    await click(`#system-dialog [data-treatment="${theme}"]`);
    check(`${theme} theme updates the interface`, await evaluate(`document.body.dataset.treatment==='${theme}'`));
  }
  await shot("08-settings-en");
  await click("#system-close");
  await wait(`!document.querySelector('#system-dialog').open && !document.querySelector('#site').inert`);
  await go("projects");
  check("project selection survives language changes", await evaluate(`document.querySelector('#project-repository').href.includes('spectral-corruptor-plugin') && document.querySelector('#project-image').naturalWidth>0`));
  await evaluate(`for(const view of ['overview','contact','projects'])document.querySelector('[data-nav="'+view+'"]').click()`);
  await wait(`document.querySelector('.shell').dataset.view==='projects' && !document.querySelector('.workspace').inert`);
  check("rapid module changes settle on the latest selection", true);

  for (const width of [390, 320]) {
    await viewport(width, width === 390 ? 844 : 740);
    for (const view of ["projects", "overview", "contact"]) {
      await go(view);
      check(`${view} has no horizontal overflow at ${width}px`, await evaluate(`document.documentElement.scrollWidth<=${width + 1}`), `width=${await evaluate('document.documentElement.scrollWidth')}`);
    }
    await go("projects");
    await evaluate(`document.querySelector('#project-list').scrollIntoView({block:'start',behavior:'instant'})`);
    await shot(`09-mobile-${width}`);
    await click("#system-open");
    await wait(`document.querySelector('#system-dialog').open && !document.querySelector('.system-content').inert`);
    check(`settings fit the ${width}px viewport`, await evaluate(`(()=>{const d=document.querySelector('#system-dialog').getBoundingClientRect(), c=document.querySelector('.system-content');return d.left>=0&&d.right<=innerWidth+1&&d.top>=0&&d.bottom<=innerHeight+1&&c.scrollWidth<=c.clientWidth+1})()`));
    await click("#system-close");
    await wait(`!document.querySelector('#system-dialog').open`);
  }

  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await cdp.send("Page.reload");
  await wait(`document.querySelector('#enter-en') && !document.querySelector('#enter-en').disabled`, 60000, "reduced-motion readiness");
  await click("#enter-en");
  await wait(`document.querySelector('#boot').hidden`, 10000);
  check("English entry works with reduced motion", await evaluate(`document.documentElement.lang==='en' && document.querySelector('.shell').dataset.view==='projects'`));
  await go("overview");
  check("reduced motion settles navigation immediately", await evaluate(`!document.querySelector('.workspace').inert && !document.querySelector('.shell').classList.contains('reconfiguring')`));
  check("English profile preserves the updated identity and achievements", await evaluate(`(()=>{const b=document.querySelector('.biography'),credits=b.querySelector('.profile-credits');return b.textContent.includes('Andy Yu')&&/Jinan University/i.test(b.textContent)&&credits.children.length===2&&/Minecraft/i.test(credits.textContent)&&/Terraria/i.test(credits.textContent)})()`));
  await shot("10-mobile-reduced-motion");
  const pageErrors = await evaluate(`window.__qa.errors`);
  check("no uncaught browser errors", errors.length === 0 && pageErrors.length === 0, [...errors, ...pageErrors].slice(0, 4).join(" | "));
  check("no failed asset requests", badResponses.length === 0, badResponses.slice(0, 4).join(" | "));
  writeFileSync(join(OUT, "results.json"), JSON.stringify({ url: BASE, results, errors, badResponses }, null, 2));
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(`QA failed: ${error.stack || error.message}`);
  if (errors.length) console.error("Browser errors:", errors);
  if (badResponses.length) console.error("Failed responses:", badResponses);
  writeFileSync(join(OUT, "results.json"), JSON.stringify({ url: BASE, results, errors, badResponses, failure: error.message }, null, 2));
  process.exitCode = 1;
}).finally(cleanup);
