import { chromium } from '/workspace/crypto-watch-app/node_modules/playwright-core/index.mjs';
const B='http://localhost:8787/';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const bad=[];
for (const [vp,name] of [[{width:1440,height:1000},'desktop'],[{width:390,height:844},'phone']]) {
const c=await b.newContext({viewport:vp,serviceWorkers:'block'}); const p=await c.newPage();
p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url())});
p.on('pageerror',e=>bad.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')bad.push('CE '+m.text().slice(0,200))});
await p.goto(B+'#/markets'); await p.waitForTimeout(5000);
const syms = name==='desktop'?['BTC','MON','HYPE','AAVE','LIT','SOL','NEAR','PENDLE']:['HYPE'];
for(const s of syms){ await p.click(`[data-sel="${s}"]`).catch(()=>bad.push('nosel '+s)); await p.waitForTimeout(800);
  for (const tab of ['lev','pos']) { await p.click(`[data-tab="${tab}"]`).catch(()=>bad.push('notab '+tab)); await p.waitForTimeout(5000); }
  for (const pt of ['fut','spot','chain']) { await p.click(`[data-potab="${pt}"]`).catch(()=>bad.push('nopotab')); await p.waitForTimeout(600);
    const txt=(await p.textContent('#poBody').catch(()=>''))||''; if(name==='desktop') console.log(s,pt,txt.replace(/\s+/g,' ').slice(0,420));
    if(s==='HYPE'||s==='AAVE'){ await p.locator('.pos').scrollIntoViewIfNeeded().catch(()=>{}); await p.screenshot({path:`shots/v38-pos-${name}-${s}-${pt}.png`,fullPage:false}); } } }
if(name==='desktop'){ await p.goto(B+'#/smart'); await p.waitForTimeout(7000); await p.screenshot({path:'shots/v38-smart-desktop.png'}); await p.click('[data-smsel="SOL"]').catch(()=>{}); await p.waitForTimeout(1500); console.log('SM', (await p.textContent('.smk')).replace(/\s+/g,' ').slice(0,300)); await p.screenshot({path:'shots/v38-smart-sol-desktop.png',fullPage:true});}
await c.close(); }
console.log('BAD\n'+bad.join('\n')); await b.close();
