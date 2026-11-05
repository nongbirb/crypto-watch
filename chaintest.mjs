import { chromium } from '/workspace/crypto-watch-app/node_modules/playwright-core/index.mjs';
const B='http://localhost:8787/';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}); const bad=[];
for (const [vp,name] of [[{width:1440,height:1000},'desktop'],[{width:390,height:844},'phone']]) {
const c=await b.newContext({viewport:vp,serviceWorkers:'block'}); const p=await c.newPage();
p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});
p.on('pageerror',e=>bad.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')bad.push('CE '+m.text().slice(0,200))});
await p.goto(B+'#/markets'); await p.waitForTimeout(5000);
for(const s of ['AAVE','PENDLE','LIT']){ await p.click(`[data-sel="${s}"]`); await p.waitForTimeout(800);
  await p.click('[data-tab="pos"]'); await p.waitForTimeout(4000); await p.click('[data-potab="chain"]'); await p.waitForSelector('#poBody .pogrid',{timeout:20000}).catch(()=>bad.push('nochain '+s)); await p.waitForTimeout(500);
  await p.locator('.pos').scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.locator('.pos').screenshot({path:`shots/v38-chain-${name}-${s}.png`});
  await p.click('[data-tab="pat"]').catch(()=>bad.push('nopat')); await p.waitForTimeout(6000);
  if(s==='AAVE'){ console.log(name,'PAT',((await p.textContent('main').catch(()=>''))||'').match(/\d+% \(\d+\/\d+\)|not enough history[^·]{0,12}/g)?.slice(0,6)); await p.screenshot({path:`shots/v38-patterns-${name}-AAVE.png`,fullPage:true}); } }
await c.close(); }
console.log('BAD\n'+bad.join('\n')); await b.close();
