import { chromium } from 'playwright-core';
const B='http://localhost:8787/';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const p=await c.newPage(); const bad=[];
p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.request().method()+' '+r.url()+' '+(r.request().postData()||'').slice(0,200))});
p.on('requestfailed',r=>bad.push('FAIL '+r.url()+' '+r.failure()?.errorText));
p.on('console',m=>{if(m.type()==='error')bad.push('CE '+m.text().slice(0,200))});
await p.goto(B+'#/markets'); await p.waitForTimeout(6000);
for(const s of ['BTC','MON','HYPE','AAVE','LIT','SOL','NEAR','PENDLE']){ await p.click(`[data-sel="${s}"]`).catch(e=>bad.push('nosel '+s)); await p.waitForTimeout(3500);}
await p.goto(B+'#/smart'); await p.waitForTimeout(8000);
for(const s of ['BTC','MON','HYPE','AAVE','LIT','SOL','NEAR','PENDLE']){ await p.click(`[data-smsel="${s}"]`).catch(e=>bad.push('nosm '+s)); await p.waitForTimeout(3000);}
for(const r of ['onchain/chains','onchain/flows','onchain/health','screener','calendar','journal','reports','learn','watchlist','settings']){await p.goto(B+'#/'+r);await p.waitForTimeout(2500);}
console.log(bad.join('\n')); await b.close();
