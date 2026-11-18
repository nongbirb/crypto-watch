/* v66 Learn tab: short lessons with an example drawn from real candles (the app's own closed daily candles of BTC / ETH / SOL /
   HYPE), a reading written from today's numbers, a common trap, one quick check and a link into the tool. Search covers the
   lessons and the glossary. Progress (a correct quick check) is kept in localStorage cw-learn. Deep link: #/learn/<lesson id>. */
'use strict';
const LN_TOK = ['BTC', 'ETH', 'SOL', 'HYPE'];
const LN = { q: '', lvl: 'all', tok: 'BTC', open: null };
const lnDone = () => { try { return JSON.parse(localStorage.getItem('cw-learn') || '{}'); } catch (e) { return {}; } };
const lnSetDone = (id) => { const d = lnDone(); d[id] = 1; try { localStorage.setItem('cw-learn', JSON.stringify(d)); } catch (e) {} };
const lnDay = (t) => new Date(t).toLocaleDateString(loc(), { month: 'short', day: 'numeric' });
const lnCol = { up: '#16a34a', dn: '#e5484d', ma20: '#38bdf8', ma50: '#f59e0b', ma200: '#a78bfa', sig: '#f59e0b', acc: '#3b82f6', fib: '#a78bfa' };

/* ---------- a small SVG chart: candles + overlays + an optional lower pane ---------- */
function lnChart(k, o = {}) {
  const W = 640, PH = o.sub ? 190 : 230, SH = o.sub ? 80 : 0, G = o.sub ? 14 : 0, H = PH + G + SH, n = k.length, bw = W / n;
  const vals = k.flatMap((x) => [x.h, x.l]).concat(...(o.lines || []).map((l) => l.v.filter((v) => v != null)), ...(o.hl || []).map((h) => h.p));
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
  const y = (v) => ((hi - v) / (hi - lo)) * PH, x = (i) => (i + 0.5) * bw;
  let s = '';
  if (o.vol) { const mv = Math.max(...k.map((c) => c.v || 0), 1); s += k.map((c, i) => `<rect x="${(x(i) - bw * 0.35).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" y="${(PH - (c.v / mv) * PH * 0.28).toFixed(1)}" height="${((c.v / mv) * PH * 0.28).toFixed(1)}" fill="${c.c >= c.o ? lnCol.up : lnCol.dn}" opacity="${o.volHi === i ? 0.9 : 0.25}"/>`).join(''); }
  (o.hl || []).forEach((h) => { s += `<line x1="0" x2="${W}" y1="${y(h.p).toFixed(1)}" y2="${y(h.p).toFixed(1)}" stroke="${h.c}" stroke-width="1" stroke-dasharray="${h.dash || '4 3'}" opacity=".9"/><text x="${W - 4}" y="${(y(h.p) - 3).toFixed(1)}" text-anchor="end" class="ln-tx" fill="${h.c}">${esc(h.label)}</text>`; });
  s += k.map((c, i) => { const up = c.c >= c.o, col = up ? lnCol.up : lnCol.dn, hl = (o.mark || []).find((m) => m.i === i);
    return `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${y(c.h).toFixed(1)}" y2="${y(c.l).toFixed(1)}" stroke="${col}" stroke-width="1"/><rect x="${(x(i) - bw * 0.33).toFixed(1)}" width="${(bw * 0.66).toFixed(1)}" y="${y(Math.max(c.o, c.c)).toFixed(1)}" height="${Math.max(1, Math.abs(y(c.o) - y(c.c))).toFixed(1)}" fill="${col}"${hl ? ' stroke="currentColor" stroke-width="1.5"' : ''}/>`; }).join('');
  (o.lines || []).forEach((l) => { const pts = l.v.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' '); if (pts) s += `<polyline points="${pts}" fill="none" stroke="${l.c}" stroke-width="1.6"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''}/>`; });
  (o.mark || []).forEach((m) => { const c = k[m.i], top = m.below ? y(c.l) + 14 : y(c.h) - 8; s += `<text x="${x(m.i).toFixed(1)}" y="${top.toFixed(1)}" text-anchor="${m.i > n * 0.8 ? 'end' : m.i < n * 0.2 ? 'start' : 'middle'}" class="ln-tx b" fill="currentColor">${esc(m.label)}</text>`; });
  if (o.sub) { const S_ = o.sub, sy = (v) => PH + G + ((S_.hi - v) / (S_.hi - S_.lo)) * SH;
    s += `<rect x="0" y="${PH + G}" width="${W}" height="${SH}" fill="currentColor" opacity=".035"/>`;
    (S_.bands || []).forEach((b) => { s += `<line x1="0" x2="${W}" y1="${sy(b).toFixed(1)}" y2="${sy(b).toFixed(1)}" stroke="currentColor" stroke-dasharray="3 3" opacity=".35"/><text x="3" y="${(sy(b) - 2).toFixed(1)}" class="ln-tx" fill="currentColor" opacity=".6">${b}</text>`; });
    if (S_.hist) s += S_.hist.map((v, i) => (v == null ? '' : `<rect x="${(x(i) - bw * 0.3).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" y="${Math.min(sy(v), sy(0)).toFixed(1)}" height="${Math.abs(sy(v) - sy(0)).toFixed(1)}" fill="${v >= 0 ? lnCol.up : lnCol.dn}" opacity=".45"/>`)).join('');
    S_.series.forEach((l) => { const pts = l.v.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${sy(Math.max(S_.lo, Math.min(S_.hi, v))).toFixed(1)}`)).filter(Boolean).join(' '); if (pts) s += `<polyline points="${pts}" fill="none" stroke="${l.c}" stroke-width="1.5"/>`; });
    s += `<text x="${W - 3}" y="${PH + G + 11}" text-anchor="end" class="ln-tx" fill="currentColor" opacity=".7">${esc(S_.name)}</text>`; }
  const d0 = lnDay(k[0].t), d1 = lnDay(k[n - 1].t);
  return `<figure class="ln-fig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}" preserveAspectRatio="none">${s}</svg>
    <figcaption><span>${esc(d0)}</span>${(o.key || []).map(([c, l]) => `<span class="ln-key"><i style="background:${c}"></i>${esc(l)}</span>`).join('')}<span>${esc(d1)}</span></figcaption></figure>`;
}
const lnTail = (a, n) => a.slice(-n);
function lnCalc(k) { return typeof pcCalc === 'function' ? pcCalc(k) : null; }

/* ---------- lessons ---------- */
// each: id, lvl b|i, title/why/steps/trap {en, th}, ex(k, C, T) -> {html, read:{en, th}} or null, q: {en, th} [question, options, correct, why], go: [hash, en, th]
const LESSONS = [
  { id: 'candles', lvl: 'b', t: ['Candles: reading one day of price', 'แท่งเทียน: อ่านราคาหนึ่งวัน'],
    why: ['Every chart in the app is made of candles. One candle = one period: where price opened, how high and low it went, and where it closed.', 'กราฟทุกอันในแอปสร้างจากแท่งเทียน หนึ่งแท่ง = หนึ่งช่วงเวลา บอกราคาเปิด สูงสุด ต่ำสุด และราคาปิด'],
    steps: [['Green body: closed above its open (buyers won the day). Red: closed below.', 'Wicks (thin lines) show how far price went and came back.', 'Long wick at the bottom = sellers pushed down but buyers bought it back.'],
      ['ตัวแท่งสีเขียว: ปิดสูงกว่าราคาเปิด (ฝั่งซื้อชนะวันนั้น) สีแดง: ปิดต่ำกว่า', 'ไส้เทียน (เส้นบาง) บอกว่าราคาไปถึงไหนแล้วถูกดึงกลับ', 'ไส้ยาวด้านล่าง = มีแรงขายกดลง แต่ฝั่งซื้อรับกลับขึ้นมาได้']],
    trap: ['One candle means little on its own. Read it with the few before it and with volume.', 'แท่งเดียวบอกอะไรได้น้อย ต้องดูคู่กับแท่งก่อนหน้าและวอลุ่ม'],
    ex: (k, C, T) => { const a = lnTail(k, 40), ch = a.map((c) => (c.c / c.o - 1) * 100), u = ch.indexOf(Math.max(...ch)), d = ch.indexOf(Math.min(...ch));
      return { html: lnChart(a, { mark: [{ i: u, label: pct(ch[u], 1) }, { i: d, label: pct(ch[d], 1), below: true }], aria: `${T} last 40 daily candles` }),
        read: [`${T}, last 40 days: the biggest green day was ${lnDay(a[u].t)} (${pct(ch[u], 1)} open to close), the biggest red day ${lnDay(a[d].t)} (${pct(ch[d], 1)}).`, `${T} 40 วันล่าสุด: วันเขียวแรงสุดคือ ${lnDay(a[u].t)} (${pct(ch[u], 1)} จากเปิดถึงปิด) วันแดงแรงสุดคือ ${lnDay(a[d].t)} (${pct(ch[d], 1)})`] }; },
    q: [['A candle has a small red body and a long lower wick. What happened?', ['Price only went down all day', 'Sellers pushed price down, but buyers bought much of it back', 'Nothing traded'], 1, 'The wick shows the low; the close came back up near the open.'],
      ['แท่งมีตัวแดงเล็ก ไส้ล่างยาว แปลว่าอะไร', ['ราคาลงอย่างเดียวทั้งวัน', 'มีแรงขายกดลง แต่ฝั่งซื้อรับกลับขึ้นมาได้มาก', 'ไม่มีการซื้อขาย'], 1, 'ไส้ล่างคือจุดต่ำสุด แต่ราคาปิดกลับขึ้นมาใกล้ราคาเปิด']],
    go: ['#/markets', 'Open the Price tab', 'เปิดแท็บราคา'] },
  { id: 'trend', lvl: 'b', t: ['Trend with moving averages', 'ดูเทรนด์ด้วยเส้นค่าเฉลี่ย'],
    why: ['A moving average smooths price into a line. Price above a rising line = uptrend; below a falling line = downtrend.', 'เส้นค่าเฉลี่ยทำให้ราคาเรียบเป็นเส้นเดียว ราคาอยู่เหนือเส้นที่ชี้ขึ้น = ขาขึ้น อยู่ใต้เส้นที่ชี้ลง = ขาลง'],
    steps: [['MA200 (about 7 months): the long-term trend. Above it = the bigger picture is up.', 'MA50 (about a quarter): the medium trend.', 'MA50 crossing above MA200 is called a golden cross; below, a death cross.'],
      ['MA200 (ราว 7 เดือน): เทรนด์ระยะยาว ราคาอยู่เหนือ = ภาพใหญ่ยังขึ้น', 'MA50 (ราว 1 ไตรมาส): เทรนด์ระยะกลาง', 'MA50 ตัดขึ้นเหนือ MA200 เรียกว่า Golden cross ตัดลงเรียกว่า Death cross']],
    trap: ['Averages lag. By the time a cross happens, much of the move is often done. Use them for direction, not timing.', 'เส้นค่าเฉลี่ยตามหลังราคาเสมอ กว่าจะตัดกัน ราคามักวิ่งไปเยอะแล้ว ใช้ดูทิศทาง ไม่ใช่จับจังหวะ'],
    ex: (k, C, T) => { const n = Math.min(120, C.ma200.filter((v) => v != null).length), a = lnTail(k, n), m50 = lnTail(C.ma50, n), m200 = lnTail(C.ma200, n), p = a[n - 1].c, M2 = m200[n - 1], M5 = m50[n - 1];
      if (n < 30 || M2 == null) return null; let x = -1; for (let i = n - 1; i > 0; i--) if (m50[i] != null && m200[i] != null && m50[i - 1] != null && m200[i - 1] != null && (m50[i] > m200[i]) !== (m50[i - 1] > m200[i - 1])) { x = i; break; }
      const up = p > M2, gx = M5 > M2;
      return { html: lnChart(a, { lines: [{ v: m50, c: lnCol.ma50 }, { v: m200, c: lnCol.ma200 }], mark: x >= 0 ? [{ i: x, label: gx ? 'golden ×' : 'death ×', below: !gx }] : [], key: [[lnCol.ma50, 'MA50'], [lnCol.ma200, 'MA200']], aria: `${T} ${n} days with MA50 and MA200` }),
        read: [`${T} closed at ${px(p)}, ${pct((p / M2 - 1) * 100, 1)} ${up ? 'above' : 'below'} its MA200 (${px(M2)}): the long-term trend is ${up ? 'up' : 'down'}. MA50 is ${gx ? 'above' : 'below'} MA200${x >= 0 ? `, since the ${gx ? 'golden' : 'death'} cross on ${lnDay(a[x].t)}` : ''}.`,
          `${T} ปิดที่ ${px(p)} ${up ? 'สูงกว่า' : 'ต่ำกว่า'} MA200 (${px(M2)}) อยู่ ${pct((p / M2 - 1) * 100, 1)} เทรนด์ระยะยาวเป็น${up ? 'ขาขึ้น' : 'ขาลง'} MA50 อยู่${gx ? 'เหนือ' : 'ใต้'} MA200${x >= 0 ? ` ตั้งแต่ ${gx ? 'Golden' : 'Death'} cross วันที่ ${lnDay(a[x].t)}` : ''}`] }; },
    q: [['Price is below a falling MA200. What does that usually say?', ['The long-term trend is down', 'A bounce is guaranteed', 'The trend is up'], 0, 'Below a falling long average = downtrend until price gets back above it.'],
      ['ราคาอยู่ใต้ MA200 ที่ชี้ลง มักแปลว่าอะไร', ['เทรนด์ระยะยาวเป็นขาลง', 'ต้องเด้งแน่นอน', 'เทรนด์เป็นขาขึ้น'], 0, 'อยู่ใต้เส้นค่าเฉลี่ยยาวที่ชี้ลง = ขาลง จนกว่าราคาจะกลับขึ้นไปยืนเหนือเส้นได้']],
    go: ['#/markets', 'See MA chips on the Price tab', 'ดูชิป MA ในแท็บราคา'] },
  { id: 'levels', lvl: 'b', t: ['Support and resistance', 'แนวรับและแนวต้าน'],
    why: ['Support is a price where buying showed up before; resistance is where selling did. Price often reacts there again.', 'แนวรับคือราคาที่เคยมีแรงซื้อเข้ามา แนวต้านคือราคาที่เคยมีแรงขาย ราคามักมีปฏิกิริยาที่จุดเดิมอีก'],
    steps: [['Find the recent highs and lows where price turned more than once.', 'The more touches, the more people watch that level.', 'A clean break with volume often flips it: old resistance becomes support.'],
      ['หาจุดสูงและจุดต่ำล่าสุดที่ราคากลับตัวมากกว่าหนึ่งครั้ง', 'ยิ่งแตะบ่อย ยิ่งมีคนจับตาระดับนั้นมาก', 'ถ้าทะลุชัดพร้อมวอลุ่ม มักสลับบทบาท แนวต้านเดิมกลายเป็นแนวรับ']],
    trap: ['Levels are zones, not exact prices. A wick through a level is not yet a break; wait for the close.', 'แนวรับแนวต้านเป็นโซน ไม่ใช่ราคาเป๊ะ ไส้เทียนทะลุยังไม่ใช่การเบรก ให้รอดูราคาปิด'],
    ex: (k, C, T) => { const a = lnTail(k, 90), H = Math.max(...a.map((c) => c.h)), L = Math.min(...a.map((c) => c.l)), p = a[a.length - 1].c;
      return { html: lnChart(a, { hl: [{ p: H, c: lnCol.dn, label: `${XL('resistance', 'แนวต้าน')} ${px(H)}` }, { p: L, c: lnCol.up, label: `${XL('support', 'แนวรับ')} ${px(L)}` }], aria: `${T} 90 days with range high and low` }),
        read: [`${T}, 90 days: the range is ${px(L)} to ${px(H)}. Price (${px(p)}) is ${pct((p / H - 1) * 100, 1)} from the top and ${pct((p / L - 1) * 100, 1)} from the bottom.`, `${T} 90 วัน: กรอบอยู่ที่ ${px(L)} ถึง ${px(H)} ราคาตอนนี้ (${px(p)}) ห่างจากด้านบน ${pct((p / H - 1) * 100, 1)} และจากด้านล่าง ${pct((p / L - 1) * 100, 1)}`] }; },
    q: [['Price wicks below support but closes back above it. Is support broken?', ['Yes, any touch below breaks it', 'Not yet: the close held above it', 'Support no longer matters'], 1, 'A break needs a close beyond the zone, ideally with volume.'],
      ['ไส้เทียนหลุดแนวรับ แต่ปิดกลับขึ้นมาเหนือแนว ถือว่าเบรกหรือยัง', ['เบรกแล้ว แตะต่ำกว่าก็นับ', 'ยังไม่เบรก เพราะราคาปิดยังยืนได้', 'แนวรับไม่มีความหมายแล้ว'], 1, 'การเบรกต้องปิดหลุดโซน และควรมีวอลุ่มยืนยัน']],
    go: ['#/markets', 'Open the Plan tab', 'เปิดแท็บแผนเทรด'] },
  { id: 'volume', lvl: 'b', t: ['Volume: how much conviction', 'วอลุ่ม: แรงหนุนของการเคลื่อนไหว'],
    why: ['Volume is how much traded. A move on big volume has many people behind it; on thin volume it fades easily.', 'วอลุ่มคือปริมาณที่ซื้อขาย การเคลื่อนไหวที่มีวอลุ่มสูงแปลว่ามีคนร่วมเยอะ ถ้าวอลุ่มบางก็มักไปได้ไม่ไกล'],
    steps: [['Compare today\'s bar with the recent average, not with zero.', 'Breakouts with rising volume are more trustworthy.', 'A volume spike after a long fall can mark capitulation (sellers giving up).'],
      ['เทียบแท่งวันนี้กับค่าเฉลี่ยช่วงหลัง ไม่ใช่เทียบกับศูนย์', 'การเบรกที่วอลุ่มเพิ่มขึ้นน่าเชื่อถือกว่า', 'วอลุ่มพุ่งหลังร่วงมานาน อาจเป็นจังหวะที่คนขายยอมแพ้ (capitulation)']],
    trap: ['Exchange volume varies by venue and can be inflated; compare a token with its own history.', 'วอลุ่มแต่ละกระดานต่างกันและอาจถูกปั่นได้ ให้เทียบกับประวัติของเหรียญเดียวกัน'],
    ex: (k, C, T) => { const a = lnTail(k, 60), vs = a.map((c) => c.v || 0), mi = vs.indexOf(Math.max(...vs)), avg = vs.reduce((s, v) => s + v, 0) / vs.length, chg = (a[mi].c / a[mi].o - 1) * 100;
      if (!(avg > 0)) return null;
      return { html: lnChart(a, { vol: true, volHi: mi, mark: [{ i: mi, label: `${(vs[mi] / avg).toFixed(1)}× vol` }], aria: `${T} 60 days with volume` }),
        read: [`${T}, 60 days: the heaviest day was ${lnDay(a[mi].t)} at ${(vs[mi] / avg).toFixed(1)}× the average, and price moved ${pct(chg, 1)} that day.`, `${T} 60 วัน: วันที่วอลุ่มหนาแน่นสุดคือ ${lnDay(a[mi].t)} สูงกว่าค่าเฉลี่ย ${(vs[mi] / avg).toFixed(1)} เท่า และราคาวันนั้นเปลี่ยน ${pct(chg, 1)}`] }; },
    q: [['Price breaks above resistance on the lowest volume of the month. How much do you trust it?', ['Fully, a break is a break', 'Less: few traders joined the move', 'Volume does not matter'], 1, 'Thin-volume breakouts fail more often.'],
      ['ราคาทะลุแนวต้าน แต่วอลุ่มต่ำสุดในรอบเดือน เชื่อได้แค่ไหน', ['เชื่อได้เต็มที่', 'เชื่อได้น้อยลง เพราะคนร่วมน้อย', 'วอลุ่มไม่เกี่ยว'], 1, 'การทะลุที่วอลุ่มบางมักล้มเหลวบ่อยกว่า']],
    go: ['#/markets', 'Turn on Volume in the Price tab', 'เปิดวอลุ่มในแท็บราคา'] },
  { id: 'risk', lvl: 'b', t: ['Risk first: stop-loss and position size', 'คุมความเสี่ยงก่อน: Stop-loss และขนาดไม้'],
    why: ['Decide how much you can lose before you buy. The stop-loss sets the loss per coin; your size sets the total.', 'ตัดสินใจก่อนซื้อว่ายอมเสียได้เท่าไร Stop-loss กำหนดการขาดทุนต่อเหรียญ ขนาดไม้กำหนดยอดรวม'],
    steps: [['Pick a stop where the idea is wrong (below support), not a random %.', 'Risk a small, fixed share of the account per trade (often 1%).', 'Size = money at risk ÷ distance from entry to stop.'],
      ['ตั้ง Stop ตรงจุดที่ไอเดียผิด (ใต้แนวรับ) ไม่ใช่ % สุ่มๆ', 'เสี่ยงต่อไม้เป็นสัดส่วนเล็กและคงที่ของพอร์ต (มักใช้ 1%)', 'ขนาดไม้ = เงินที่ยอมเสีย ÷ ระยะจากจุดเข้าถึง Stop']],
    trap: ['Leverage does not change the right size; it only changes how little margin you put down. A wide stop needs a smaller size.', 'เลเวอเรจไม่ได้เปลี่ยนขนาดไม้ที่ควรเป็น แค่ลดเงินที่วางเป็นมาร์จิ้น Stop ยิ่งกว้าง ไม้ยิ่งต้องเล็ก'],
    ex: (k, C, T) => { const a = lnTail(k, 30), p = a[a.length - 1].c, sl = Math.min(...a.slice(-14).map((c) => c.l)) * 0.995, acct = 1000, risk = acct * 0.01, dist = p - sl;
      if (!(dist > 0)) return null; const size = risk / dist * p;
      return { html: lnChart(a, { hl: [{ p, c: lnCol.acc, label: `${XL('entry', 'จุดเข้า')} ${px(p)}` }, { p: sl, c: lnCol.dn, label: `${XL('stop', 'Stop')} ${px(sl)}` }], aria: `${T} entry and stop` }) +
          `<div class="ln-calc"><div><span>${esc(XL('Account', 'พอร์ต'))}</span><b class="num">$1,000</b></div><div><span>${esc(XL('Risk 1%', 'เสี่ยง 1%'))}</span><b class="num">$10</b></div><div><span>${esc(XL('Entry → stop', 'จุดเข้า → Stop'))}</span><b class="num">${pct(-dist / p * 100, 1)}</b></div><div><span>${esc(XL('Position size', 'ขนาดไม้'))}</span><b class="num">$${size.toFixed(0)}</b></div></div>`,
        read: [`Buying ${T} at ${px(p)} with the stop just under the 14-day low (${px(sl)}) is a ${pct(-dist / p * 100, 1)} stop. Risking 1% of $1,000 ($10) means a position of about $${size.toFixed(0)}.`, `ถ้าซื้อ ${T} ที่ ${px(p)} และวาง Stop ใต้จุดต่ำ 14 วัน (${px(sl)}) ระยะ Stop คือ ${pct(-dist / p * 100, 1)} เสี่ยง 1% ของ $1,000 ($10) จึงซื้อได้ราว $${size.toFixed(0)}`] }; },
    q: [['Account $2,000, risk 1%, stop 5% below entry. Position size?', ['$400', '$100', '$2,000'], 0, '1% of $2,000 = $20; $20 ÷ 5% = $400.'],
      ['พอร์ต $2,000 เสี่ยง 1% Stop ห่าง 5% ควรซื้อเท่าไร', ['$400', '$100', '$2,000'], 0, '1% ของ $2,000 = $20 แล้ว $20 ÷ 5% = $400']],
    go: ['#/journal', 'Log a trade in the Journal', 'บันทึกเทรดใน Journal'] },
  { id: 'health', lvl: 'b', t: ['Market Health: the whole market at a glance', 'Market Health: ดูทั้งตลาดในหน้าเดียว'],
    why: ['One coin can rise while most fall. The map shows the top 100 coins at once: tile size = market cap (BTC capped at 20%), colour = change.', 'เหรียญเดียวขึ้นได้ทั้งที่ตลาดส่วนใหญ่ลง แผนที่แสดง 100 เหรียญใหญ่พร้อมกัน ขนาดช่อง = มาร์เก็ตแคป (BTC จำกัด 20%) สี = การเปลี่ยนแปลง'],
    steps: [['Mostly green = broad strength; a few big green tiles in a red map = a narrow rally.', 'The breadth bars count how many coins are up, flat and down.', 'The two gauges score spot demand and leverage heat from 0 to 100.'],
      ['เขียวเกือบทั้งแผนที่ = ตลาดแข็งแรงทั่วกัน ถ้ามีช่องใหญ่เขียวไม่กี่ช่องในแผนที่แดง = ขึ้นแบบกระจุก', 'แถบ Breadth นับว่ามีกี่เหรียญขึ้น ทรงตัว และลง', 'เกจสองอันให้คะแนนแรงซื้อ Spot และความร้อนของเลเวอเรจ 0 ถึง 100']],
    trap: ['A healthy market does not make every coin a buy; it raises the odds for setups that are already good.', 'ตลาดแข็งแรงไม่ได้แปลว่าทุกเหรียญน่าซื้อ แค่เพิ่มโอกาสให้เซ็ตอัปที่ดีอยู่แล้ว'],
    ex: null,
    q: [['BTC is up 3% but 80 of the top 100 coins are down. What is this?', ['A broad rally', 'A narrow move led by BTC', 'Nothing useful'], 1, 'Breadth is weak: most coins are not joining.'],
      ['BTC ขึ้น 3% แต่ 80 จาก 100 เหรียญใหญ่ลง แปลว่าอะไร', ['ตลาดขึ้นทั่วกัน', 'BTC นำขึ้นอยู่ตัวเดียว ตลาดส่วนใหญ่ไม่ตาม', 'ไม่มีความหมาย'], 1, 'Breadth อ่อน เหรียญส่วนใหญ่ไม่ได้ขึ้นตาม']],
    go: ['#/breadth', 'Open Market Health', 'เปิด Market Health'] },
  { id: 'rsi', lvl: 'i', t: ['RSI: is the move stretched?', 'RSI: ราคาวิ่งตึงไปหรือยัง'],
    why: ['RSI (14) scores recent gains against losses from 0 to 100. Above 70 = stretched up (overbought), below 30 = stretched down (oversold).', 'RSI (14) เทียบแรงขึ้นกับแรงลงช่วงหลังเป็นคะแนน 0 ถึง 100 เกิน 70 = ขึ้นตึง (Overbought) ต่ำกว่า 30 = ลงตึง (Oversold)'],
    steps: [['50 is the middle: above 50 buyers have the edge, below 50 sellers.', '70 / 30 warn that a move is stretched, not that it must reverse.', 'Divergence: price makes a new high but RSI does not = momentum fading.'],
      ['50 คือกึ่งกลาง เหนือ 50 ฝั่งซื้อได้เปรียบ ต่ำกว่า 50 ฝั่งขายได้เปรียบ', '70 / 30 เตือนว่าวิ่งตึงแล้ว ไม่ได้แปลว่าต้องกลับตัว', 'Divergence: ราคาทำจุดสูงใหม่ แต่ RSI ไม่ทำ = แรงส่งเริ่มอ่อน']],
    trap: ['In a strong trend RSI can stay above 70 for weeks. Selling just because RSI is high fights the trend.', 'ในเทรนด์แรง RSI อยู่เหนือ 70 ได้เป็นสัปดาห์ ขายเพราะ RSI สูงอย่างเดียวคือสวนเทรนด์'],
    ex: (k, C, T) => { const n = 120, a = lnTail(k, n), r = lnTail(C.rsi, n), v = r[n - 1]; if (v == null) return null;
      let hi = -1, lo = -1; for (let i = n - 1; i >= 0; i--) { if (hi < 0 && r[i] > 70) hi = i; if (lo < 0 && r[i] != null && r[i] < 30) lo = i; }
      const zone = v > 70 ? ['overbought (above 70)', 'Overbought (เกิน 70)'] : v < 30 ? ['oversold (below 30)', 'Oversold (ต่ำกว่า 30)'] : v >= 50 ? ['between 50 and 70: buyers have a mild edge', 'ระหว่าง 50 ถึง 70 ฝั่งซื้อได้เปรียบเล็กน้อย'] : ['between 30 and 50: sellers have a mild edge', 'ระหว่าง 30 ถึง 50 ฝั่งขายได้เปรียบเล็กน้อย'];
      return { html: lnChart(a, { sub: { series: [{ v: r, c: lnCol.ma200 }], lo: 0, hi: 100, bands: [30, 70], name: 'RSI 14' }, aria: `${T} 120 days with RSI` }),
        read: [`${T} RSI is ${v.toFixed(0)}, ${zone[0]}. In the last 120 days it was last above 70 ${hi >= 0 ? 'on ' + lnDay(a[hi].t) : 'never'} and below 30 ${lo >= 0 ? 'on ' + lnDay(a[lo].t) : 'never'}.`, `RSI ของ ${T} อยู่ที่ ${v.toFixed(0)} ${zone[1]} ใน 120 วันล่าสุด เกิน 70 ครั้งล่าสุด${hi >= 0 ? 'วันที่ ' + lnDay(a[hi].t) : 'ไม่มี'} และต่ำกว่า 30 ครั้งล่าสุด${lo >= 0 ? 'วันที่ ' + lnDay(a[lo].t) : 'ไม่มี'}`] }; },
    q: [['RSI has been above 70 for two weeks while price keeps rising. Best reading?', ['Must crash now', 'A strong trend; stretched, but not a sell signal alone', 'RSI is broken'], 1, 'Overbought can last in strong trends.'],
      ['RSI อยู่เหนือ 70 มาสองสัปดาห์ และราคายังขึ้นต่อ อ่านแบบไหนดีที่สุด', ['ต้องร่วงแน่', 'เทรนด์แรง ตึงแต่ยังไม่ใช่สัญญาณขายถ้าดูอย่างเดียว', 'RSI ใช้ไม่ได้'], 1, 'ในเทรนด์แรง Overbought อยู่ได้นาน']],
    go: ['#/markets', 'Turn on RSI in the Price tab', 'เปิด RSI ในแท็บราคา'] },
  { id: 'macd', lvl: 'i', t: ['MACD: momentum turning', 'MACD: แรงส่งกำลังเปลี่ยน'],
    why: ['MACD is the gap between a fast (12) and slow (26) average. The signal line is its 9-day average; the bars are the difference.', 'MACD คือระยะห่างของเส้นค่าเฉลี่ยเร็ว (12) กับช้า (26) เส้น Signal คือค่าเฉลี่ย 9 วันของมัน แท่งด้านล่างคือส่วนต่าง'],
    steps: [['MACD crossing above its signal = momentum turning up; below = turning down.', 'Above zero = the fast average is above the slow one (uptrend).', 'Shrinking bars warn that the current push is tiring.'],
      ['MACD ตัดขึ้นเหนือ Signal = แรงส่งเริ่มหันขึ้น ตัดลง = เริ่มหันลง', 'เหนือศูนย์ = ค่าเฉลี่ยเร็วอยู่เหนือค่าเฉลี่ยช้า (ขาขึ้น)', 'แท่งที่เล็กลงเตือนว่าแรงส่งรอบนี้เริ่มหมด']],
    trap: ['In sideways markets MACD crosses back and forth and gives many false signals.', 'ตลาดไซด์เวย์ MACD จะตัดไปมาบ่อยและหลอกเยอะ'],
    ex: (k, C, T) => { const n = 120, a = lnTail(k, n), m = lnTail(C.macd, n), s = lnTail(C.sig, n), h = lnTail(C.hist, n); if (s[n - 1] == null) return null;
      let x = -1; for (let i = n - 1; i > 0; i--) if (s[i] != null && s[i - 1] != null && (m[i] > s[i]) !== (m[i - 1] > s[i - 1])) { x = i; break; }
      const vals = m.concat(s, h).filter((v) => v != null), r = Math.max(...vals.map(Math.abs)) * 1.1, up = m[n - 1] > s[n - 1];
      return { html: lnChart(a, { sub: { series: [{ v: m, c: lnCol.ma20 }, { v: s, c: lnCol.sig }], hist: h, lo: -r, hi: r, bands: [], name: 'MACD 12/26/9' }, mark: x >= 0 ? [{ i: x, label: up ? XL('cross up', 'ตัดขึ้น') : XL('cross down', 'ตัดลง'), below: !up }] : [], key: [[lnCol.ma20, 'MACD'], [lnCol.sig, 'Signal']], aria: `${T} 120 days with MACD` }),
        read: [`${T} MACD is ${up ? 'above' : 'below'} its signal line${x >= 0 ? `, since the cross on ${lnDay(a[x].t)}` : ''}, and ${m[n - 1] > 0 ? 'above' : 'below'} zero: momentum is ${up ? 'turning up' : 'turning down'}.`, `MACD ของ ${T} อยู่${up ? 'เหนือ' : 'ใต้'}เส้น Signal${x >= 0 ? ` ตั้งแต่ตัดกันวันที่ ${lnDay(a[x].t)}` : ''} และอยู่${m[n - 1] > 0 ? 'เหนือ' : 'ใต้'}ศูนย์ แรงส่ง${up ? 'กำลังหันขึ้น' : 'กำลังหันลง'}`] }; },
    q: [['MACD crosses above its signal line while both are below zero. What does it say?', ['A confirmed uptrend', 'Downside momentum is easing; the trend is not up yet', 'Sell now'], 1, 'Below zero the bigger trend is still down.'],
      ['MACD ตัดขึ้นเหนือ Signal ขณะที่ทั้งสองเส้นยังอยู่ใต้ศูนย์ แปลว่าอะไร', ['ขาขึ้นยืนยันแล้ว', 'แรงลงเริ่มชะลอ แต่ยังไม่ใช่ขาขึ้น', 'ให้ขายทันที'], 1, 'ใต้ศูนย์แปลว่าเทรนด์ใหญ่ยังลง']],
    go: ['#/markets', 'Turn on MACD in the Price tab', 'เปิด MACD ในแท็บราคา'] },
  { id: 'bb', lvl: 'i', t: ['Bollinger bands: stretch and squeeze', 'Bollinger bands: ตึงและบีบ'],
    why: ['Bands sit 2 standard deviations around the 20-day average. They widen when price swings hard and narrow when it is calm.', 'กรอบอยู่ห่างจากค่าเฉลี่ย 20 วันสองเท่าของส่วนเบี่ยงเบนมาตรฐาน กว้างขึ้นเมื่อราคาเหวี่ยงแรง แคบลงเมื่อเงียบ'],
    steps: [['Touching the upper band = stretched up for now; the lower band = stretched down.', 'A squeeze (very narrow bands) often comes before a big move.', 'The break direction out of a squeeze matters more than the touch.'],
      ['แตะกรอบบน = ตอนนี้วิ่งตึงขึ้น แตะกรอบล่าง = ตึงลง', 'Squeeze (กรอบแคบมาก) มักเกิดก่อนราคาจะวิ่งแรง', 'ทิศที่ราคาหลุดออกจาก Squeeze สำคัญกว่าการแตะกรอบ']],
    trap: ['A squeeze tells you a move is likely, not which way.', 'Squeeze บอกว่าน่าจะมีการวิ่งแรง แต่ไม่บอกว่าจะไปทางไหน'],
    ex: (k, C, T) => { const n = 120, a = lnTail(k, n), u = lnTail(C.bbUp, n), l = lnTail(C.bbLo, n), m = lnTail(C.ma20, n); if (u[n - 1] == null) return null;
      const w = u.map((v, i) => (v == null ? null : (v - l[i]) / m[i] * 100)).filter((v) => v != null), now = w[w.length - 1], avg = w.reduce((s, v) => s + v, 0) / w.length, p = a[n - 1].c, pos = (p - l[n - 1]) / (u[n - 1] - l[n - 1]) * 100;
      return { html: lnChart(a, { lines: [{ v: u, c: lnCol.ma20, dash: '4 3' }, { v: m, c: lnCol.ma20 }, { v: l, c: lnCol.ma20, dash: '4 3' }], key: [[lnCol.ma20, 'MA20 ± 2σ']], aria: `${T} 120 days with Bollinger bands` }),
        read: [`${T} band width is ${now.toFixed(1)}% of price vs a ${avg.toFixed(1)}% average over 120 days${now < avg * 0.7 ? ': a squeeze' : now > avg * 1.3 ? ': unusually wide' : ''}. Price sits at ${pos.toFixed(0)}% of the way from the lower to the upper band.`, `ความกว้างกรอบของ ${T} อยู่ที่ ${now.toFixed(1)}% ของราคา เทียบกับเฉลี่ย 120 วัน ${avg.toFixed(1)}%${now < avg * 0.7 ? ' ถือว่ากำลังบีบ (Squeeze)' : now > avg * 1.3 ? ' กว้างผิดปกติ' : ''} ราคาอยู่ที่ ${pos.toFixed(0)}% ของระยะจากกรอบล่างถึงกรอบบน`] }; },
    q: [['The bands are the narrowest in six months. What should you expect?', ['Price will go up', 'A bigger move is likely, direction unknown', 'Nothing will happen for months'], 1, 'Low volatility tends to be followed by high volatility.'],
      ['กรอบแคบที่สุดในรอบหกเดือน ควรคาดอะไร', ['ราคาจะขึ้น', 'น่าจะมีการวิ่งแรง แต่ยังไม่รู้ทิศ', 'จะเงียบไปอีกหลายเดือน'], 1, 'ช่วงผันผวนต่ำมักตามด้วยช่วงผันผวนสูง']],
    go: ['#/markets', 'Turn on Bollinger in the Price tab', 'เปิด Bollinger ในแท็บราคา'] },
  { id: 'stoch', lvl: 'i', t: ['Stochastic: where in the range', 'Stochastic: ราคาอยู่ตรงไหนของกรอบ'],
    why: ['Stochastic (9/3/3) shows where the close sits inside the recent high-low range, 0 to 100. Faster than RSI.', 'Stochastic (9/3/3) บอกว่าราคาปิดอยู่ตรงไหนของกรอบสูง-ต่ำช่วงหลัง 0 ถึง 100 ไวกว่า RSI'],
    steps: [['Above 80 = closing near the top of the range; below 20 = near the bottom.', '%K crossing %D is a short-term turn.', 'Works best inside a range, or for pullback entries in the trend\'s direction.'],
      ['เกิน 80 = ปิดใกล้ขอบบนของกรอบ ต่ำกว่า 20 = ใกล้ขอบล่าง', '%K ตัด %D คือการกลับตัวระยะสั้น', 'ใช้ได้ดีในกรอบไซด์เวย์ หรือหาจังหวะย่อตามทิศเทรนด์']],
    trap: ['Being fast, it flips often. Use it with the trend, not against it.', 'เพราะไว จึงสลับบ่อย ใช้ตามเทรนด์ อย่าใช้สวนเทรนด์'],
    ex: (k, C, T) => { const n = 120, a = lnTail(k, n), K = lnTail(C.k, n), D = lnTail(C.d, n), v = K[n - 1]; if (v == null || D[n - 1] == null) return null;
      return { html: lnChart(a, { sub: { series: [{ v: K, c: lnCol.ma20 }, { v: D, c: lnCol.sig }], lo: 0, hi: 100, bands: [20, 80], name: 'Stoch 9/3/3' }, key: [[lnCol.ma20, '%K'], [lnCol.sig, '%D']], aria: `${T} 120 days with Stochastic` }),
        read: [`${T} %K is ${v.toFixed(0)} and ${v > D[n - 1] ? 'above' : 'below'} %D (${D[n - 1].toFixed(0)}): ${v > 80 ? 'closing near the top of its 9-day range' : v < 20 ? 'closing near the bottom of its 9-day range' : 'in the middle of its 9-day range'}.`, `%K ของ ${T} อยู่ที่ ${v.toFixed(0)} และอยู่${v > D[n - 1] ? 'เหนือ' : 'ใต้'} %D (${D[n - 1].toFixed(0)}) ${v > 80 ? 'ราคาปิดใกล้ขอบบนของกรอบ 9 วัน' : v < 20 ? 'ราคาปิดใกล้ขอบล่างของกรอบ 9 วัน' : 'อยู่กลางกรอบ 9 วัน'}`] }; },
    q: [['Uptrend, and Stochastic drops below 20 then %K crosses up. A typical use?', ['A pullback entry in the trend\'s direction', 'A short signal', 'Ignore the trend'], 0, 'Oversold dips in an uptrend are classic pullback entries.'],
      ['เป็นขาขึ้น Stochastic ลงต่ำกว่า 20 แล้ว %K ตัดขึ้น ใช้ยังไงตามปกติ', ['เป็นจังหวะย่อเพื่อเข้าตามเทรนด์', 'เป็นสัญญาณ Short', 'ไม่ต้องสนเทรนด์'], 0, 'การย่อลงโซน Oversold ในขาขึ้นเป็นจังหวะเข้าแบบคลาสสิก']],
    go: ['#/markets', 'Turn on Stochastic in the Price tab', 'เปิด Stochastic ในแท็บราคา'] },
  { id: 'fib', lvl: 'i', t: ['Fibonacci retracement', 'Fibonacci retracement'],
    why: ['After a big move, price often pulls back part of it before carrying on. Fibonacci marks the usual pullback depths: 38.2%, 50% and 61.8%.', 'หลังวิ่งแรง ราคามักย่อกลับบางส่วนก่อนไปต่อ Fibonacci บอกระดับการย่อที่พบบ่อย 38.2% 50% และ 61.8%'],
    steps: [['Draw from the swing low to the swing high (or high to low in a fall).', '38.2–61.8% is the zone where pullbacks often stop.', 'Below 78.6% the original move is in doubt.'],
      ['ลากจากจุดต่ำของสวิงไปจุดสูง (ถ้าเป็นขาลงลากจากสูงไปต่ำ)', 'โซน 38.2–61.8% คือจุดที่การย่อมักหยุด', 'ถ้าหลุดต่ำกว่า 78.6% การวิ่งรอบเดิมเริ่มไม่น่าเชื่อ']],
    trap: ['Fibonacci levels work best where they line up with real support, an average or volume. Alone they are just lines.', 'ระดับ Fibonacci ได้ผลดีเมื่อตรงกับแนวรับจริง เส้นค่าเฉลี่ย หรือวอลุ่ม ถ้าอยู่ลำพังก็เป็นแค่เส้น'],
    ex: (k, C, T) => { if (typeof fibOf !== 'function') return null; const n = 120, a = lnTail(k, n), F = fibOf(a, 0, n - 1); if (!F) return null;
      const p = a[n - 1].c, near = F.lv.slice().sort((x, y) => Math.abs(x.p - p) - Math.abs(y.p - p))[0];
      return { html: lnChart(a, { hl: F.lv.map((l) => ({ p: l.p, c: lnCol.fib, label: `${(l.r * 100).toFixed(1)}% ${px(l.p)}`, dash: '2 3' })), mark: [{ i: F.lo, label: XL('swing low', 'จุดต่ำ'), below: true }, { i: F.hi, label: XL('swing high', 'จุดสูง') }], aria: `${T} 120 days with Fibonacci levels` }),
        read: [`${T}'s biggest swing in 120 days is ${F.up ? 'up' : 'down'}, ${F.up ? `${px(F.L)} → ${px(F.H)}` : `${px(F.H)} → ${px(F.L)}`}. Price (${px(p)}) is nearest the ${(near.r * 100).toFixed(1)}% level at ${px(near.p)}.`, `สวิงใหญ่สุดของ ${T} ใน 120 วันเป็น${F.up ? 'ขาขึ้น' : 'ขาลง'} ${F.up ? `${px(F.L)} → ${px(F.H)}` : `${px(F.H)} → ${px(F.L)}`} ราคาตอนนี้ (${px(p)}) ใกล้ระดับ ${(near.r * 100).toFixed(1)}% ที่ ${px(near.p)} มากที่สุด`] }; },
    q: [['After a rise from $100 to $200, where is the 50% retracement?', ['$150', '$100', '$175'], 0, 'Half of the $100 move back from $200.'],
      ['ราคาขึ้นจาก $100 ไป $200 ระดับย่อ 50% อยู่ที่ไหน', ['$150', '$100', '$175'], 0, 'ย่อกลับครึ่งหนึ่งของระยะ $100 จาก $200']],
    go: ['#/markets', 'Turn on Fibonacci in the Price tab', 'เปิด Fibonacci ในแท็บราคา'] },
  { id: 'funding', lvl: 'i', t: ['Funding and open interest', 'Funding และ Open interest'],
    why: ['Open interest (OI) is the total value of open futures positions. Funding is the fee longs and shorts pay each other to keep perp prices near spot.', 'Open interest (OI) คือมูลค่ารวมของโพซิชันฟิวเจอร์สที่เปิดค้าง Funding คือค่าธรรมเนียมที่ Long กับ Short จ่ายให้กันเพื่อให้ราคา Perp ใกล้ราคา Spot'],
    steps: [['Positive funding: longs pay shorts, more people want to be long.', 'OI rising with price = new money joining; OI falling = positions closing.', 'High OI with expensive funding = crowded; a small move can force many out.'],
      ['Funding เป็นบวก: Long จ่ายให้ Short แปลว่าคนอยาก Long มากกว่า', 'OI ขึ้นพร้อมราคา = มีเงินใหม่เข้ามา OI ลด = มีการปิดโพซิชัน', 'OI สูงและ Funding แพง = คนแน่น ราคาขยับนิดเดียวก็บีบให้หลายคนต้องออก']],
    trap: ['Crowded does not mean wrong right away; crowds can stay crowded. It tells you which side gets hurt if price turns.', 'คนแน่นไม่ได้แปลว่าผิดทันที อาจแน่นต่อไปได้อีกนาน แต่บอกว่าถ้าราคากลับตัว ฝั่งไหนจะเจ็บ'],
    ex: null,
    q: [['Price is flat, OI is climbing fast and funding is high. Risk?', ['None', 'Leverage is piling up: a sharp move either way is more likely', 'Price must go up'], 1, 'Stacked leverage turns small moves into forced buying or selling.'],
      ['ราคาไม่ไปไหน OI เพิ่มเร็ว และ Funding สูง เสี่ยงอะไร', ['ไม่มี', 'เลเวอเรจกำลังสะสม มีโอกาสวิ่งแรงทางใดทางหนึ่ง', 'ราคาต้องขึ้น'], 1, 'เลเวอเรจที่กองไว้ทำให้การขยับเล็กๆ กลายเป็นการบังคับซื้อหรือขาย']],
    go: ['#/markets', 'Open the Leverage tab', 'เปิดแท็บเลเวอเรจ'] },
  { id: 'liq', lvl: 'i', t: ['Liquidation maps', 'Liquidation map'],
    why: ['A leveraged position is closed by force when price hits its liquidation price. Clusters of those prices can pull price toward them and speed moves up.', 'โพซิชันที่ใช้เลเวอเรจจะถูกบังคับปิดเมื่อราคาแตะราคา liq กลุ่มราคา liq ที่กองกันอยู่อาจดึงราคาเข้าหาและเร่งให้วิ่งเร็วขึ้น'],
    steps: [['Shorts get liquidated above price (forced buys), longs below (forced sells).', 'Estimated map: a model across venues. On-chain map: real liquidation prices of the largest 5,000 Hyperliquid accounts.', 'Check the coverage: the on-chain map is one venue and part of its open interest.'],
      ['Short โดนล้างด้านบนราคา (บังคับซื้อ) Long โดนล้างด้านล่าง (บังคับขาย)', 'แผนที่ Estimated คือแบบจำลองจากหลายกระดาน แผนที่ On-chain คือราคา liq จริงของ 5,000 บัญชีใหญ่สุดบน Hyperliquid', 'ดูตัวเลขความครอบคลุมด้วย แผนที่ On-chain เป็นกระดานเดียวและเป็นแค่บางส่วนของ OI']],
    trap: ['A big cluster is a magnet only if price gets close; far clusters rarely matter this week. Faded levels on the on-chain map were already reached.', 'ก้อนใหญ่จะดึงราคาก็ต่อเมื่อราคาเข้าใกล้ ก้อนที่อยู่ไกลมักไม่มีผลในสัปดาห์นี้ ส่วนที่จางในแผนที่ On-chain คือระดับที่ราคาเคยแตะแล้ว'],
    ex: null,
    q: [['A large short-liquidation cluster sits 2% above price. If price rises into it, what tends to happen?', ['Forced buying that can speed the rise', 'Forced selling', 'Nothing'], 0, 'Liquidated shorts are bought back at market.'],
      ['มีก้อน Short liq ใหญ่อยู่เหนือราคา 2% ถ้าราคาขึ้นไปถึง มักเกิดอะไร', ['บังคับซื้อ ซึ่งอาจเร่งให้ราคาขึ้นเร็ว', 'บังคับขาย', 'ไม่เกิดอะไร'], 0, 'Short ที่โดนล้างจะถูกซื้อคืนด้วยราคาตลาด']],
    go: ['#/markets', 'Open the Leverage tab', 'เปิดแท็บเลเวอเรจ'] },
  { id: 'smart', lvl: 'i', t: ['Smart Money', 'Smart Money'],
    why: ['A fixed panel of consistently profitable Hyperliquid wallets. Their real positions and flows show what experienced traders are doing.', 'กลุ่มกระเป๋าบน Hyperliquid ที่ทำกำไรสม่ำเสมอแบบคงที่ โพซิชันและการเข้าออกจริงของพวกเขาบอกว่าเทรดเดอร์มีประสบการณ์กำลังทำอะไร'],
    steps: [['Look at net flow: are they adding longs or shorts in the last 24h / 7 days?', 'Check how many wallets agree, not just the biggest one.', 'Underwater = how much of their position is in loss right now.'],
      ['ดู Net flow: 24 ชม. / 7 วันล่าสุดพวกเขาเพิ่ม Long หรือ Short', 'ดูว่ากี่กระเป๋าเห็นตรงกัน ไม่ใช่ดูแค่กระเป๋าที่ใหญ่สุด', 'Underwater = สัดส่วนโพซิชันที่กำลังขาดทุนอยู่ตอนนี้']],
    trap: ['They can be wrong, hedged elsewhere, or on a different timeframe. Use it as context, never as a copy signal.', 'พวกเขาผิดได้ อาจเฮดจ์ที่อื่น หรือเทรดคนละกรอบเวลา ใช้เป็นข้อมูลประกอบ อย่าใช้ลอกตาม'],
    ex: null,
    q: [['One whale opened a huge long; most of the panel is reducing longs. Better reading?', ['Follow the whale', 'The panel as a whole is getting more cautious', 'Smart Money is useless'], 1, 'Breadth across wallets says more than one account.'],
      ['วาฬตัวเดียวเปิด Long ใหญ่มาก แต่กระเป๋าส่วนใหญ่ในกลุ่มกำลังลด Long อ่านแบบไหนดีกว่า', ['ตามวาฬไป', 'ภาพรวมของกลุ่มกำลังระวังตัวมากขึ้น', 'Smart Money ใช้ไม่ได้'], 1, 'ความเห็นตรงกันของหลายกระเป๋าบอกได้มากกว่าบัญชีเดียว']],
    go: ['#/smart', 'Open Smart Money', 'เปิด Smart Money'] },
  { id: 'verdict', lvl: 'i', t: ['The Setup card: Long / Wait / Avoid', 'การ์ด Setup: Long / Wait / Avoid'],
    why: ['The app combines trend, momentum and risk into one plain call per token, using the same rule every day, and records how past calls did.', 'แอปรวมเทรนด์ แรงส่ง และความเสี่ยงเป็นคำตัดสินเดียวต่อเหรียญ ใช้กฎเดียวกันทุกวัน และบันทึกผลของคำตัดสินที่ผ่านมา'],
    steps: [['Long: trend and momentum line up, risk is acceptable.', 'Wait: mixed signals; let price prove itself first.', 'Avoid: the trend is against you or risk is too high.'],
      ['Long: เทรนด์และแรงส่งไปทางเดียวกัน ความเสี่ยงรับได้', 'Wait: สัญญาณยังขัดกัน รอให้ราคาพิสูจน์ก่อน', 'Avoid: เทรนด์สวนทาง หรือความเสี่ยงสูงเกินไป']],
    trap: ['It is a daily summary, not an order. Check the Record page to see how often each call worked.', 'เป็นสรุปรายวัน ไม่ใช่คำสั่งซื้อขาย ดูหน้า Record ว่าแต่ละคำตัดสินได้ผลบ่อยแค่ไหน'],
    ex: null,
    q: [['A token shows "Wait". What does it mean?', ['Buy now', 'Signals are mixed; wait for confirmation', 'The data is broken'], 1, 'Wait = not enough agreement yet.'],
      ['เหรียญขึ้นว่า "Wait" หมายถึงอะไร', ['ซื้อเลย', 'สัญญาณยังขัดกัน รอการยืนยัน', 'ข้อมูลเสีย'], 1, 'Wait = สัญญาณยังเห็นตรงกันไม่พอ']],
    go: ['#/record', 'Open the Record', 'เปิดหน้า Record'] },
];
const LN_GLOSS = [
  ['Leverage', 'เลเวอเรจ (Leverage)', 'Trading with borrowed money: 10× means a 1% move changes your margin by 10%.', 'เทรดด้วยเงินยืม 10 เท่า แปลว่าราคาขยับ 1% มาร์จิ้นของคุณเปลี่ยน 10%'],
  ['Long / Short', 'Long / Short', 'Long profits when price rises; short profits when it falls.', 'Long ได้กำไรเมื่อราคาขึ้น Short ได้กำไรเมื่อราคาลง'],
  ['Perpetual (perp)', 'Perpetual (Perp)', 'A futures contract with no expiry, kept near spot price by funding.', 'สัญญาฟิวเจอร์สที่ไม่มีวันหมดอายุ ใช้ Funding ดึงราคาให้ใกล้ Spot'],
  ['Funding rate', 'Funding rate', 'The periodic fee between longs and shorts on perps. Positive = longs pay.', 'ค่าธรรมเนียมเป็นรอบระหว่าง Long กับ Short บน Perp เป็นบวก = Long จ่าย'],
  ['Open interest (OI)', 'Open interest (OI)', 'The total value of futures positions still open.', 'มูลค่ารวมของโพซิชันฟิวเจอร์สที่ยังเปิดอยู่'],
  ['Liquidation', 'Liquidation (โดนล้างพอร์ต)', 'A forced close of a leveraged position when its margin runs out.', 'การบังคับปิดโพซิชันเลเวอเรจเมื่อมาร์จิ้นไม่พอ'],
  ['Liquidation price', 'ราคา liq', 'The price at which a position is liquidated.', 'ราคาที่โพซิชันจะโดนบังคับปิด'],
  ['Margin', 'มาร์จิ้น (Margin)', 'The money you put down to hold a leveraged position.', 'เงินที่วางไว้เพื่อถือโพซิชันเลเวอเรจ'],
  ['Candle', 'แท่งเทียน', 'One period of price: open, high, low, close.', 'ราคาหนึ่งช่วงเวลา: เปิด สูงสุด ต่ำสุด ปิด'],
  ['Timeframe', 'Timeframe (กรอบเวลา)', 'How long each candle covers: 15m, 1h, 4h, 1D, 1W.', 'แต่ละแท่งครอบคลุมเวลาเท่าไร 15 นาที 1 ชม. 4 ชม. 1 วัน 1 สัปดาห์'],
  ['Stochastic', 'Stochastic', 'Where the close sits in the recent high-low range, 0 to 100.', 'ราคาปิดอยู่ตรงไหนในกรอบสูง-ต่ำช่วงหลัง 0 ถึง 100'],
  ['Fibonacci retracement', 'Fibonacci retracement', 'Common pullback depths of a swing: 23.6, 38.2, 50, 61.8, 78.6%.', 'ระดับการย่อที่พบบ่อยของสวิง 23.6 38.2 50 61.8 78.6%'],
  ['Breadth', 'Breadth', 'How many coins are rising versus falling.', 'จำนวนเหรียญที่ขึ้นเทียบกับที่ลง'],
  ['Divergence', 'Divergence', 'Price and an indicator disagree, e.g. a new price high without a new RSI high.', 'ราคากับอินดิเคเตอร์ไปคนละทาง เช่น ราคาทำจุดสูงใหม่แต่ RSI ไม่ทำ'],
  ['Golden / death cross', 'Golden / Death cross', 'MA50 crossing above (golden) or below (death) MA200.', 'MA50 ตัดขึ้นเหนือ (Golden) หรือตัดลงใต้ (Death) MA200'],
  ['Coverage', 'ความครอบคลุม', 'On the on-chain map: how much of a venue\'s open interest the tracked positions are.', 'ในแผนที่ On-chain: โพซิชันที่ติดตามคิดเป็นกี่ % ของ OI บนกระดาน'],
  ['Capitulation', 'Capitulation', 'Panic selling on very high volume, often near a low.', 'การเทขายด้วยความตกใจบนวอลุ่มสูงมาก มักเกิดใกล้จุดต่ำ'],
  ['Whale', 'วาฬ (Whale)', 'An account large enough to move a market on its own.', 'บัญชีที่ใหญ่พอจะขยับตลาดได้เอง'],
];
function lnGloss() {
  const g = ((S.judg && S.judg.glossary) || []).map((x) => [L(x, 'term'), L(x, 'def')]);
  const p = (T('planTerms') || []).map(([a, b]) => [a, b]);
  const e = LN_GLOSS.map((x) => (LANG === 'th' ? [x[1], x[3]] : [x[0], x[2]]));
  const seen = new Set(); return [...g, ...p, ...e].filter(([a]) => { const k = a.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a[0].localeCompare(b[0], loc()));
}

/* ---------- page ---------- */
const lnL = (pair) => (LANG === 'th' ? pair[1] : pair[0]);
const lnNorm = (s) => String(s || '').toLowerCase();
function lnMatch(l, q) { if (!q) return true; return lnNorm([lnL(l.t), lnL(l.why), ...lnL(l.steps), lnL(l.trap), l.t[0], l.t[1]].join(' ')).includes(q); }
function pLearn2() {
  const h = (location.hash.match(/^#\/learn\/(\w+)/) || [])[1]; if (h && LESSONS.some((l) => l.id === h)) LN.open = h;
  const done = lnDone(), nd = LESSONS.filter((l) => done[l.id]).length;
  $('#main').innerHTML = `<div class="page narrow ln">${pageHead(T('learn'))}
    <p class="p">${esc(XL('Short lessons with examples from real charts. Start with the beginner ones; each takes about two minutes.', 'บทเรียนสั้นพร้อมตัวอย่างจากกราฟจริง เริ่มจากระดับพื้นฐานก่อน แต่ละบทใช้เวลาราวสองนาที'))}</p>
    <div class="ln-prog" data-lnprog><div class="ln-bar"><i style="width:${(nd / LESSONS.length * 100).toFixed(1)}%"></i></div><span>${esc(XL(`${nd} of ${LESSONS.length} lessons done`, `เรียนจบ ${nd} จาก ${LESSONS.length} บท`))}</span></div>
    <div class="ln-tools"><label class="ln-search"><input type="search" id="lnQ" aria-label="${esc(XL('Search lessons and terms', 'ค้นหาบทเรียนและคำศัพท์'))}" value="${esc(LN.q)}" placeholder="${esc(XL('Search: RSI, funding, stop-loss…', 'ค้นหา: RSI, Funding, Stop-loss…'))}" autocomplete="off"></label>
      <div class="seg ln-lvl" role="group" aria-label="${esc(XL('Level', 'ระดับ'))}">${[['all', 'All', 'ทั้งหมด'], ['b', 'Beginner', 'พื้นฐาน'], ['i', 'Intermediate', 'ระดับกลาง']].map(([k, en, th]) => `<button type="button" data-lnlvl="${k}" aria-pressed="${LN.lvl === k}">${esc(XL(en, th))}</button>`).join('')}</div></div>
    <div class="sec ln-start"><div class="sec-h"><h2>${esc(T('howTo'))}</h2></div><ol class="steps">${T('howToSteps').map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
    <div class="sec"><div class="sec-h"><h2>${esc(XL('Lessons', 'บทเรียน'))}</h2><div class="ln-tok" role="group" aria-label="${esc(XL('Examples on', 'ตัวอย่างจาก'))}"><span class="mut">${esc(XL('Examples on', 'ตัวอย่างจาก'))}</span>${LN_TOK.filter((s) => tokBySym(s)).map((s) => `<button type="button" data-lntok="${s}" aria-pressed="${LN.tok === s}">${s}</button>`).join('')}</div></div>
      <div class="ln-list" id="lnList"></div><p class="mut ln-none" id="lnNone" hidden>${esc(XL('No lesson matches. Try the glossary below.', 'ไม่มีบทเรียนที่ตรงคำค้น ลองดูคำศัพท์ด้านล่าง'))}</p></div>
    <div class="sec"><div class="sec-h"><h2>${esc(XL('Glossary', 'คำศัพท์'))}</h2><span class="mut" id="lnGN"></span></div><div class="gl ln-gl" id="lnGl" style="border-top:1px solid var(--line)"></div></div>
    <p class="nfa">${esc(T('nfa'))}</p></div>`;
  lnList(); lnGl();
  const q = $('#lnQ'); q.addEventListener('input', () => { LN.q = q.value; lnList(); lnGl(); });
  if (LN.open) { const d = document.querySelector(`[data-ln="${LN.open}"]`); if (d) setTimeout(() => d.scrollIntoView({ block: 'start' }), 50); }
}
function lnList() {
  const q = lnNorm(LN.q.trim()), done = lnDone(), el = $('#lnList'); if (!el) return;
  const ls = LESSONS.filter((l) => (LN.lvl === 'all' || l.lvl === LN.lvl) && lnMatch(l, q));
  el.innerHTML = ls.map((l, i) => `<details class="ln-card" data-ln="${l.id}"${LN.open === l.id ? ' open' : ''}><summary><span class="ln-n">${done[l.id] ? '✓' : LESSONS.indexOf(l) + 1}</span><span class="ln-tt"><b>${esc(lnL(l.t))}</b><small>${esc(lnL(l.why))}</small></span><span class="ln-lv ${l.lvl}">${esc(l.lvl === 'b' ? XL('Beginner', 'พื้นฐาน') : XL('Intermediate', 'ระดับกลาง'))}</span></summary><div class="ln-body"></div></details>`).join('');
  $('#lnNone').hidden = ls.length > 0;
  el.querySelectorAll('details').forEach((d) => { d.addEventListener('toggle', () => { if (d.open) { LN.open = d.dataset.ln; lnBody(d); try { history.replaceState(null, '', '#/learn/' + d.dataset.ln); } catch (e) {} } });
    if (d.open) lnBody(d); });
}
function lnBody(d) {
  const l = LESSONS.find((x) => x.id === d.dataset.ln), b = d.querySelector('.ln-body'); if (!l || !b) return;
  const Q = lnL(l.q), done = lnDone()[l.id];
  b.innerHTML = `<ol class="ln-steps">${lnL(l.steps).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${l.ex ? `<div class="ln-ex" data-lnex><div class="ln-exh"><b>${esc(XL('Real example', 'ตัวอย่างจากกราฟจริง'))}</b> <span class="mut">${esc(XL(`${LN.tok} daily candles`, `แท่งรายวันของ ${LN.tok}`))}</span></div><div class="ln-exb"><div class="sk" style="height:200px"></div></div></div>` : ''}
    <p class="ln-trap"><b>${esc(XL('Common trap', 'กับดักที่เจอบ่อย'))}</b> ${esc(lnL(l.trap))}</p>
    <div class="ln-q" data-lnq><b>${esc(XL('Quick check', 'ทดสอบสั้นๆ'))}</b><p>${esc(Q[0])}</p><div class="ln-opts">${Q[1].map((o, i) => `<button type="button" class="btn ln-opt" data-lnopt="${i}">${esc(o)}</button>`).join('')}</div><p class="ln-fb" aria-live="polite">${done ? esc(XL('Done earlier ✓', 'เคยตอบถูกแล้ว ✓')) : ''}</p></div>
    <a class="ln-go" href="${l.go[0]}">${esc(XL(l.go[1], l.go[2]))} →</a>`;
  b.querySelectorAll('[data-lnopt]').forEach((x) => x.addEventListener('click', () => { const right = +x.dataset.lnopt === Q[2], fb = b.querySelector('.ln-fb');
    b.querySelectorAll('[data-lnopt]').forEach((y) => { y.classList.remove('ok', 'no'); y.setAttribute('aria-pressed', 'false'); }); x.classList.add(right ? 'ok' : 'no'); x.setAttribute('aria-pressed', 'true');
    fb.textContent = (right ? XL('Right. ', 'ถูกต้อง ') : XL('Not quite. ', 'ยังไม่ใช่ ')) + Q[3];
    if (right && !lnDone()[l.id]) { lnSetDone(l.id); const n = LESSONS.filter((z) => lnDone()[z.id]).length, pr = $('[data-lnprog]'); if (pr) { pr.querySelector('i').style.width = (n / LESSONS.length * 100).toFixed(1) + '%'; pr.querySelector('span').textContent = XL(`${n} of ${LESSONS.length} lessons done`, `เรียนจบ ${n} จาก ${LESSONS.length} บท`); }
      const nn = d.querySelector('.ln-n'); if (nn) nn.textContent = '✓'; } }));
  if (l.ex) lnExample(l, b.querySelector('.ln-exb'));
}
async function lnCandles(sym) {
  const t = tokBySym(sym); if (!t) return null;
  for (let i = 0; i < 40 && !(t.d1 && t.d1.length > 60); i++) await new Promise((r) => setTimeout(r, 500)); // the overview loads every token's daily candles
  if (!(t.d1 && t.d1.length > 60)) return null;
  const k = t.d1.filter((x) => x.t + 864e5 <= Date.now()); return k.length > 60 ? k : null; // closed candles only, so the example does not move during the day
}
async function lnExample(l, el) {
  const sym = LN.tok, k = await lnCandles(sym); if (!el.isConnected) return;
  let r = null; try { r = k && l.ex(k, lnCalc(k), sym); } catch (e) { r = null; }
  if (!r) { el.innerHTML = `<p class="mut">${esc(XL('Example unavailable right now: not enough candles for this token.', 'ตอนนี้ยังแสดงตัวอย่างไม่ได้ แท่งเทียนของเหรียญนี้ยังไม่พอ'))}</p>`; return; }
  el.innerHTML = `${r.html}<p class="ln-read" data-lnread>${esc(lnL(r.read))}</p>`;
}
document.addEventListener('click', (e) => {
  const lv = e.target.closest('[data-lnlvl]'); if (lv) { LN.lvl = lv.dataset.lnlvl; document.querySelectorAll('[data-lnlvl]').forEach((x) => x.setAttribute('aria-pressed', String(x === lv))); lnList(); return; }
  const tk = e.target.closest('[data-lntok]'); if (tk) { LN.tok = tk.dataset.lntok; document.querySelectorAll('[data-lntok]').forEach((x) => x.setAttribute('aria-pressed', String(x === tk)));
    document.querySelectorAll('.ln-card[open]').forEach((d) => { const l = LESSONS.find((x) => x.id === d.dataset.ln), b = d.querySelector('.ln-exb'); if (l && l.ex && b) { d.querySelector('.ln-exh .mut').textContent = XL(`${LN.tok} daily candles`, `แท่งรายวันของ ${LN.tok}`); lnExample(l, b); } }); }
});
function lnGl() {
  const el = $('#lnGl'); if (!el) return; const q = lnNorm(LN.q.trim()), g = lnGloss().filter(([a, b]) => !q || lnNorm(a + ' ' + b).includes(q));
  el.innerHTML = g.length ? g.map(([a, b]) => `<div><b>${esc(a)}</b><p>${esc(b)}</p></div>`).join('') : `<p class="mut">${esc(XL('No term matches.', 'ไม่มีคำศัพท์ที่ตรงคำค้น'))}</p>`;
  $('#lnGN').textContent = XL(`${g.length} terms`, `${g.length} คำ`);
}
