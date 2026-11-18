# Visual QA after merging main (v59 #13) into #14 (v60)

Taken 2026-11-17 22:11 GMT+9 in headless Chrome against the merge commit e96c846 (served locally, live data). Script: qa.mjs.
Widths 360/390/768/1024/1280/1440/1920, EN and TH. Files: token-lev-<width>-<lang>.jpg (BTC token page, Liquidation map section; sticky top bar and tab bar hidden only during the capture) and bell-<width>-<lang>.jpg (viewport with the bell panel open).

Checked at every width and language (all pass):
- document scrollWidth <= clientWidth, on the token page and with the bell open; no element past the viewport; no clipped text leaf; no overlapping tabs / top bar / bottom tab bar items
- 65/35 map/side split from 1024px (452/244, 619/333, 481/259, 497/267, same as before the merge); one column with the chart first below 1024px
- Liquidation map tabs: ArrowRight/ArrowLeft move selection and focus (role=tablist)
- tap targets >= 44x44px below 768px (top bar, bell, map tabs, bottom tab bar, bell links)
- window label "167 hours" / "167 ชม."; all 4 venues loaded; bell panel inside the viewport

- bell-1024-en.jpg
- bell-1024-th.jpg
- bell-1280-en.jpg
- bell-1280-th.jpg
- bell-1440-en.jpg
- bell-1440-th.jpg
- bell-1920-en.jpg
- bell-1920-th.jpg
- bell-360-en.jpg
- bell-360-th.jpg
- bell-390-en.jpg
- bell-390-th.jpg
- bell-768-en.jpg
- bell-768-th.jpg
- token-lev-1024-en.jpg
- token-lev-1024-th.jpg
- token-lev-1280-en.jpg
- token-lev-1280-th.jpg
- token-lev-1440-en.jpg
- token-lev-1440-th.jpg
- token-lev-1920-en.jpg
- token-lev-1920-th.jpg
- token-lev-360-en.jpg
- token-lev-360-th.jpg
- token-lev-390-en.jpg
- token-lev-390-th.jpg
- token-lev-768-en.jpg
- token-lev-768-th.jpg
