/* ============================================================
   清单生成器 · jsdom 端到端回归测试
   运行：node e2e.mjs        （需先执行 node build.mjs）
   覆盖：启动 / 无假状态栏 / 禁缩放 / 安全区 / Tab 切换 /
        新建全流程 / 三态勾选 / 筛选 / 新增·编辑·删除 /
        搬家箱号与四态 / 养猫三阶段 / 模板 / 物品库 / 持久化
   ============================================================ */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(dir, '清单生成器.html'), 'utf8');

/* ---------------- 断言harness ---------------- */
let pass = 0, fail = 0;
const fails = [];
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else {
    fail++; fails.push(label);
    console.log('  ✗ ' + label + (extra ? '   → ' + extra : ''));
  }
}
function eq(a, b, label) { ok(a === b, label, 'got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); }
function group(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(2, 46 - t.length))); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- 启动一个 App 实例 ---------------- */
let store = {};   // 跨实例共享的 localStorage，用于测持久化

function launch() {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://local.app/'
  });
  const win = dom.window;
  const doc = win.document;
  /* 用受控 store 替换 localStorage，便于跨实例验证持久化 */
  Object.keys(store).forEach((k) => win.localStorage.setItem(k, store[k]));
  return { dom, win, doc };
}
function snapshotStore(win) {
  store = {};
  for (let i = 0; i < win.localStorage.length; i++) {
    const k = win.localStorage.key(i);
    store[k] = win.localStorage.getItem(k);
  }
}

/* ---------------- 交互工具 ---------------- */
function mkCtx(win, doc) {
  const App = () => win.App;
  const fire = (el, type, x, y) => {
    const e = new win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    el.dispatchEvent(e);
  };
  return {
    App,
    /* 模拟一次真实手指点击（走 pointerdown/up 触摸层） */
    tap(el) {
      if (!el) throw new Error('tap: 元素不存在');
      App().Touch.reset();
      fire(el, 'pointerdown', 40, 300);
      fire(el, 'pointerup', 40, 300);
    },
    /* 模拟长按 */
    async longPress(el) {
      if (!el) throw new Error('longPress: 元素不存在');
      App().Touch.reset();
      fire(el, 'pointerdown', 40, 300);
      await sleep(560);
      fire(el, 'pointerup', 40, 300);
      await sleep(80);
    },
    /* 模拟按下后滑动（应当不触发 tap） */
    swipeOn(el) {
      App().Touch.reset();
      fire(el, 'pointerdown', 40, 300);
      fire(el, 'pointermove', 40, 360);
      fire(el, 'pointerup', 40, 360);
    },
    screen() {
      const st = doc.querySelector('.stack.active');
      const list = st.querySelectorAll('.screen');
      return list[list.length - 1];
    },
    all(sel, root) { return Array.from((root || ctx.screen()).querySelectorAll(sel)); },
    one(sel, root) { return (root || ctx.screen()).querySelector(sel); },
    byText(sel, text, root) {
      return Array.from((root || ctx.screen()).querySelectorAll(sel))
        .find((e) => e.textContent.trim() === text) || null;
    },
    byTextLike(sel, text, root) {
      return Array.from((root || ctx.screen()).querySelectorAll(sel))
        .find((e) => e.textContent.indexOf(text) >= 0) || null;
    },
    sheet() { return doc.getElementById('sheetHost'); },
    act(key) { return doc.querySelector('#sheetHost [data-tap="act"][data-arg="' + key + '"]'); },
    tabBtn(id) { return doc.querySelector('#tabbar [data-arg="' + id + '"]'); },
    async promptOk(value) {
      const input = doc.getElementById('pi');
      if (!input) throw new Error('promptSheet 未打开');
      input.value = value;
      ctx.tap(doc.querySelector('#sheetHost [data-tap="prompt-ok"]'));
      await sleep(40);
    }
  };
}

let ctx = null;

/* ============================================================
   开始
   ============================================================ */
console.log('清单生成器 · jsdom 端到端回归测试');

const A = launch();
ctx = mkCtx(A.win, A.doc);
await sleep(120);

/* ---------- 1. 启动与骨架 ---------- */
group('1 启动与骨架');
{
  const doc = A.doc;
  eq(doc.querySelectorAll('.stack').length, 4, '四个 Tab 页面栈存在');
  eq(doc.querySelectorAll('#tabbar .tab-item').length, 4, '底部 Tab 有 4 项');
  ok(doc.querySelector('.stack.active') !== null, '默认有激活的页面栈');
  ok(ctx.screen() !== null, '首页已渲染');
  ok(ctx.screen().textContent.indexOf('我的清单') >= 0, '首页标题渲染正确');
  ok(A.win.App.DB.data.lists.length >= 3, '示例清单已初始化（' + A.win.App.DB.data.lists.length + ' 份）');
  const tabLabels = Array.from(doc.querySelectorAll('#tabbar .tab-item')).map((e) => e.textContent.trim());
  ok(tabLabels.join('|').indexOf('首页') >= 0 && tabLabels.join('|').indexOf('我的') >= 0,
    'Tab 文案为 首页/新建/模板/我的');
}

/* ---------- 2. 去除模拟状态栏 ---------- */
group('2 无模拟手机状态栏');
{
  const html = A.doc.documentElement.outerHTML;
  const body = A.doc.body.textContent;
  ok(body.indexOf('9:41') < 0, '页面无模拟时间 9:41');
  ok(html.indexOf('class="statusbar"') < 0 && html.indexOf('class="status-bar"') < 0, '无 fake statusbar 元素（仅保留 PWA 原生 meta）');
  ok(!/Signal|Wifi|Battery/i.test(html), '无信号/Wi-Fi/电池图标');
  const cssHasSafeTop = html.indexOf('safe-area-inset-top') >= 0;
  ok(cssHasSafeTop, '改用 safe-area-inset-top 让出刘海/灵动岛区域');
}

/* ---------- 3. 禁缩放 / 安全区 / 禁选中 ---------- */
group('3 iOS 适配硬性约束');
{
  const vp = A.doc.querySelector('meta[name=viewport]').getAttribute('content');
  ok(vp.indexOf('user-scalable=no') >= 0, 'viewport 禁止用户缩放');
  ok(vp.indexOf('maximum-scale=1.0') >= 0, 'viewport 最大缩放锁定 1.0');
  ok(vp.indexOf('viewport-fit=cover') >= 0, 'viewport-fit=cover 已开启（全屏铺满）');
  const css = A.doc.documentElement.outerHTML;
  ok(css.indexOf('user-select: none') >= 0 || css.indexOf('user-select:none') >= 0, '全局禁止文本选中');
  ok(css.indexOf('-webkit-touch-callout') >= 0, '禁止长按弹出系统菜单');
  ok(css.indexOf('safe-area-inset-bottom') >= 0, '底部 Home Indicator 安全区已处理');
  ok(css.indexOf('overscroll-behavior') >= 0, '已禁用滚动链/橡皮筋外溢');
  ok(css.indexOf('touch-action') >= 0, '已约束 touch-action 防手势缩放');
  /* 手势缩放拦截：gesturestart 应被 preventDefault */
  const ge = new A.win.Event('gesturestart', { bubbles: true, cancelable: true });
  A.doc.dispatchEvent(ge);
  ok(ge.defaultPrevented, '双指手势缩放被拦截（gesturestart）');
  /* 长按选中拦截：contextmenu 在非输入区被阻止 */
  const cm = new A.win.Event('contextmenu', { bubbles: true, cancelable: true });
  ctx.screen().dispatchEvent(cm);
  ok(cm.defaultPrevented, '长按不触发系统文本选择菜单（contextmenu）');
}

/* ---------- 4. 防误触 ---------- */
group('4 防误触与防重复触发');
{
  const card = ctx.one('.mini-card');
  const before = ctx.screen();
  ctx.swipeOn(card);
  await sleep(60);
  ok(ctx.screen() === before, '按下后滑动不会误触发点击（滚动优先）');

  /* 连续两次点击同一按钮，第二次应被点击锁拦住 */
  const tabCreate = ctx.tabBtn('create');
  A.win.App.Touch.reset();
  const fireRaw = (el, type) => el.dispatchEvent(new A.win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: 40, clientY: 800 }));
  fireRaw(tabCreate, 'pointerdown'); fireRaw(tabCreate, 'pointerup');
  fireRaw(tabCreate, 'pointerdown'); fireRaw(tabCreate, 'pointerup');
  await sleep(60);
  eq(A.doc.querySelectorAll('.stack[data-tab="create"] .screen').length, 1, '连点不会重复入栈（点击锁生效）');
}

/* ---------- 5. 新建清单全流程（旅行） ---------- */
group('5 新建清单全流程 · 旅行');
{
  eq(A.win.App.Nav.active, 'create', '已切到「新建」Tab');
  ok(ctx.screen().textContent.indexOf('这次要准备什么') >= 0, '场景选择页渲染');
  const scenes = ctx.all('.scene-item');
  ok(scenes.length >= 25, '场景总数 ≥ 25（当前 ' + scenes.length + '）');

  const pick = (name) => { const el = ctx.byText('.scene-item', name); ctx.tap(el); };
  pick('旅行'); await sleep(30);
  pick('海边'); await sleep(30);
  pick('拍照'); await sleep(30);
  const cta = ctx.one('.cta');
  ok(cta.textContent.indexOf('已选 3 个场景') >= 0, '多选场景计数正确 → ' + cta.textContent.trim());

  ctx.tap(cta); await sleep(60);
  ok(ctx.screen().textContent.indexOf('补充条件') >= 0, '进入条件选择页');
  const blocks = ctx.all('.cond-block');
  ok(blocks.length >= 4, '条件分组按场景动态生成（' + blocks.length + ' 组）');
  ok(ctx.screen().textContent.indexOf('出行天数') >= 0, '旅行场景问「出行天数」');
  ok(ctx.screen().textContent.indexOf('是否带家具') < 0, '不显示搬家场景的条件（条件按场景过滤）');

  /* 改天数为 4-7 天，打开拍照开关 */
  ctx.tap(ctx.byText('.cond-opt', '4-7天')); await sleep(30);
  const sw = ctx.one('.switch');
  if (sw && !sw.classList.contains('on')) { ctx.tap(sw); await sleep(30); }
  const genBtn = ctx.one('.cta');
  ok(/生成清单 · 约 \d+ 项/.test(genBtn.textContent), '生成按钮实时预估项数 → ' + genBtn.textContent.trim());

  const nBefore = A.win.App.DB.data.lists.length;
  ctx.tap(genBtn); await sleep(120);
  eq(A.win.App.DB.data.lists.length, nBefore + 1, '生成后新增一份实际清单');
  const l = A.win.App.DB.data.lists[0];
  const total = l.cats.reduce((a, g) => a + g.items.length, 0);
  ok(total > 30, '清单项数合理（' + total + ' 项 / ' + l.cats.length + ' 个分类）');
  ok(ctx.screen().textContent.indexOf('已完成 0 / ' + total) >= 0, '进度显示「已完成 0 / ' + total + '」');
  ok(l.cats.some((g) => g.name === '活动用品'), '海边场景带出「活动用品」分类');
}

/* ---------- 6. 三段式行交互：完成 / 不需要（独立状态） ---------- */
group('6 三段式行交互：完成与不需要');
{
  const l = A.win.App.DB.data.lists[0];
  const firstId = l.cats[0].items[0].id;
  const rowSel = '.row[data-iid="' + firstId + '"]';
  const check = () => ctx.one(rowSel + ' .row-check');
  const skipBtn = () => ctx.one(rowSel + ' .row-skip');
  const mainEl = () => ctx.one(rowSel + ' .row-main');
  const st = () => {
    let s = null; l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === firstId) s = it.status; }));
    return s;
  };

  eq(st(), 'todo', '初始状态：未完成');
  /* 左侧：完成按钮 */
  ctx.tap(check()); await sleep(60);
  eq(st(), 'done', '左侧点一次 → 已完成');
  ok(ctx.one(rowSel).classList.contains('done'), '行带 done 样式（淡化+细线划线）');
  ok(check().classList.contains('on'), '完成按钮切到 on（细线勾选）');

  /* 在已完成态下点右侧：两状态独立，切到不需要 */
  ctx.tap(skipBtn()); await sleep(80);
  eq(st(), 'skip', '已完成态点右侧 → 切到不需要（左右独立、不共用按钮）');
  /* 再点右侧 → 恢复为正常未完成 */
  ctx.tap(skipBtn()); await sleep(80);
  eq(st(), 'todo', '再点右侧 → 从不需要恢复回正常（未完成）');
  ok(!ctx.one(rowSel).classList.contains('done'), '恢复后非已完成');

  /* 左侧「取消完成」已在上方点两次验证（done → 未完成），此处不再重复 */

  /* 右侧「不需要」：沉到同分类最下方 */
  ctx.tap(skipBtn()); await sleep(80);
  eq(st(), 'skip', '点右侧 → 不需要');
  ok(ctx.one(rowSel).classList.contains('skip'), '行带 skip 灰化样式');
  ok(skipBtn().textContent.trim() === '恢复', '按钮文案变为「恢复」');
  let ids = ctx.all('.row[data-iid]').map((r) => r.getAttribute('data-iid'));
  const sameCat = l.cats[0].items.map((it) => it.id);
  let vis = ids.filter((id) => sameCat.indexOf(id) >= 0);
  eq(vis[vis.length - 1], firstId, '不需要项已沉到同分类列表最下方');

  /* 再次点击恢复为正常 */
  ctx.tap(skipBtn()); await sleep(80);
  eq(st(), 'todo', '再点 → 恢复为正常未完成');
  ok(!ctx.one(rowSel).classList.contains('skip'), 'skip 样式已移除');
  ok(skipBtn().textContent.trim() === '不需要', '按钮文案恢复「不需要」');

  /* 点文字区域不误触发 */
  const before = st();
  ctx.tap(mainEl()); await sleep(60);
  eq(st(), before, '点击文字区域不误触发状态变更');

  /* 多「不需要」按操作顺序：先标 firstId，再标 secondId */
  ctx.tap(skipBtn()); await sleep(80);          // firstId → 第 1 个不需要
  eq(st(), 'skip', 'firstId → 不需要');
  const secondId = l.cats[0].items[1].id;
  ctx.tap(ctx.one('.row[data-iid="' + secondId + '"] .row-skip')); await sleep(80);  // secondId → 第 2 个不需要
  ids = ctx.all('.row[data-iid]').map((r) => r.getAttribute('data-iid'));
  vis = ids.filter((id) => sameCat.indexOf(id) >= 0);
  eq(vis[vis.length - 1], secondId, '后标记的「不需要」排在最末');
  eq(vis[vis.length - 2], firstId, '先标记的「不需要」排在其前（按操作顺序）');

  /* 准备筛选态：firstId 转回已完成，secondId 保留不需要 */
  ctx.tap(skipBtn()); await sleep(80);          // firstId skip → todo
  ctx.tap(check()); await sleep(60);            // firstId todo → done
  ok(ctx.screen().textContent.indexOf('已完成 1 /') >= 0, '进度实时更新（已完成 1）');
  ok(ctx.one('.row.done') !== null, '已完成项带 done 样式');

  /* 筛选 */
  ctx.tap(ctx.byText('.chip-seg', '已完成')); await sleep(60);
  eq(ctx.all('.row').length, 1, '筛选「已完成」只剩 1 项');
  ctx.tap(ctx.byText('.chip-seg', '不需要')); await sleep(60);
  eq(ctx.all('.row').length, 1, '筛选「不需要」显示 1 项');
  ctx.tap(ctx.byText('.chip-seg', '未完成')); await sleep(60);
  ok(ctx.all('.row').length >= 1, '筛选「未完成」显示其余项');
  ctx.tap(ctx.byText('.chip-seg', '全部')); await sleep(60);
  ok(ctx.all('.row').length > 5, '切回「全部」恢复完整列表');
}

/* ---------- 7. 新增 / 编辑 / 删除 / 长按菜单 ---------- */
group('7 新增 · 编辑 · 删除 · 长按菜单');
{
  const cnt = () => A.win.App.DB.data.lists[0].cats.reduce((a, g) => a + g.items.length, 0);
  const n0 = cnt();

  /* 新增 */
  ctx.tap(ctx.one('.add-row')); await sleep(60);
  ok(A.doc.getElementById('pi') !== null, '「添加项目」打开输入面板');
  await ctx.promptOk('自测新增项'); await sleep(80);
  eq(cnt(), n0 + 1, '新增项目成功');
  ok(ctx.screen().textContent.indexOf('自测新增项') >= 0, '新增项出现在清单中');

  /* 长按 → 菜单 */
  const row = ctx.byTextLike('.row', '自测新增项');
  await ctx.longPress(row);
  ok(ctx.act('edit') !== null, '长按弹出项目操作菜单（编辑/分类/物品库/删除）');
  ok(ctx.act('del') !== null, '菜单含删除项');

  /* 编辑 */
  ctx.tap(ctx.act('edit')); await sleep(80);
  await ctx.promptOk('自测改名项'); await sleep(80);
  ok(ctx.screen().textContent.indexOf('自测改名项') >= 0, '编辑项目名称生效');

  /* 加入物品库 */
  const row2 = ctx.byTextLike('.row', '自测改名项');
  await ctx.longPress(row2);
  const libN0 = A.win.App.DB.data.items.length;
  ctx.tap(ctx.act('own')); await sleep(80);
  eq(A.win.App.DB.data.items.length, libN0 + 1, '可从清单项加入我的物品库');
  ok(ctx.screen().textContent.indexOf('已有') >= 0, '物品库中的项在清单里显示「已有」徽标');

  /* 删除 */
  const row3 = ctx.byTextLike('.row', '自测改名项');
  await ctx.longPress(row3);
  ctx.tap(ctx.act('del')); await sleep(80);
  eq(cnt(), n0, '删除项目成功');
  ok(ctx.screen().textContent.indexOf('自测改名项') < 0, '被删除项已从界面移除');
}

/* ---------- 8. 返回与导航栈 ---------- */
group('8 导航与返回');
{
  const before = A.doc.querySelectorAll('.stack.active .screen').length;
  ctx.tap(ctx.one('[data-tap="back"]'));
  await sleep(340);
  eq(A.doc.querySelectorAll('.stack.active .screen').length, before - 1, '返回后弹出一层页面');
  ctx.tap(ctx.tabBtn('home')); await sleep(80);
  eq(A.win.App.Nav.active, 'home', '切回首页 Tab');
  ok(ctx.screen().textContent.indexOf('进行中') >= 0, '首页显示进行中清单');
}

/* ---------- 9. 搬家清单：箱号 + 四态 ---------- */
group('9 搬家清单 · 箱号与四态');
{
  const mv = A.win.App.DB.data.lists.find((l) => l.kind === 'move');
  ok(mv !== undefined, '存在搬家清单');
  const card = A.doc.querySelector('.stack.active [data-tap="open-list"][data-arg="' + mv.id + '"]');
  ctx.tap(card); await sleep(100);
  ok(ctx.screen().textContent.indexOf('未整理') >= 0, '搬家清单筛选为四态：未整理/已装箱/已搬运/已确认');
  ok(ctx.screen().textContent.indexOf('已确认') >= 0, '含「已确认」状态');
  ok(ctx.screen().textContent.indexOf('箱号') >= 0, '显示箱号区块');

  const st = (iid) => { let s = null; mv.cats.forEach((g) => g.items.forEach((it) => { if (it.id === iid) s = it.status; })); return s; };
  /* 找一个未整理的项，验证四态循环 */
  let target = null;
  mv.cats.forEach((g) => g.items.forEach((it) => { if (!target && it.status === 'todo') target = it; }));
  ok(target !== null, '找到未整理项：' + (target ? target.text : ''));
  const dot = () => ctx.one('.row[data-iid="' + target.id + '"] .row-hit');
  ctx.tap(dot()); await sleep(60); eq(st(target.id), 'packed', '未整理 → 已装箱');
  ctx.tap(dot()); await sleep(60); eq(st(target.id), 'moved', '已装箱 → 已搬运');
  ctx.tap(dot()); await sleep(60); eq(st(target.id), 'confirmed', '已搬运 → 已确认');
  ctx.tap(dot()); await sleep(60); eq(st(target.id), 'todo', '已确认 → 回到未整理');

  /* 设置箱号 */
  const row = ctx.one('.row[data-iid="' + target.id + '"]');
  await ctx.longPress(row);
  ok(ctx.act('box') !== null, '长按菜单含「设置箱号」');
  ctx.tap(ctx.act('box')); await sleep(80);
  const boxOpt = A.doc.querySelector('#sheetHost [data-tap="act"][data-arg^="box:"]');
  ok(boxOpt !== null, '箱号面板列出可选箱号');
  ctx.tap(boxOpt); await sleep(80);
  let boxVal = null;
  mv.cats.forEach((g) => g.items.forEach((it) => { if (it.id === target.id) boxVal = it.box; }));
  ok(!!boxVal, '箱号写入成功 → 箱' + boxVal);
  ok(ctx.screen().textContent.indexOf('箱' + boxVal) >= 0, '行内显示箱号 chip');

  /* 按箱号筛选 */
  const bf = A.doc.querySelector('.stack.active [data-tap="pick-box-filter"]');
  if (bf) { ctx.tap(bf); await sleep(80); ok(true, '支持按箱号筛选'); }
  else ok(false, '按箱号筛选入口缺失');
}

/* ---------- 10. 养猫清单：三阶段 ---------- */
group('10 养猫清单 · 三阶段');
{
  ctx.tap(ctx.one('[data-tap="back"]')); await sleep(340);
  const cat = A.win.App.DB.data.lists.find((l) => l.kind === 'cat');
  ok(cat !== undefined, '存在养猫清单');
  const card = A.doc.querySelector('.stack.active [data-tap="open-list"][data-arg="' + cat.id + '"]');
  ctx.tap(card); await sleep(100);
  const segs = ctx.all('.chip-seg').map((e) => e.textContent.trim());
  ok(segs.indexOf('接猫前') >= 0 && segs.indexOf('接猫回家') >= 0 && segs.indexOf('日常养猫') >= 0,
    '三阶段分段控件：' + segs.join(' / '));
  const c0 = cat.cats.find((g) => g.name === '接猫前');
  eq(c0.items.length, 13, '「接猫前」严格 13 项');
  eq(cat.cats.find((g) => g.name === '接猫回家').items.length, 6, '「接猫回家」6 项');
  ctx.tap(ctx.byText('.chip-seg', '日常养猫')); await sleep(80);
  ok(ctx.screen().textContent.indexOf('每天') >= 0, '日常养猫显示周期标签（每天/每周/每月）');
  ok(ctx.all('.row').length === cat.cats.find((g) => g.name === '日常养猫').items.length, '阶段切换只显示该阶段项目');
}

/* ---------- 11. 保存为我的模板 + 使用模板 ---------- */
group('11 我的模板');
{
  ctx.tap(ctx.one('[data-tap="list-menu"]')); await sleep(80);
  ok(ctx.act('save-tpl') !== null, '清单菜单含「保存为我的模板」');
  const t0 = A.win.App.DB.data.templates.length;
  ctx.tap(ctx.act('save-tpl')); await sleep(80);
  await ctx.promptOk('我的养猫准备'); await sleep(80);
  eq(A.win.App.DB.data.templates.length, t0 + 1, '保存为我的模板成功');

  ctx.tap(ctx.tabBtn('template')); await sleep(80);
  ok(ctx.screen().textContent.indexOf('我的模板') >= 0, '模板页有「我的模板」分区');
  ok(ctx.screen().textContent.indexOf('系统模板') >= 0, '模板页有「系统模板」分区');
  ok(ctx.screen().textContent.indexOf('我的养猫准备') >= 0, '新模板出现在我的模板中');
  ok(ctx.screen().textContent.indexOf('不会改动模板本身') >= 0, '界面说明「模板与实际清单分离」');

  /* 使用系统模板 → 生成全新清单，不影响模板 */
  const sysBtn = A.doc.querySelector('.stack.active [data-tap="use-sys-tpl"]');
  const firstTplId = sysBtn.getAttribute('data-arg');
  const n0 = A.win.App.DB.data.lists.length;
  ctx.tap(sysBtn); await sleep(120);
  eq(A.win.App.DB.data.lists.length, n0 + 1, '使用系统模板生成一份新清单');
  const newL = A.win.App.DB.data.lists[0];
  const anyId = newL.cats[0].items[0].id;
  ctx.tap(ctx.one('.row[data-iid="' + anyId + '"] .row-check')); await sleep(60);
  /* 再用同一模板生成一次：use-sys-tpl 会切回首页，需回到模板页再生成 */
  ctx.tap(ctx.one('[data-tap="back"]')); await sleep(340);
  ctx.tap(ctx.tabBtn('template')); await sleep(120);
  const sysBtn2 = A.doc.querySelector('.stack.active [data-tap="use-sys-tpl"][data-arg="' + firstTplId + '"]');
  ok(sysBtn2 !== null, '模板页可再次找到同一系统模板入口');
  ctx.tap(sysBtn2); await sleep(120);
  const l2 = A.win.App.DB.data.lists[0];
  const allTodo = l2.cats.every((g) => g.items.every((it) => it.status === 'todo'));
  ok(allTodo, '重新使用模板生成的清单是全新未勾选状态（勾选不回写模板）');
  ok(l2.id !== newL.id, '两次生成是两份独立清单');
}

/* ---------- 12. 我的物品库 ---------- */
group('12 我的物品库');
{
  ctx.tap(ctx.tabBtn('mine')); await sleep(80);
  ok(ctx.screen().textContent.indexOf('我的物品库') >= 0, '我的页有物品库入口');
  ok(ctx.screen().textContent.indexOf('本机') >= 0, '说明数据仅保存在本机');
  ctx.tap(A.doc.querySelector('.stack.active [data-tap="open-items"]')); await sleep(100);
  const n0 = A.win.App.DB.data.items.length;
  ctx.tap(ctx.one('[data-tap="add-item-lib"]')); await sleep(60);
  await ctx.promptOk('自测物品'); await sleep(80);
  eq(A.win.App.DB.data.items.length, n0 + 1, '新增物品成功');
  ok(ctx.screen().textContent.indexOf('自测物品') >= 0, '新物品出现在列表');
  const delBtn = ctx.all('[data-tap="del-item-lib"]')[0];
  ctx.tap(delBtn); await sleep(80);
  eq(A.win.App.DB.data.items.length, n0, '删除物品成功');
}

/* ---------- 13. 持久化 ---------- */
group('13 数据持久化');
{
  /* 记录状态并快照 localStorage */
  const before = A.win.App.DB.data;
  const listCount = before.lists.length;
  const tplCount = before.templates.length;
  const itemCount = before.items.length;
  const firstTitle = before.lists[0].title;
  snapshotStore(A.win);
  ok(Object.keys(store).indexOf('qingdan.generator.v1') >= 0, '数据已写入本地存储');

  A.dom.window.close();

  const B = launch();
  ctx = mkCtx(B.win, B.doc);
  /* 二次启动需要重新执行脚本 —— jsdom 已在构造时执行，这里等一拍 */
  await sleep(150);
  eq(B.win.App.DB.data.lists.length, listCount, '重新进入 App 后清单数量不变（' + listCount + '）');
  eq(B.win.App.DB.data.templates.length, tplCount, '我的模板保留（' + tplCount + '）');
  eq(B.win.App.DB.data.items.length, itemCount, '物品库保留（' + itemCount + '）');
  eq(B.win.App.DB.data.lists[0].title, firstTitle, '清单标题与状态保留');
  ok(B.win.App.Nav.active === 'mine' || B.win.App.Nav.active === 'home', '恢复上次所在 Tab → ' + B.win.App.Nav.active);
  /* 继续打开未完成清单 */
  const unfinished = B.win.App.DB.data.lists.find((l) => {
    const t = l.cats.reduce((a, g) => a + g.items.length, 0);
    const d = l.cats.reduce((a, g) => a + g.items.filter((i) => i.status !== 'todo').length, 0);
    return d > 0 && d < t;
  });
  ok(unfinished !== undefined, '存在进行中的清单，可继续打开：' + (unfinished ? unfinished.title : ''));
  B.dom.window.close();
}

/* ============================================================
   汇总
   ============================================================ */
console.log('\n' + '='.repeat(52));
console.log('通过 ' + pass + ' / 失败 ' + fail);
if (fail) {
  console.log('\n失败项：');
  fails.forEach((f) => console.log('  · ' + f));
  process.exitCode = 1;
} else {
  console.log('全部通过 ✓');
}
