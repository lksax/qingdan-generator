import { chromium } from 'playwright';
import path from 'path';

const FILE = 'file://' + path.resolve('清单生成器.html');

let pass = 0, fail = 0;
const log = [];
function ok(name, cond, extra) {
  if (cond) { pass++; log.push('  ✅ ' + name); }
  else { fail++; log.push('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// 真实点击（避开 App 的 320ms 防重复点击锁）
async function tap(sel) {
  await page.click(sel);
  await page.waitForTimeout(360);
}

const CTA = '.stack.active .screen:last-child .cta';

await page.goto(FILE, { waitUntil: 'networkidle' });
await page.waitForSelector('#tabbar', { timeout: 5000 });

async function listsCount() { return await page.evaluate(() => window.App.DB.data.lists.length); }
async function activeHas(sel) { return await page.evaluate((s) => !!document.querySelector('.stack.active ' + s), sel); }
async function rect(sel) {
  return await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const tab = document.querySelector('#tabbar').getBoundingClientRect();
    return { bottom: r.bottom, top: r.top, tabTop: tab.top, vh: window.innerHeight };
  }, sel);
}

// ============ 一、首页滚动（短屏强制溢出） ============
await page.setViewportSize({ width: 390, height: 640 });
await page.waitForTimeout(150);
const scrollInfo = await page.evaluate(() => {
  const body = document.querySelector('.stack[data-tab="home"] .screen:last-child .screen-body');
  if (!body) return null;
  const max = body.scrollHeight - body.clientHeight;
  body.scrollTop = 99999;
  const after = body.scrollTop;
  const lastCard = body.querySelector('.quick-grid');
  const lr = lastCard ? lastCard.getBoundingClientRect() : null;
  const tabTop = document.querySelector('#tabbar').getBoundingClientRect().top;
  return { max, after, scrollable: max > 4 && after > 4, lastBottom: lr ? lr.bottom : 0, tabTop };
});
ok('首页内容可滚动', scrollInfo && scrollInfo.scrollable, JSON.stringify(scrollInfo));
ok('首页最后一项不被底部 Tab 遮挡', scrollInfo && scrollInfo.lastBottom <= scrollInfo.tabTop + 1,
   scrollInfo ? ('lastBottom=' + scrollInfo.lastBottom.toFixed(0) + ' tabTop=' + scrollInfo.tabTop.toFixed(0)) : 'null');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(150);
await page.evaluate(() => window.App.Nav.switchTab('home'));
await page.waitForTimeout(200);

// ============ 二~四、新建流程 + CTA 不被 Tab 遮挡 ============
await tap('.tab-item[data-arg="create"]');
await tap('.stack[data-tab="create"] .scene-item[data-arg="travel"]');
let r = await rect(CTA);
ok('新建页「下一步」按钮存在', !!r, 'null');
ok('新建页「下一步」不被底部 Tab 遮挡', r && r.bottom <= r.tabTop + 1,
   r ? ('btnBottom=' + r.bottom.toFixed(0) + ' tabTop=' + r.tabTop.toFixed(0)) : 'null');

const before1 = await listsCount();
await tap(CTA); // 下一步 → 条件页
r = await rect(CTA);
ok('条件页「生成清单」不被底部 Tab 遮挡', r && r.bottom <= r.tabTop + 1,
   r ? ('btnBottom=' + r.bottom.toFixed(0) + ' tabTop=' + r.tabTop.toFixed(0)) : 'null');
await tap(CTA); // 生成清单
const after1 = await listsCount();
ok('新建→旅行→条件→生成 创建出实际清单', after1 === before1 + 1, 'before=' + before1 + ' after=' + after1);
ok('生成后进入清单详情页（含筛选条）', await activeHas('.filter-row'));

// ============ 五、首页快捷选择三大场景 ============
async function quickFlow(sceneArg, expectKind) {
  await page.evaluate(() => window.App.Nav.switchTab('home'));
  await page.waitForTimeout(200);
  const before = await listsCount();
  await tap('.quick-item[data-arg="' + sceneArg + '"]');
  let rr = await rect(CTA);
  ok('快捷「' + sceneArg + '」→条件页 CTA 不被遮挡', rr && rr.bottom <= rr.tabTop + 1,
     rr ? ('btnBottom=' + rr.bottom.toFixed(0) + ' tabTop=' + rr.tabTop.toFixed(0)) : 'null');
  await tap(CTA);
  const after = await listsCount();
  ok('快捷「' + sceneArg + '」→ 生成清单', after === before + 1, 'before=' + before + ' after=' + after);
  const kind = await page.evaluate(() => window.App.DB.data.lists[0] ? window.App.DB.data.lists[0].kind : null);
  ok('快捷「' + sceneArg + '」生成类型正确(' + expectKind + ')', kind === expectKind, 'got ' + kind);
  ok('快捷「' + sceneArg + '」生成后进入清单详情页', await activeHas('.filter-row'));
}
await quickFlow('travel', 'travel');
await quickFlow('moving', 'move');
await quickFlow('catready', 'cat');

// ============ 六、长清单详情页滚动 + 最后一项不被遮挡 ============
await page.evaluate(() => window.App.Nav.popToRoot('home'));
await page.waitForTimeout(200);
await tap('.stack[data-tab="home"] .mini-card');
const longInfo = await page.evaluate(() => {
  const body = document.querySelector('.stack.active .screen:last-child .screen-body');
  const max = body.scrollHeight - body.clientHeight;
  body.scrollTop = 99999;
  const after = body.scrollTop;
  const rows = body.querySelectorAll('.row');
  const last = rows[rows.length - 1];
  const lr = last ? last.getBoundingClientRect() : null;
  const tabTop = document.querySelector('#tabbar').getBoundingClientRect().top;
  return { max, after, scrollable: max > 4 && after > 4, lastBottom: lr ? lr.bottom : 0, tabTop };
});
ok('清单详情页长内容可滚动', longInfo && longInfo.scrollable, JSON.stringify(longInfo));
ok('清单详情页最后一项不被底部 Tab 遮挡', longInfo && longInfo.lastBottom <= longInfo.tabTop + 1,
   longInfo ? ('lastBottom=' + longInfo.lastBottom.toFixed(0) + ' tabTop=' + longInfo.tabTop.toFixed(0)) : 'null');

// ============ 七、返回 ============
await page.evaluate(() => window.App.Nav.pop());
await page.waitForTimeout(300);
ok('返回首页成功', await activeHas('.quick-grid') || await activeHas('.mini-card'));

// ============ 八、三段式行交互（真实浏览器 + FLIP 沉底）============
// 打开一份「非搬家」清单（三段式行：左完成 / 中内容 / 右不需要）
const openSel = await page.evaluate(() => {
  const l = window.App.DB.data.lists.find((x) => x.kind !== 'move');
  return l ? '.stack.active [data-tap="open-list"][data-arg="' + l.id + '"]' : null;
});
ok('存在可测试的非搬家清单', !!openSel, 'null');
await tap(openSel);
await page.waitForTimeout(300);

const rowId0 = await page.evaluate(() => {
  const r = document.querySelector('.stack.active .row[data-iid]');
  return r ? r.getAttribute('data-iid') : null;
});
ok('详情页存在清单行', !!rowId0, 'null');

// 左侧：完成按钮
await tap('.row[data-iid="' + rowId0 + '"] .row-check');
let doneCls = await page.evaluate((id) => {
  const r = document.querySelector('.row[data-iid="' + id + '"]');
  return r ? r.classList.contains('done') : false;
}, rowId0);
ok('左侧完成按钮 → 行带 done（淡化+细线划线）', doneCls);

// 取消完成
await tap('.row[data-iid="' + rowId0 + '"] .row-check');
doneCls = await page.evaluate((id) => {
  const r = document.querySelector('.row[data-iid="' + id + '"]');
  return r ? r.classList.contains('done') : false;
}, rowId0);
ok('再点左侧 → 取消完成', !doneCls);

// 右侧「不需要」→ 灰化 + 沉到同分类最末（FLIP）
await tap('.row[data-iid="' + rowId0 + '"] .row-skip');
await page.waitForTimeout(450); // 等 FLIP 动画结束
const sinkInfo = await page.evaluate((id) => {
  const row = document.querySelector('.row[data-iid="' + id + '"]');
  const cat = row ? row.closest('.rows') : null;
  const sameCat = cat ? Array.from(cat.querySelectorAll('.row[data-iid]')).map((r) => r.getAttribute('data-iid')) : [];
  const skipBtn = row ? row.querySelector('.row-skip') : null;
  return {
    last: sameCat[sameCat.length - 1],
    id,
    skip: row ? row.classList.contains('skip') : false,
    text: skipBtn ? skipBtn.textContent.trim() : ''
  };
}, rowId0);
ok('右侧「不需要」→ 行带 skip 灰化样式', sinkInfo.skip, JSON.stringify(sinkInfo));
ok('「不需要」按钮文案变「恢复」', sinkInfo.text === '恢复', sinkInfo.text);
ok('「不需要」项沉到同分类最末', sinkInfo.last === rowId0, 'last=' + sinkInfo.last + ' id=' + rowId0);

// 恢复为正常
await tap('.row[data-iid="' + rowId0 + '"] .row-skip');
await page.waitForTimeout(450);
const restored = await page.evaluate((id) => {
  const row = document.querySelector('.row[data-iid="' + id + '"]');
  if (!row) return false;
  const btn = row.querySelector('.row-skip');
  return !row.classList.contains('skip') && btn && btn.textContent.trim() === '不需要';
}, rowId0);
ok('再点「恢复」→ 回到正常未完成、按钮文案恢复「不需要」', restored);

// 点文字区域不误触发
const beforeSkip = await page.evaluate((id) => {
  const l = window.App.DB.data.lists.find((x) => x.kind !== 'move');
  let s = null; l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === id) s = it.status; }));
  return s;
}, rowId0);
await tap('.row[data-iid="' + rowId0 + '"] .row-main');
const afterSkip = await page.evaluate((id) => {
  const l = window.App.DB.data.lists.find((x) => x.kind !== 'move');
  let s = null; l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === id) s = it.status; }));
  return s;
}, rowId0);
ok('点击文字区域不误触发状态变更', beforeSkip === afterSkip, 'before=' + beforeSkip + ' after=' + afterSkip);

await browser.close();

console.log('\n===== 真实浏览器交互测试（iPhone 390×844 / 390×640）=====');
console.log(log.join('\n'));
console.log('\n结果： ' + pass + ' 通过 / ' + fail + ' 失败');
if (errors.length) { console.log('\n⚠️ 控制台/页面错误：\n' + errors.slice(0, 10).join('\n')); }
process.exit(fail === 0 && errors.length === 0 ? 0 : 1);
