// Regression tests for missing MA history. Synthetic fixtures, never market results.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s = fs.readFileSync('app.js','utf8');
// v54: the indicators and the verdict rule live in verdict-core.js (shared with the builders); app.js wraps compute with closedOnly.
const core = s.slice(s.indexOf('const { sma'), s.indexOf('/* ---------- data loading ---------- */'));
const localized = s.slice(s.indexOf('function biasWhyL('), s.indexOf('const LC ='));
const ctx = { LANG:'en' }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('verdict-core.js','utf8'), ctx);
vm.runInContext(core + localized + ';this.calc=compute;this.why=biasWhy;this.whyL=biasWhyL;', ctx);
const fixture = (n) => ({ d1:Array.from({length:n},(_,i)=>({c:500-i,h:502-i,l:498-i,q:100})), price:500-n });
for (const n of [90,199]) {
 const t=fixture(n);t.I=ctx.calc(t);
 assert.equal(t.I.plan.bias,'Insufficient',`missing MA200 at ${n} must not produce a trade verdict`);
 assert.equal(t.I.trend,'Insufficient');
 assert.match(ctx.why(t),/insufficient|not enough/i);
 assert.doesNotMatch(ctx.why(t),/above its 200/);
 ctx.LANG='th';assert.match(ctx.whyL(t),/ข้อมูลไม่พอ/);assert.doesNotMatch(ctx.whyL(t),/อยู่เหนือเส้น 200/);ctx.LANG='en';
}
const complete=fixture(250);complete.I=ctx.calc(complete);assert.equal(complete.I.plan.bias,'Avoid');
assert.equal(complete.I.plan.ready,true);
console.log('PASS missing-history EN/TH and complete-history Avoid regression');
for (const n of [15,49,50,90,199,200,250,300]) {
 const t=fixture(n);t.I=ctx.calc(t);
 if(n<200) {assert.equal(t.I.plan.ready,false);assert.equal(t.I.plan.bias,'Insufficient');}
 else {const I=t.I,P=I.plan,p=t.price; const up=p>I.ma200,dn=p<I.ma50&&!up;const b=dn?'Avoid':up&&I.hist>0&&P.tps[0].rr>=1.5&&p<=P.entry[1]*1.03?'Long':'Wait';assert.equal(P.bias,b);}
}
for(const bad of [NaN,Infinity,0,-1,'100']) {const t=fixture(250);t.price=bad;assert.throws(()=>ctx.calc(t),/Invalid price/);}
const corrupt=fixture(250);corrupt.d1[240].c=null;assert.throws(()=>ctx.calc(corrupt),/malformed/);
const rising={d1:Array.from({length:250},(_,i)=>({c:100+i,h:102+i,l:98+i,q:100})),price:349};rising.I=ctx.calc(rising);assert.equal(rising.I.plan.ready,true);assert.notEqual(rising.I.plan.bias,'Insufficient');
console.log('PASS short/complete history, invalid prices/candles and rising-market input');
