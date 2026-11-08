// Real network data, with an explicitly isolated short-history regression injection.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const B=process.env.U||'http://localhost:8787/',D=process.env.SHOT||'/workspace/v46_preview';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const [name,viewport,lang] of [['desktop',{width:1440,height:1000},'en'],['phone',{width:390,height:844},'th']]) {
 const c=await b.newContext({viewport,serviceWorkers:'block'}),p=await c.newPage(),errors=[];
 await p.addInitScript(l=>localStorage.setItem('cw-lang',l),lang);
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(B+'#/markets');await p.waitForFunction(()=>S.cfg.every(t=>t.I||t.err),null,{timeout:60000});
 console.log(name,'real inputs',await p.evaluate(()=>S.cfg.map(t=>({symbol:t.symbol,bars:t.d1?.length,bias:t.I?.plan.bias,ma200:t.I?.ma200,price:t.price,error:t.err}))));
 await p.screenshot({path:`${D}/p1-${name}-markets.png`,fullPage:false});
 const injection=await p.evaluate(()=>{
  const t=S.cfg.find(t=>t.I&&t.d1.length>=200);if(!t)throw new Error('No complete input for regression');
  const original={d1:t.d1,I:t.I};t.d1=t.d1.slice(-90);t.I=compute(t);S.sel=t.symbol;renderOverview();renderDetail();
  const r={symbol:t.symbol,bias:t.I.plan.bias,ready:t.I.plan.ready,text:document.querySelector('#planBox').textContent,levels:document.querySelector('#planBox .lv')!==null,entry:document.querySelector(`#ovSec [data-sel="${t.symbol}"]`).children[9].textContent};
  t.d1=original.d1;t.I=original.I;renderOverview();renderDetail();return r;
 });
 assert.equal(injection.bias,'Insufficient');assert.equal(injection.ready,false);assert.equal(injection.levels,false);assert.equal(injection.entry,'–');
 assert.match(injection.text,lang==='th'?/ข้อมูลไม่พอ/:/Insufficient data/);
 const help=p.locator('#ovSec .ui-help summary').first();await help.click();assert.equal(await p.locator('#ovSec .ui-help[open]').count(),1);await p.keyboard.press('Escape');assert.equal(await p.locator('#ovSec .ui-help[open]').count(),0);
 for(const tab of ['pat','lev','pos']) {await p.locator(`[data-tab="${tab}"]`).click();await p.waitForFunction(()=>document.querySelector('#tabBody')?.textContent.trim().length>20,null,{timeout:30000});assert.ok((await p.locator('#tabBody').innerText()).length>20,`${tab} blank`);}
 await p.goto(B+'#/narrative');await p.waitForFunction(()=>NX.d?.editions?.[0]?.id==='2026-11-09-am',{timeout:20000});
 assert.equal(await p.locator('.n-overdue').count(),0);assert.ok((await p.locator('.nmeta').innerText()).length>10);
 const mentions=await p.locator('.nment').allTextContents();console.log(name,'mention deltas',mentions);assert.ok(mentions.length>0&&mentions.every(t=>/[+−-]/.test(t)));
 await p.evaluate(()=>{NX.d.editions[0].generated_at='2026-11-05T20:10:47+09:00';pNarrative(true);});assert.equal(await p.locator('.n-overdue').count(),1);
 assert.match(await p.locator('.n-overdue').innerText(),lang==='th'?/ฉบับใหม่ยังไม่มา/:/overdue/);
 await p.screenshot({path:`${D}/p1-${name}-overdue-test.png`,fullPage:false});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Narrative page overflow');
 assert.deepEqual(errors,[]);await c.close();
}
await b.close();console.log('PASS real-data rendering, simulated missing history, tap/keyboard help, subtabs and overdue notice');
