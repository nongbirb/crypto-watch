# Thai style guide (all generated Thai: narrative, judgment, weekly report, news titles)

Read this before writing ANY `th` field. Write the English first, then write the Thai **from the same facts**, the way a Thai trader would post it. Never translate the English sentence clause by clause.
1. **Write Thai from the facts, not from the English sentence.** Read the English facts, then write what a Thai trader would post. Reordering, merging or dropping filler is fine. Numbers, names and sources must stay exactly the same.
2. **Tone:** casual-professional, like Siam Blockchain or Bitcoin Addict headlines and Thai crypto X/Facebook. Friendly, not slangy, not formal-academic.
3. **Keep in English (as Thai traders write them):** long, short, funding, OI, liquidation (or "โดนล้าง"), pump, dump, ATH, TVL, airdrop, unlock, whale, perp, spot, ETF, RSI/MA, TP/SL, short squeeze, risk-on/off, tickers, company and people names.
4. **Translate when Thai is the normal word:** แนวรับ/แนวต้าน, เงินไหลเข้า/ไหลออก, ขาขึ้น/ขาลง, เด้ง, ร่วง, ทุบ, ฟื้น, ยืนเหนือ, หลุด, เลือกตั้งกลางเทอม.
5. **Short sentences.** One idea each. Use spaces and line breaks, not `;` or `—`. One headline should be at most about 2 short sentences.
6. **Avoid stiff or bookish words** unless a news site would really use them: อย่างมีนัยสำคัญ, ดำเนินการ, ในส่วนของ, ทำการ, ซึ่งถือว่า, ฉายภาพ, ตัดแรงช็อก. Prefer เยอะ, ชัด, ขยับ, เริ่ม.
7. **Particles** (นะ, เลย, แล้ว, ยัง) sparingly, at most about one per item. Never ครับ/ค่ะ in data text.
8. **Lead with the market meaning:** what happened, then why traders care.
9. **Units:** $78K, 24 ชม., 7 วัน, 3 พ.ย. Keep "ไม่ใช่คำแนะนำการลงทุน" as is.


10. **Self-check before saving:** read each Thai line aloud in your head. If it sounds like a translation, rewrite it. Run `python3 scripts/validate.py thai` and rewrite any flagged item.

## Examples (Before = literal, banned style. After = target tone)
1. **Before:** Midterm สหรัฐฯ: Reuters และสื่อใหญ่ฉายภาพเดโมแครตครองทั้งสภาผู้แทนและวุฒิสภา; BTC ดิปสั้นใกล้ $75.7k แล้วทำ V reclaim กลับโซน ~$78k–$78.5k หลังสินทรัพย์เสี่ยงตัดแรงช็อกคืนก่อน
   **After:** เลือกตั้งกลางเทอมสหรัฐฯ Reuters และสื่อใหญ่คาดเดโมแครตได้คุมทั้งสภาล่างและวุฒิสภา BTC ร่วงแรงไปแถว $75.7K แต่เด้งกลับเป็นรูปตัว V มายืน $78K–78.5K ได้ไว ตลาดเริ่มหายช็อกจากเมื่อคืน
2. **Before:** รางโทเคนเร่งขึ้น: Solana โชว์วอลุ่มหุ้นโทเคนราว $657M วันจันทร์ (Backpack Securities ~$598M) ขณะ Morgan Stanley บอกเป็นหนึ่งในธนาคารแรกที่ใช้บริการ Tokenization ของ DTCC …
   **After:** กระแส tokenization มาแรง วันจันทร์มีการเทรดหุ้นโทเคนบน Solana ราว $657M (เกือบทั้งหมดผ่าน Backpack Securities ~$598M) ส่วน Morgan Stanley บอกว่าเป็นแบงก์แรก ๆ ที่ใช้ระบบ tokenization ของ DTCC กับหุ้น ETF และพันธบัตรสหรัฐฯ
3. **Before:** ติดตามยังดังเข้าวันเอเชีย: CZ โพสต์ว่าข้อมูลสาธารณะชี้เงินไหลเข้าสุทธิราว $2.8B ใน 24 ชม. และย้ำว่าแฮ็กขนาดนี้สะท้อนช่องโหว่ความปลอดภัยจริง ขณะ Yi He โต้การชี้นิ้วในอุตสาหกรรม …
   **After:** เรื่องแฮ็ก Binance ยังเป็นประเด็นต่อเนื่องช่วงเอเชีย CZ โพสต์ว่าข้อมูลสาธารณะชี้ว่าเงินไหลเข้าสุทธิราว $2.8B ใน 24 ชม. และบอกว่าแฮ็กขนาดนี้แปลว่าระบบความปลอดภัยมีปัญหาจริง ส่วน Yi He ตอบโต้คนในวงการที่ออกมาโทษกันไปมา
4. **Before:** โทนบน X ช่วงเอเชีย–ยุโรปตึงแล้วผ่อนนิด: คุย blue wave midterm กด risk-off แรง แต่ BTC reclaim เร็ว… ขณะคดี stock perps ของ CFTC และสายความปลอดภัยธนาคาร/กระดานยังทำให้โทนตั้งรับ
   **After:** บรรยากาศบน X ช่วงเอเชีย–ยุโรปตึง ๆ ก่อนจะผ่อนลงนิดหน่อย ตอนแรกกระแส "blue wave" ทำให้ตลาดเทขายสินทรัพย์เสี่ยง แต่พอ BTC เด้งกลับได้ไว คนก็กังวลน้อยลง สายบิลเดอร์ชอบข่าว tokenization ส่วนคดี stock perp กับ CFTC และข่าวโดนแฮ็กยังทำให้หลายคนเล่นแบบระวังตัว
5. **Before (BTC take):** เด้งดีหลังสเตรสกลางเทอม แต่ยัง Mixed จนกว่า $80–81K โฮลด์และโฟลว์ ETF หยุดเลือด อย่าไล่เทียนสควีซ
   **After:** เด้งได้สวยหลังช่วงเลือกตั้ง แต่ภาพยังไม่ชัด ต้องรอให้ยืน $80–81K ได้ และ ETF เลิกโดนถอนเงินออกก่อน อย่าไล่ราคาตามแท่ง short squeeze

