// Weekly v1. Only complete UTC daily candles; current snapshots never become historical verdicts.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const DAY=864e5;
const iso=t=>new Date(t).toISOString();
export function period(now=Date.now()) {
  const d=new Date(now); const end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-((d.getUTCDay()+6)%7)*DAY;
  return {start:end-7*DAY,end,baseline:end-8*DAY};
}
export function measure(rows,p) {
  if(!Array.isArray(rows)) throw Error('Invalid candle response');
  const k=rows.filter(x=>x.t>=p.baseline&&x.t<p.end).sort((a,b)=>a.t-b.t);
  if(k.length!==8||k.some((x,i)=>x.t!==p.baseline+i*DAY||!['o','h','l','c'].every(z=>Number.isFinite(x[z])&&x[z]>0)||x.l>Math.min(x.o,x.c)||x.h<Math.max(x.o,x.c)||x.h<x.l)) throw Error('Need eight valid consecutive UTC daily candles, including prior Sunday');
  const week=k.slice(1),prior=k[0].c,high=Math.max(...week.map(x=>x.h)),low=Math.min(...week.map(x=>x.l)),close=k[7].c;
  return {status:'ok',w:(close/prior-1)*100,range_pct:(high-low)/prior*100,prior_close:prior,open:week[0].o,high,low,close,candles:k};
}
async function get(url,opt={}) {const r=await fetch(url,{...opt,signal:AbortSignal.timeout(18000),headers:{'user-agent':'KMS-Capital-weekly-v1','content-type':'application/json'}});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
export async function candles(src,p) {
  const start=p.baseline,end=p.end-1,pair=encodeURIComponent(src.pair);let r,url;
  if(src.ex==='binance') {url=`https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1d&startTime=${start}&endTime=${end}&limit=9`;r=await get(url);return {url,market:'spot',quote:'USDT',rows:r.map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4]}))};}
  if(src.ex==='bybit') {url=`https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=D&start=${start}&end=${end}&limit=9`;r=await get(url);if(r.retCode!==0)throw Error(r.retMsg);return {url,market:'spot',quote:'USDT',rows:r.result.list.map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4]}))};}
  if(src.ex==='okx') {url=`https://www.okx.com/api/v5/market/history-candles?instId=${pair}&bar=1Dutc&after=${p.end}&before=${start-1}&limit=9`;r=await get(url);if(r.code!=='0')throw Error(r.msg);return {url,market:'spot',quote:'USDT',rows:r.data.filter(x=>x[8]==='1').map(x=>({t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4]}))};}
  if(src.ex==='hyperliquid') {url='https://api.hyperliquid.xyz/info';r=await get(url,{method:'POST',body:JSON.stringify({type:'candleSnapshot',req:{coin:src.pair,interval:'1d',startTime:start,endTime:end}})});return {url,market:'perp',quote:'USD',rows:r.map(x=>({t:+x.t,o:+x.o,h:+x.h,l:+x.l,c:+x.c}))};}
  throw Error('Unsupported source');
}
export async function tokenRow(t,p,fetcher=candles) {
  const errors=[];
  for(const s of t.sources||[])try {const d=await fetcher(s,p);return {symbol:t.symbol,name:t.name,...measure(d.rows,p),source:{exchange:s.ex,pair:s.pair,market:d.market,quote:d.quote,url:d.url,observed_at:iso(Date.now())}};}catch(e){errors.push(`${s.ex}: ${e.message}`);}
  return {symbol:t.symbol,name:t.name,status:'unavailable',w:null,range_pct:null,reason:errors.join(' | ')||'No configured sources'};
}
export function fearHistory(data,p) {
  const rows=(Array.isArray(data)?data:[]).filter(x=>x&&x.value!==null&&x.value!==undefined&&x.value!==''&&Number.isFinite(+x.timestamp)).map(x=>({at:iso(+x.timestamp*1000),value:Number(x.value)})).filter(x=>Date.parse(x.at)>=p.start&&Date.parse(x.at)<p.end&&Number.isFinite(x.value)&&x.value>=0&&x.value<=100).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  // Do not substitute adjacent dates or treat a partial series as full-week endpoints.
  const complete=rows.length===7&&rows.every((x,i)=>Date.parse(x.at)===p.start+i*DAY);
  return {status:complete?'ok':'unavailable',observations:rows,first:complete?rows[0]:null,last:complete?rows[6]:null,source:'https://api.alternative.me/fng/?limit=0'};
}
export function catalysts(calendars,p) {
  const found=new Map(),start=p.end,end=start+7*DAY;
  for(const {data,file} of calendars)for(const e of data.events||[]) {
    if(!/^https:\/\//.test(e.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(e.date||''))continue;
    const at=e.time?Date.parse(`${e.date}T${e.time.padStart(5,'0')}:00+09:00`):Date.parse(`${e.date}T00:00:00Z`);
    if(!Number.isFinite(at)||at<start||at>=end)continue;
    const macro=(e.title||'').toLowerCase().match(/\b(cpi|ppi|fomc|jobs|nfp|payrolls|gdp|pce)\b/);
    const kind=macro?( /nfp|payrolls/.test(macro[0])?'jobs':macro[0]):(e.title||'').toLowerCase();
    const key=`${e.date}|${e.type}|${(e.tokens||[]).join(',')}|${kind}`;
    if(found.has(key)||e.type==='unlock'&&[...found.values()].some(x=>x.type==='unlock'&&x.date===e.date&&x.tokens.some(t=>(e.tokens||[]).includes(t))))continue;
    found.set(key,{date:e.date,...(e.time?{at:iso(at)}:{}),date_zone:e.time?null:'Asia/Tokyo',title:e.title,th:{title:e.th_title||e.th?.title||''},tokens:e.tokens||[],type:e.type,url:e.url,calendar_file:file,snapshot_at:data.updated||null,source_observed_at:data.sources?.[e.src]?.at||data.updated||null});
  }
  return [...found.values()].sort((a,b)=>(a.at||a.date).localeCompare(b.at||b.date));
}
export function validateReport(r) {
  const p=r.period;
  if(!p||![p.start,p.end,p.baseline].every(Number.isFinite)||p.end-p.start!==7*DAY||p.start-p.baseline!==DAY||new Date(p.end).getUTCDay()!==1||p.end%DAY!==0||!Number.isFinite(Date.parse(r.generated))||Date.parse(r.generated)<p.end||r.to_monday!==iso(p.end).slice(0,10)||r.from!==iso(p.start).slice(0,10)||r.to!==iso(p.end-DAY).slice(0,10))throw Error('Invalid closed-week boundary');
  if(r.schema!==1||!Array.isArray(r.watchlist)||!r.watchlist.length||r.watchlist.length!==r.performance?.length||new Set(r.watchlist.map(x=>x.symbol)).size!==r.watchlist.length)throw Error('Invalid watchlist membership');
  for(const [i,row] of r.performance.entries()) {
    if(row.symbol!==r.watchlist[i].symbol)throw Error('Watchlist order mismatch');
    if(row.status==='ok') {const m=measure(row.candles,r.period);if(!row.source?.url||['w','range_pct','open','high','low','close','prior_close'].some(k=>!Number.isFinite(row[k])||Math.abs(row[k]-m[k])>1e-9))throw Error('Invalid performance math/source');}
    else if(row.status!=='unavailable'||row.w!==null||row.range_pct!==null)throw Error('Missing is not zero');
  }
  return r;
}
export function publish(r,dir) {
  validateReport(r);fs.mkdirSync(dir,{recursive:true});const file=`weekly-v1-${r.to_monday}.json`,dest=path.join(dir,file);
  // Exclusive create protects the immutable archive. Recovery may repair only its index entry.
  if(!fs.existsSync(dest))fs.writeFileSync(dest,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
  const saved=validateReport(JSON.parse(fs.readFileSync(dest))),ip=path.join(dir,'index.json');
  const idx=fs.existsSync(ip)?JSON.parse(fs.readFileSync(ip)):{reports:[]};
  if(!idx.reports.some(x=>x.file===file)) {idx.reports.unshift({file,week:`${saved.from} – ${saved.to}`,schema:1});fs.writeFileSync(ip+'.tmp',JSON.stringify(idx,null,2)+'\n');fs.renameSync(ip+'.tmp',ip);}
  return file;
}
async function main() {
  const now=Date.now(),p=period(now),dir='reports',monday=iso(p.end).slice(0,10),existing=path.join(dir,`weekly-v1-${monday}.json`);
  if(fs.existsSync(existing)){console.log('Archived report unchanged:',publish(JSON.parse(fs.readFileSync(existing)),dir));return;}
  const watchlist=JSON.parse(fs.readFileSync('tokens.json')).tokens;
  const performance=await Promise.all(watchlist.map(t=>tokenRow(t,p)));
  if(!performance.some(x=>x.status==='ok'))throw Error('No usable token candles; refusing empty report');
  let fg;try{fg=fearHistory((await get('https://api.alternative.me/fng/?limit=0')).data,p);}catch(e){fg={status:'unavailable',observations:[],first:null,last:null,error:e.message,source:'https://api.alternative.me/fng/?limit=0'};}
  fg.observed_at=iso(Date.now());
  const calendars=['calendar.json','calendar_auto.json'].map(file=>{try{return {file,data:JSON.parse(fs.readFileSync(file))};}catch{return {file,data:{events:[]}};}});
  const ok=performance.filter(x=>x.status==='ok').sort((a,b)=>b.w-a.w),first=ok[0],last=ok.at(-1),n=ok.length;
  const r={schema:1,period:p,from:iso(p.start).slice(0,10),to:iso(p.end-DAY).slice(0,10),to_monday:monday,generated:iso(Date.now()),watchlist,performance,fear_greed:fg,ahead:catalysts(calendars,p),calendar_snapshots:calendars.map(x=>({file:x.file,updated:x.data.updated||null})),title:`Weekly review: ${iso(p.start).slice(0,10)} – ${iso(p.end-DAY).slice(0,10)} (UTC)`,summary:[`${n}/${watchlist.length} tracked tokens have complete, verified candle windows. The archive records the shared watchlist at generation, not each viewer's personal list.`,`${first.symbol} had the highest verified weekly return (${first.w.toFixed(1)}%); ${last.symbol} had the lowest (${last.w.toFixed(1)}%). Relative ranking does not mean a positive return.`, 'Historical weekly statistics, not current quotes or trading signals. Calendar events reflect their dated snapshot, not knowledge frozen at the week close.'],th:{title:`สรุปสัปดาห์ ${iso(p.start).slice(0,10)} ถึง ${iso(p.end-DAY).slice(0,10)} (UTC)`,summary:[`มีข้อมูลแท่งราคาครบ ${n} จาก ${watchlist.length} เหรียญ ใช้รายชื่อที่ติดตามร่วมกัน ณ วันที่จัดทำ ไม่ใช่ลิสต์ส่วนตัวของแต่ละคน`,`${first.symbol} ให้ผลตอบแทนสูงสุดในกลุ่มที่ข้อมูลครบ (${first.w.toFixed(1)}%) ส่วน ${last.symbol} ต่ำสุด (${last.w.toFixed(1)}%) อันดับสูงสุดไม่ได้แปลว่าราคาเป็นบวกเสมอไป`,'ตัวเลขเป็นสถิติของสัปดาห์ที่จบแล้ว ไม่ใช่ราคาปัจจุบันหรือสัญญาณเทรด กำหนดการอิง snapshot ตามวันที่ระบุ ไม่ใช่ข้อมูลที่รู้ ณ วันปิดสัปดาห์']}};
  console.log('Published archive file',publish(r,dir));console.log(performance.map(x=>({symbol:x.symbol,status:x.status,w:x.w,range:x.range_pct,source:x.source?.exchange,reason:x.reason})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e);process.exitCode=1;});
