/* ============================================================
   清单生成器 · 页面渲染与业务逻辑
   ============================================================ */
(function () {
'use strict';

const A = window.App, D = window.Data;
const { $, $$, esc, uid, svg, dotSvg, DB, Nav, Sheet, actionSheet, promptSheet, toast, Bus } = A;

const STATUS_FLOW = {
  travel: ['todo', 'done', 'skip'],
  life: ['todo', 'done', 'skip'],
  cat: ['todo', 'done', 'skip'],
  move: ['todo', 'packed', 'moved', 'confirmed']
};
const MOVE_LABEL = { todo: '未整理', packed: '已装箱', moved: '已搬运', confirmed: '已确认' };

/* ============================================================
   数据操作
   ============================================================ */
function save() { DB.save(); }

function getList(id) { return DB.data.lists.find((l) => l.id === id); }
function getTpl(id) { return DB.data.templates.find((t) => t.id === id); }
/* 跨所有清单按 id 查找清单项（左/右按钮都只改这一条的状态） */
function findItem(id) {
  let found = null;
  DB.data.lists.forEach((l) => l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === id) found = it; })));
  return found;
}

function stats(list) {
  let total = 0, done = 0, skip = 0, todo = 0, packed = 0, moved = 0, confirmed = 0;
  list.cats.forEach((g) => g.items.forEach((it) => {
    total++;
    if (list.kind === 'move') {
      if (it.status === 'packed') packed++;
      else if (it.status === 'moved') moved++;
      else if (it.status === 'confirmed') confirmed++;
      else todo++;
    } else {
      if (it.status === 'done') done++;
      else if (it.status === 'skip') skip++;
      else todo++;
    }
  }));
  if (list.kind === 'move') {
    const completed = moved + confirmed;
    return { total: total, done: completed, skip: 0, todo: todo, packed: packed, pct: total ? Math.round(completed / total * 100) : 0, label: '已搬运' };
  }
  const base = total - skip;
  return { total: total, done: done, skip: skip, todo: base - done, packed: 0, pct: base ? Math.round(done / base * 100) : 0, label: '已完成', base: base };
}

function hasItem(name) {
  const n = String(name || '');
  return DB.data.items.some((it) => n.indexOf(it.name) >= 0 || it.name.indexOf(n) >= 0);
}

function createList(sceneIds, conds, title) {
  const res = D.generate(sceneIds, conds);
  const list = {
    id: uid(),
    kind: res.kind,
    title: title || D.defaultTitle(sceneIds, conds),
    scenes: sceneIds.slice(),
    conds: JSON.parse(JSON.stringify(conds)),
    createdAt: Date.now(),
    filter: 'all',
    cats: res.cats.map((g) => ({
      name: g.name,
      items: g.items.map((it) => ({
        id: uid(), text: it.text, qty: it.qty || 0,
        sub: it.sub || '', cycle: it.cycle || '',
        status: 'todo', box: '', skipAt: 0
      }))
    }))
  };
  DB.data.lists.unshift(list);
  save();
  return list;
}

function pushRecent(sceneIds) {
  sceneIds.forEach((id) => {
    const i = DB.data.recent.indexOf(id);
    if (i >= 0) DB.data.recent.splice(i, 1);
    DB.data.recent.unshift(id);
  });
  DB.data.recent = DB.data.recent.slice(0, 8);
}

/* ============================================================
   通用片段
   ============================================================ */
function navBar(opts) {
  const canBack = opts.back;
  return '<div class="navbar">' +
    '<div class="nav-side">' +
    (canBack ? '<button class="nav-btn" data-tap="back" aria-label="返回">' + svg('back', 'chev') + '</button>' : '') +
    '</div>' +
    '<div class="nav-title">' + esc(opts.title) + '</div>' +
    '<div class="nav-side right">' +
    (opts.right || '') +
    '</div>' +
    '</div>';
}

function progressCard(list) {
  const s = stats(list);
  const note = list.kind === 'move'
    ? '完成度 ' + s.pct + '% · ' + s.packed + ' 项已装箱 · ' + s.todo + ' 项未整理'
    : '完成度 ' + s.pct + '% · ' + s.skip + ' 项不需要 · ' + s.todo + ' 项待完成';
  return '<div class="progress-card">' +
    '<div class="progress-top">' +
    '<span class="progress-status">' + (s.done >= s.total && s.total ? '已全部完成' : '进行中') + '</span>' +
    '<span class="progress-count">' + s.label + ' ' + s.done + ' / ' + (list.kind === 'move' ? s.total : s.base) + '</span>' +
    '</div>' +
    '<div class="progress-track"><div class="progress-fill" style="width:' + s.pct + '%"></div></div>' +
    '<div class="progress-note">' + note + '</div>' +
    '</div>';
}

/* ============================================================
   01 首页
   ============================================================ */
function homePage() {
  return {
    render() {
      const now = new Date();
      const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
      const dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + wk;
      const running = DB.data.lists.filter((l) => stats(l).done < (l.kind === 'move' ? stats(l).total : stats(l).base));

      const cards = running.length
        ? running.slice(0, 6).map((l) => {
          const s = stats(l);
          const sub = l.kind === 'move' ? '按房间 · 含箱号' : (l.kind === 'cat' ? '分阶段 · 周期事项' : (l.cats.length + ' 个分类'));
          return '<button class="mini-card" data-tap="open-list" data-arg="' + l.id + '">' +
            '<div class="mini-head"><span class="mini-name">' + esc(l.title) + '</span>' +
            '<span class="mini-num">' + s.done + ' / ' + (l.kind === 'move' ? s.total : s.base) + '</span></div>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + s.pct + '%"></div></div>' +
            '<div class="mini-sub">' + esc(sub) + ' · 完成度 ' + s.pct + '%</div>' +
            '</button>';
        }).join('')
        : '<div class="card pad"><div class="empty">' + svg('plus', 'ico') +
          '<div class="t1x">还没有进行中的清单</div><div class="t2x">点下方「新建」，选个场景就能自动生成清单</div></div></div>';

      const recent = DB.data.recent.filter((id) => D.SCENE_MAP[id]);
      const recentHtml = recent.length
        ? '<div class="chips-scroll">' + recent.map((id) =>
          '<button class="chip-tag" data-tap="quick-scene" data-arg="' + id + '">' + esc(D.SCENE_MAP[id].name) + '</button>'
        ).join('') + '</div>'
        : '<div class="meta-line">还没有使用记录，新建一份清单后会出现在这里</div>';

      const quick = [
        { id: 'travel', name: '旅行', icon: 'plane' },
        { id: 'moving', name: '搬家', icon: 'sofa' },
        { id: 'catready', name: '养猫', icon: 'cat' },
        { id: 'party', name: '聚会', icon: 'party' }
      ].map((q) =>
        '<button class="quick-item" data-tap="quick-start" data-arg="' + q.id + '">' +
        svg(q.icon, 'quick-ico') + '<span class="quick-name">' + q.name + '</span></button>'
      ).join('');

      return '<div class="safe-top"></div>' +
        '<div class="screen-body">' +
        '<div class="page-head"><h1>我的清单</h1>' +
        '<button class="round-btn grey" data-tap="search" aria-label="搜索">' + svg('search', '') + '</button></div>' +
        '<div class="meta-line">' + dateStr + '</div>' +
        '<div class="section-row"><span class="section-title">进行中</span>' +
        '<button class="more" data-tap="history">全部清单</button></div>' +
        cards +
        '<div class="section-title">最近使用</div>' + recentHtml +
        '<div class="section-title">快速新建</div>' +
        '<div class="quick-grid">' + quick + '</div>' +
        '</div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* ============================================================
   02 新建 · 选择场景
   ============================================================ */
const draft = { scenes: [], conds: {} };

function condsForScenes(ids) {
  const set = [];
  ids.forEach((id) => {
    const s = D.SCENE_MAP[id];
    if (!s || !s.conds) return;
    s.conds.forEach((c) => { if (set.indexOf(c) < 0) set.push(c); });
  });
  return set;
}

function createPage() {
  return {
    render() {
      draft.conds = {};
      const n = draft.scenes.length;
      const groups = D.GROUPS.map((g) => {
        const items = D.SCENES.filter((s) => s.group === g);
        return '<div class="section-title">' + g + '</div>' +
          '<div class="scene-grid">' + items.map((s) =>
            '<button class="scene-item' + (draft.scenes.indexOf(s.id) >= 0 ? ' on' : '') + '" data-tap="toggle-scene" data-arg="' + s.id + '">' + esc(s.name) + '</button>'
          ).join('') + '</div>';
      }).join('');

      return '<div class="safe-top"></div>' +
        '<div class="screen-body">' +
        navBar({ title: '新建清单', back: false }) +
        '<div class="meta-line">第 1 步 / 共 2 步</div>' +
        '<div class="page-head"><h1>这次要准备什么？</h1></div>' +
        '<div class="meta-line">可以同时选多个场景，重复的项目会自动合并</div>' +
        groups +
        '</div>' +
        '<div class="cta-host"><button class="cta' + (n ? '' : ' ghost') + '" data-tap="to-cond"' + (n ? '' : ' disabled') + '>' +
        (n ? '下一步 · 已选 ' + n + ' 个场景' : '先选一个场景') + '</button></div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* ---------------- 03 新建 · 补充条件 ---------------- */
function condPage() {
  return {
    render() {
      const keys = condsForScenes(draft.scenes);
      const blocks = keys.map((k) => {
        const c = D.CONDS[k];
        if (!c) return '';
        if (c.type === 'switch') {
          const on = !!draft.conds[k];
          return '<div class="switch-row">' +
            '<div><div class="sw-label">' + esc(c.title) + '</div>' +
            (c.sub ? '<div class="sw-sub">' + esc(c.sub) + '</div>' : '') + '</div>' +
            '<button class="switch' + (on ? ' on' : '') + '" data-tap="toggle-switch" data-arg="' + k + '" role="switch" aria-checked="' + on + '"><span class="knob"></span></button>' +
            '</div>';
        }
        return '<div class="card pad-sm"><div class="cond-block">' +
          '<div class="cond-title">' + esc(c.title) + '</div>' +
          '<div class="cond-grid' + (c.cols === 2 ? ' c2' : '') + '">' +
          c.options.map((o) =>
            '<button class="cond-opt' + (draft.conds[k] === o.k ? ' on' : '') + '" data-tap="pick-cond" data-arg="' + k + '|' + o.k + '">' + esc(o.label) + '</button>'
          ).join('') + '</div></div></div>';
      }).join('');

      const est = D.generate(draft.scenes, draft.conds);
      const count = est.cats.reduce((a, g) => a + g.items.length, 0);

      return '<div class="safe-top"></div>' +
        '<div class="screen-body has-cta">' +
        navBar({ title: '补充条件', back: true }) +
        '<div class="meta-line">第 2 步 / 共 2 步</div>' +
        '<div class="page-head"><h1>再补充几个条件</h1></div>' +
        '<div class="meta-line">只显示与所选场景相关的条件</div>' +
        (blocks || '<div class="card pad"><div class="meta-line">这些场景没有额外条件，直接生成即可</div></div>') +
        '</div>' +
        '<div class="cta-host"><button class="cta" data-tap="do-generate">生成清单 · 约 ' + count + ' 项</button></div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* ============================================================
   清单行渲染辅助（三段式 / 排序 / FLIP 动画）
   ============================================================ */
/* 渲染排序：不需要(skip)沉到列表最下方，并按操作顺序(skipAt)排列；正常项保持原顺序 */
function sortRows(arr) {
  const normal = [], skip = [];
  arr.forEach((it) => { (it.status === 'skip') ? skip.push(it) : normal.push(it); });
  skip.sort((a, b) => (a.skipAt || 0) - (b.skipAt || 0));
  return normal.concat(skip);
}

/* 递增的「不需要」操作序号，用于沉底时的稳定排序 */
function nextSkipSeq() {
  let m = 0;
  DB.data.lists.forEach((l) => l.cats.forEach((g) => g.items.forEach((it) => { if (it.skipAt && it.skipAt > m) m = it.skipAt; })));
  return m + 1;
}

/* 完成状态控件：纯描边圆 + 细线勾选，靠 .on 切换，CSS 控制轻量描边动画 */
function checkSvg() {
  return '<svg class="check-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<circle class="ck-circle" cx="12" cy="12" r="10.5"/>' +
    '<path class="ck-mark" d="M7 12.4 L10.4 15.8 L17 8.6"/></svg>';
}

/* 单条清单行：三段式 —— 左：完成按钮 / 中：内容 / 右：不需要 */
function renderItemRow(it, l, isMove, owned) {
  const qty = it.qty ? ' × ' + it.qty : '';
  const sub = it.sub ? '<span class="row-meta">' + esc(it.sub) + '</span>' : '';
  const cycle = it.cycle ? '<span class="tag-chip cycle">' + esc(it.cycle) + '</span>' : '';
  const box = isMove && it.box ? '<span class="tag-chip" data-tap="set-box" data-arg="' + it.id + '">箱' + esc(it.box) + '</span>' : '';
  const ownedTag = owned ? '<span class="tag-chip grey">已有</span>' : '';
  const tags = ownedTag + cycle + sub + box;
  const main = '<span class="row-main">' +
    '<span class="row-label">' + esc(it.text) + '<span class="row-meta">' + qty + '</span></span>' +
    (tags ? '<span class="row-tags">' + tags + '</span>' : '') +
    '</span>';

  /* 搬家清单：保留四态装箱流程，无「不需要」按钮 */
  if (isMove) {
    const cls = it.status === 'packed' ? ' packed' : (it.status === 'moved' ? ' moved' : (it.status === 'confirmed' ? ' confirmed' : ''));
    return '<div class="row' + cls + '" data-iid="' + it.id + '" data-lp="item" data-lp-id="' + it.id + '">' +
      '<button class="row-hit" data-tap="cycle-status" data-arg="' + it.id + '" aria-label="切换状态">' + dotSvg(it.status, l.kind) + '</button>' +
      main + '</div>';
  }

  const isDone = it.status === 'done';
  const isSkip = it.status === 'skip';
  const cls = isSkip ? ' skip' : (isDone ? ' done' : '');
  const left = '<button class="row-check' + (isDone ? ' on' : '') + '" data-tap="toggle-done" data-arg="' + it.id + '" aria-label="完成状态">' + checkSvg() + '</button>';
  const right = '<button class="row-skip' + (isSkip ? ' is-skip' : '') + '" data-tap="toggle-skip" data-arg="' + it.id + '" aria-label="不需要">' + (isSkip ? '恢复' : '不需要') + '</button>';
  return '<div class="row' + cls + '" data-iid="' + it.id + '" data-lp="item" data-lp-id="' + it.id + '">' + left + main + right + '</div>';
}

/* FLIP 重排：记录前后位置，用 transform 平滑移动，避免整页重绘跳动 */
function captureRects(root) {
  const m = new Map();
  root.querySelectorAll('.rows').forEach((cards) => {
    const cat = cards.getAttribute('data-cat') || '';
    Array.from(cards.children).forEach((ch) => {
      if (ch.classList.contains('add-row')) m.set('add:' + cat, ch.getBoundingClientRect());
      else { const id = ch.getAttribute('data-iid'); if (id) m.set(id, ch.getBoundingClientRect()); }
    });
  });
  return m;
}
function flip(pageEl, before, after, popId) {
  const nodeFor = (key) => {
    if (key.indexOf('add:') === 0) return pageEl.querySelector('.rows[data-cat="' + key.slice(4) + '"] .add-row');
    return pageEl.querySelector('.row[data-iid="' + key + '"]');
  };
  after.forEach((b, key) => {
    const a = before.get(key); if (!a) return;
    const dy = a.top - b.top, dx = a.left - b.left;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    const el = nodeFor(key); if (!el) return;
    el.style.transition = 'none';
    const sc = (key === popId) ? ' scale(.97)' : '';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)' + sc;
  });
  void pageEl.offsetWidth;
  after.forEach((b, key) => {
    const a = before.get(key); if (!a) return;
    const dy = a.top - b.top, dx = a.left - b.left;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    const el = nodeFor(key); if (!el) return;
    el.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)';
    el.style.transform = '';
  });
}
function flipReorder(pageEl, renderFn, popId) {
  /* 先取消进行中的动画，避免连续点击叠加导致位置错乱 */
  pageEl.querySelectorAll('.rows > *').forEach((el) => { el.style.transition = 'none'; el.style.transform = ''; });
  const before = captureRects(pageEl);
  const body = pageEl.querySelector('.screen-body');
  const top = body ? body.scrollTop : 0;
  pageEl.innerHTML = renderFn();
  const nb = pageEl.querySelector('.screen-body');
  if (nb) nb.scrollTop = top;
  const after = captureRects(pageEl);
  flip(pageEl, before, after, popId);
}

/* ============================================================
   04/05/06 清单详情
   ============================================================ */
function listPage(listId) {
  return {
    listId: listId,
    render() {
      const l = getList(listId);
      if (!l) return '<div class="safe-top"></div><div class="screen-body"><div class="empty"><div class="t1x">清单不存在</div></div></div>';
      const isMove = l.kind === 'move';
      const isCat = l.kind === 'cat';

      /* 筛选 */
      const filters = isMove
        ? [['all', '全部'], ['todo', '未整理'], ['packed', '已装箱'], ['moved', '已搬运'], ['confirmed', '已确认']]
        : [['all', '全部'], ['todo', '未完成'], ['done', '已完成'], ['skip', '不需要']];
      const filterHtml = '<div class="filter-row">' + filters.map((f) =>
        '<button class="chip-seg' + (l.filter === f[0] ? ' on' : '') + '" data-tap="set-filter" data-arg="' + f[0] + '">' + f[1] + '</button>'
      ).join('') + '</div>';

      /* 养猫阶段切换 */
      let stageHtml = '';
      if (isCat) {
        stageHtml = '<div class="filter-row">' + l.cats.map((g, i) =>
          '<button class="chip-seg' + ((l.stage || 0) === i ? ' on' : '') + '" data-tap="set-stage" data-arg="' + i + '">' + esc(g.name) + '</button>'
        ).join('') + '</div>';
      }

      /* 箱号条 */
      let boxHtml = '';
      if (isMove) {
        const boxes = {};
        l.cats.forEach((g) => g.items.forEach((it) => { if (it.box) boxes[it.box] = (boxes[it.box] || 0) + 1; }));
        const keys = Object.keys(boxes).sort();
        boxHtml = '<div class="card pad-sm"><div class="section-row" style="margin-bottom:10px">' +
          '<span class="section-title">箱号</span>' +
          '<button class="more" data-tap="manage-box">管理</button></div>' +
          (keys.length
            ? '<div class="chips-scroll">' + keys.map((k) =>
              '<button class="chip-tag" data-tap="pick-box-filter" data-arg="' + esc(k) + '">箱' + esc(k) + ' · ' + boxes[k] + ' 件</button>'
            ).join('') + '</div>'
            : '<div class="meta-line">还没有设置箱号。长按项目可设置所属箱号。</div>') +
          '</div>';
      }

      /* 项目列表 */
      const showCats = isCat ? [l.cats[l.stage || 0]] : l.cats;
      const totalItems = (showCats || []).reduce((a, g) => a + g.items.length, 0);
      let shownCount = 0;
      let body = '';
      (showCats || []).forEach((g) => {
        let items = g.items.filter((it) => {
          if (l.filter === 'all') return true;
          return it.status === l.filter;
        });
        /* 全部视图：不需要的项按操作顺序沉到列表最下方 */
        if (l.filter === 'all') items = sortRows(items);
        shownCount += items.length;
        const rows = items.map((it) => renderItemRow(it, l, isMove, hasItem(it.text))).join('');

        const addBtn = '<button class="add-row" data-tap="add-item" data-arg="' + esc(g.name) + '">' +
          svg('plus', 'plus') + '<span>添加项目</span></button>';

        body += '<div class="section-title">' + esc(g.name) + ' · ' + g.items.length + ' 项</div>' +
          '<div class="card"><div class="rows" data-cat="' + esc(g.name) + '">' + (rows || '') + addBtn + '</div></div>';
      });

      if (l.filter !== 'all' && totalItems > 0 && shownCount === 0) {
        body = '<div class="card pad"><div class="empty">' + svg('archive', 'ico') +
          '<div class="t1x">这个状态下没有项目</div><div class="t2x">换个筛选条件看看</div></div></div>';
      } else if (!body) {
        body = '<div class="card pad"><div class="empty">' + svg('archive', 'ico') +
          '<div class="t1x">这里没有项目</div><div class="t2x">换个筛选条件看看</div></div></div>';
      }

      const meta = (l.scenes || []).map((id) => D.SCENE_MAP[id] ? D.SCENE_MAP[id].name : '').filter(Boolean).join(' + ');

      return '<div class="safe-top"></div>' +
        '<div class="screen-body">' +
        navBar({
          title: l.title, back: true,
          right: '<button class="nav-btn icon" data-tap="list-menu" aria-label="更多">' + svg('more', '') + '</button>'
        }) +
        '<div class="meta-line">' + (meta ? '来自 ' + esc(meta) + ' · ' : '') + '创建于 ' + fmtDate(l.createdAt) + '</div>' +
        progressCard(l) +
        (isMove ? boxHtml : '') +
        stageHtml +
        filterHtml +
        body +
        '</div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

function fmtDate(ts) {
  const d = new Date(ts);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/* 重绘页面并保留滚动位置 */
function repaint(el, owner) {
  const b = el.querySelector('.screen-body');
  const top = b ? b.scrollTop : 0;
  el.innerHTML = owner.render();
  const nb = el.querySelector('.screen-body');
  if (nb) nb.scrollTop = top;
}
function reenter(el, owner) { repaint(el, owner); }

/* ============================================================
   07 模板
   ============================================================ */
function templatesPage() {
  return {
    render() {
      const mine = DB.data.templates;
      const mineHtml = mine.length
        ? mine.map((t) => {
          const n = t.cats.reduce((a, g) => a + g.items.length, 0);
          return '<button class="nav-row" data-tap="open-tpl" data-arg="' + t.id + '">' +
            '<span class="txt"><span class="n1">' + esc(t.name) + '</span>' +
            '<span class="n2">' + n + ' 项 · ' + esc(t.desc || '自定义') + '</span></span>' +
            '<span class="chev">›</span></button>';
        }).join('')
        : '<div class="meta-line" style="padding:14px">还没有自己的模板。完成一份清单后，可以在清单菜单里「保存为我的模板」。</div>';

      const sys = D.SYSTEM_TEMPLATES.map((t) => {
        const n = D.generate(t.scenes, t.conds).cats.reduce((a, g) => a + g.items.length, 0);
        return '<button class="nav-row" data-tap="use-sys-tpl" data-arg="' + t.id + '">' +
          '<span class="txt"><span class="n1">' + esc(t.name) + '</span>' +
          '<span class="n2">' + n + ' 项 · ' + esc(t.desc) + '</span></span>' +
          '<span class="act">使用</span></button>';
      }).join('');

      return '<div class="safe-top"></div>' +
        '<div class="screen-body">' +
        '<div class="page-head"><h1>模板</h1>' +
        '<button class="round-btn" data-tap="new-tpl" aria-label="新建模板">' + svg('plus', '') + '</button></div>' +
        '<div class="section-title">我的模板</div>' +
        '<div class="card">' + mineHtml + '</div>' +
        '<div class="section-title">系统模板 · 不可修改</div>' +
        '<div class="card">' + sys + '</div>' +
        '<div class="tip-bar">' + svg('info', 'ico') +
        '<span>使用模板会生成一份全新清单，不会改动模板本身</span></div>' +
        '</div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* 模板详情 */
function tplPage(tplId) {
  return {
    render() {
      const t = getTpl(tplId);
      if (!t) return '<div class="safe-top"></div><div class="screen-body"><div class="empty"><div class="t1x">模板不存在</div></div></div>';
      const body = t.cats.map((g) =>
        '<div class="section-title">' + esc(g.name) + ' · ' + g.items.length + ' 项</div>' +
        '<div class="card"><div class="rows">' + g.items.map((it) =>
          '<div class="row"><span class="row-label">' + esc(it.text) + (it.qty ? '<span class="row-meta"> × ' + it.qty + '</span>' : '') + '</span></div>'
        ).join('') + '</div></div>'
      ).join('');

      return '<div class="safe-top"></div>' +
        '<div class="screen-body">' +
        navBar({ title: t.name, back: true, right: '<button class="nav-btn icon" data-tap="tpl-menu" aria-label="更多">' + svg('more', '') + '</button>' }) +
        '<div class="meta-line">我的模板 · 创建于 ' + fmtDate(t.createdAt) + '</div>' +
        body +
        '</div>' +
        '<div class="cta-host"><button class="cta" data-tap="use-tpl" data-arg="' + t.id + '">使用此模板</button></div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* ============================================================
   08 我的
   ============================================================ */
function minePage() {
  return {
    render() {
      const running = DB.data.lists.filter((l) => stats(l).done < (l.kind === 'move' ? stats(l).total : stats(l).base)).length;
      const done = DB.data.lists.filter((l) => stats(l).done >= (l.kind === 'move' ? stats(l).total : stats(l).base) && stats(l).total).length;

      const rows = [
        { tap: 'open-items', icon: 'bag', n1: '我的物品库', n2: DB.data.items.length + ' 件 · 清单中自动标记「已有」' },
        { tap: 'tab', arg: 'template', icon: 'layers', n1: '我的模板', n2: DB.data.templates.length + ' 个 · 系统更新不会覆盖' },
        { tap: 'history', icon: 'archive', n1: '历史清单', n2: DB.data.lists.length + ' 份 · 可保存为我的模板' }
      ].map((r) =>
        '<button class="nav-row" data-tap="' + r.tap + '"' + (r.arg ? ' data-arg="' + r.arg + '"' : '') + '>' +
        '<span class="txt"><span class="n1">' + r.n1 + '</span><span class="n2">' + r.n2 + '</span></span>' +
        '<span class="chev">›</span></button>'
      ).join('');

      const items = DB.data.items.slice(0, 12).map((it) =>
        '<span class="chip-tag" data-tap="noop">' + esc(it.name) + '</span>'
      ).join('') || '<span class="chip-tag">还没有物品</span>';

      return '<div class="safe-top"></div>' +
        '<div class="screen-body">' +
        '<div class="page-head"><h1>我的</h1></div>' +
        '<div class="card pad"><div class="stat-row">' +
        '<div class="stat"><span class="n">' + running + '</span><span class="l">进行中</span></div>' +
        '<div class="stat"><span class="n">' + done + '</span><span class="l">已完成</span></div>' +
        '<div class="stat"><span class="n">' + DB.data.items.length + '</span><span class="l">我的物品</span></div>' +
        '</div></div>' +
        '<div class="section-title">我的数据</div>' +
        '<div class="card">' + rows + '</div>' +
        '<div class="section-title">常用物品</div>' +
        '<div class="chip-wall">' + items + '</div>' +
        '<div class="tip-bar">' + svg('info', 'ico') +
        '<span>数据仅保存在本机，无需登录 · 系统更新不会覆盖</span></div>' +
        '</div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* 物品库 */
function itemsPage() {
  return {
    render() {
      const rows = DB.data.items.length
        ? DB.data.items.map((it) =>
          '<div class="row"><span class="row-label">' + esc(it.name) + '</span>' +
          '<button class="row-hit" data-tap="del-item-lib" data-arg="' + it.id + '" aria-label="删除">' + svg('trash', '') + '</button></div>'
        ).join('')
        : '<div class="empty">' + svg('bag', 'ico') + '<div class="t1x">物品库还是空的</div>' +
          '<div class="t2x">把常带的东西加进来，生成清单时会自动标上「已有」</div></div>';

      return '<div class="safe-top"></div>' +
        '<div class="screen-body no-tab">' +
        navBar({ title: '我的物品库', back: true }) +
        '<div class="meta-line">清单生成时，命中物品库的项目会显示「已有」徽标</div>' +
        '<div class="card"><div class="rows">' + rows +
        '<button class="add-row" data-tap="add-item-lib">' + svg('plus', 'plus') + '<span>添加物品</span></button>' +
        '</div></div>' +
        '</div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* 历史清单 */
function historyPage() {
  return {
    render() {
      const lists = DB.data.lists.slice().sort((a, b) => b.createdAt - a.createdAt);
      const rows = lists.length
        ? lists.map((l) => {
          const s = stats(l);
          const done = s.done >= (l.kind === 'move' ? s.total : s.base) && s.total;
          return '<button class="nav-row" data-tap="open-list" data-arg="' + l.id + '" data-lp="list" data-lp-id="' + l.id + '">' +
            '<span class="txt"><span class="n1">' + esc(l.title) + '</span>' +
            '<span class="n2">' + fmtDate(l.createdAt) + ' · ' + s.done + '/' + (l.kind === 'move' ? s.total : s.base) + ' · ' + (done ? '已完成' : '进行中') + '</span></span>' +
            '<span class="chev">›</span></button>';
        }).join('')
        : '<div class="empty">' + svg('archive', 'ico') + '<div class="t1x">还没有清单</div></div>';

      return '<div class="safe-top"></div>' +
        '<div class="screen-body no-tab">' +
        navBar({ title: '历史清单', back: true }) +
        '<div class="meta-line">长按某份清单可以保存为模板或删除</div>' +
        '<div class="card">' + rows + '</div>' +
        '</div>';
    },
    onReenter(el) { repaint(el, this); }
  };
}

/* 搜索 */
function searchPage() {
  return {
    render() {
      return '<div class="safe-top"></div>' +
        '<div class="screen-body no-tab">' +
        '<div class="navbar"><div class="nav-side">' +
        '<button class="nav-btn" data-tap="back">' + svg('back', 'chev') + '</button></div>' +
        '<div class="nav-title">搜索</div><div class="nav-side right"></div></div>' +
        '<div class="field" id="sf"><input id="si" type="search" placeholder="搜索清单或模板" autocomplete="off" enterkeyhint="search">' +
        '<button class="clear" data-tap="field-clear" data-arg="si">×</button></div>' +
        '<div id="sres"></div>' +
        '</div>';
    },
    onEnter(el) {
      const input = $('#si', el);
      if (!input) return;
      input.addEventListener('input', () => {
        $('#sf').classList.toggle('has-value', !!input.value);
        renderSearch(input.value.trim());
      });
      setTimeout(() => input.focus(), 300);
    }
  };
}

function renderSearch(kw) {
  const host = $('#sres');
  if (!host) return;
  if (!kw) { host.innerHTML = '<div class="meta-line">输入关键字搜索清单标题、项目名称或模板</div>'; return; }
  const k = kw.toLowerCase();
  const lists = DB.data.lists.filter((l) =>
    l.title.toLowerCase().indexOf(k) >= 0 ||
    l.cats.some((g) => g.items.some((it) => it.text.toLowerCase().indexOf(k) >= 0))
  );
  const tpls = DB.data.templates.concat(D.SYSTEM_TEMPLATES).filter((t) => t.name.toLowerCase().indexOf(k) >= 0);

  let html = '';
  if (lists.length) {
    html += '<div class="section-title">清单</div><div class="card">' + lists.map((l) =>
      '<button class="nav-row" data-tap="open-list" data-arg="' + l.id + '">' +
      '<span class="txt"><span class="n1">' + esc(l.title) + '</span><span class="n2">' + fmtDate(l.createdAt) + '</span></span>' +
      '<span class="chev">›</span></button>'
    ).join('') + '</div>';
  }
  if (tpls.length) {
    html += '<div class="section-title">模板</div><div class="card">' + tpls.map((t) =>
      '<button class="nav-row" data-tap="' + (t.scenes ? 'use-sys-tpl' : 'open-tpl') + '" data-arg="' + t.id + '">' +
      '<span class="txt"><span class="n1">' + esc(t.name) + '</span><span class="n2">' + esc(t.desc || '我的模板') + '</span></span>' +
      '<span class="act">' + (t.scenes ? '使用' : '打开') + '</span></button>'
    ).join('') + '</div>';
  }
  if (!html) html = '<div class="card pad"><div class="empty"><div class="t1x">没有找到「' + esc(kw) + '」</div></div></div>';
  host.innerHTML = html;
}

/* ============================================================
   长按排序
   ============================================================ */
function startItemSort(row, ev) {
  const list = row.parentNode;
  const rect = row.getBoundingClientRect();
  const startY = ev.clientY;
  let mode = 'idle';

  const ph = document.createElement('div');
  ph.style.height = rect.height + 'px';
  ph.style.background = 'rgba(46,158,126,.08)';
  ph.style.borderRadius = '12px';
  list.insertBefore(ph, row);

  row.style.position = 'fixed';
  row.style.left = rect.left + 'px';
  row.style.top = rect.top + 'px';
  row.style.width = rect.width + 'px';
  row.style.zIndex = '300';
  row.style.pointerEvents = 'none';
  row.style.boxShadow = '0 10px 24px -6px rgba(20,22,26,.3)';
  row.classList.add('sorting');
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }

  function move(e) {
    const dy = e.clientY - startY;
    if (mode === 'idle') {
      if (Math.abs(dy) < 6) return;
      mode = 'drag';
      document.body.setAttribute('data-dragging', '1');
    }
    e.preventDefault();
    row.style.top = (rect.top + dy) + 'px';
    const rows = Array.from(list.querySelectorAll('.row[data-iid]'));
    let target = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r === row) continue;
      const rr = r.getBoundingClientRect();
      if (e.clientY < rr.top + rr.height / 2) { target = r; break; }
    }
    if (target) list.insertBefore(ph, target);
    else list.appendChild(ph);
  }

  function up() {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    document.body.removeAttribute('data-dragging');
    list.insertBefore(row, ph);
    if (ph.parentNode) ph.parentNode.removeChild(ph);
    row.style.position = ''; row.style.left = ''; row.style.top = ''; row.style.width = '';
    row.style.zIndex = ''; row.style.boxShadow = ''; row.style.pointerEvents = '';
    row.classList.remove('sorting');
    if (mode !== 'drag') { return; }

    /* 提交顺序 */
    const ids = Array.from(list.querySelectorAll('.row[data-iid]')).map((r) => r.getAttribute('data-iid'));
    const catName = list.getAttribute('data-cat');
    const stack = Nav.stacks[Nav.active];
    const page = stack[stack.length - 1];
    const l = getList(page.listId);
    if (!l) return;
    const g = l.cats.find((x) => x.name === catName);
    if (!g) return;
    const map = {};
    g.items.forEach((it) => { map[it.id] = it; });
    const next = ids.map((id) => map[id]).filter(Boolean);
    g.items.forEach((it) => { if (next.indexOf(it) < 0) next.push(it); });
    g.items = next;
    save();
    toast('顺序已更新');
  }

  document.addEventListener('pointermove', move, { passive: false });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
}

/* 长按后未拖动 → 弹出操作菜单 */
function itemMenu(iid) {
  const stack = Nav.stacks[Nav.active];
  const page = stack[stack.length - 1];
  const l = getList(page.listId);
  if (!l) return;
  let item = null, cat = null;
  l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === iid) { item = it; cat = g; } }));
  if (!item) return;

  const acts = [
    { key: 'edit', label: '编辑名称' },
    { key: 'move', label: '修改分类' }
  ];
  if (l.kind === 'move') acts.push({ key: 'box', label: item.box ? '修改箱号（当前 箱' + item.box + '）' : '设置箱号' });
  acts.push({ key: 'own', label: hasItem(item.text) ? '从物品库移除' : '加入我的物品库' });
  acts.push({ key: 'del', label: '删除项目', style: 'danger' });

  actionSheet(item.text, acts);
  Sheet._acts = acts;
  Sheet._ctx = { iid: iid, listId: l.id, catName: cat.name };
}

/* ============================================================
   事件分发
   ============================================================ */
Bus.on('tap', (e) => {
  const act = e.action, arg = e.arg;
  const stack = Nav.stacks[Nav.active];
  const page = stack[stack.length - 1];

  switch (act) {
    case 'noop': return;

    /* --- Tab --- */
    case 'tab':
      if (arg === 'create') {
        if (Nav.active === 'create') { draft.scenes = []; Nav.reset('create', createPage); }
        else Nav.switchTab('create');
      } else {
        Nav.switchTab(arg);
      }
      return;

    case 'back': Nav.pop(); return;
    case 'sheet-close': Sheet.close(); return;

    /* --- 首页 --- */
    case 'open-list': {
      Nav.push(Nav.active, listPage(arg));
      DB.data.activeListId = arg; save();
      return;
    }
    case 'history': Nav.push(Nav.active, historyPage()); return;
    case 'search': Nav.push(Nav.active, searchPage()); return;

    case 'quick-start':
    case 'quick-scene': {
      draft.scenes = [arg];
      if (Nav.active !== 'create') Nav.switchTab('create');
      Nav.reset('create', createPage);
      Nav.push('create', buildCondPage());
      return;
    }

    /* --- 新建 --- */
    case 'toggle-scene': {
      const i = draft.scenes.indexOf(arg);
      if (i >= 0) draft.scenes.splice(i, 1); else draft.scenes.push(arg);
      page.el.innerHTML = page.render();
      return;
    }
    case 'to-cond': {
      Nav.push('create', buildCondPage());
      return;
    }
    case 'pick-cond': {
      const p = arg.split('|');
      draft.conds[p[0]] = p[1];
      page.el.innerHTML = page.render();
      return;
    }
    case 'toggle-switch': {
      draft.conds[arg] = !draft.conds[arg];
      page.el.innerHTML = page.render();
      return;
    }
    case 'do-generate': {
      const list = createList(draft.scenes, draft.conds);
      pushRecent(draft.scenes);
      save();
      Nav.popToRoot('create');
      Nav.switchTab('home');
      Nav.refreshTab('home');
      Nav.push('home', listPage(list.id));
      toast('已生成 ' + stats(list).total + ' 项清单');
      return;
    }

    /* --- 清单详情 --- */
    case 'cycle-status': {
      const l = getList(page.listId);
      if (!l) return;
      const flow = STATUS_FLOW[l.kind] || STATUS_FLOW.travel;
      l.cats.forEach((g) => g.items.forEach((it) => {
        if (it.id === arg) {
          const i = flow.indexOf(it.status || 'todo');
          it.status = flow[(i + 1) % flow.length];
        }
      }));
      save();
      const b = page.el.querySelector('.screen-body');
      const top = b ? b.scrollTop : 0;
      page.el.innerHTML = page.render();
      const nb = page.el.querySelector('.screen-body');
      if (nb) nb.scrollTop = top;
      return;
    }
    case 'set-filter': {
      const l = getList(page.listId);
      if (!l) return;
      l.filter = arg; save();
      page.el.innerHTML = page.render();
      return;
    }
    case 'set-stage': {
      const l = getList(page.listId);
      if (!l) return;
      l.stage = parseInt(arg, 10); save();
      page.el.innerHTML = page.render();
      const b = page.el.querySelector('.screen-body');
      if (b) b.scrollTop = 0;
      return;
    }

    /* 左侧完成按钮：仅切换 未完成↔已完成，与右侧「不需要」完全独立 */
    case 'toggle-done': {
      const l = getList(page.listId);
      if (!l) return;
      const it = findItem(arg);
      if (!it) return;
      if (it.status === 'skip') return;                 // 已经是「不需要」时不响应左侧
      it.status = (it.status === 'done') ? 'todo' : 'done';
      save();
      if (l.filter === 'all') {
        /* 位置不变，直接原地切 class，轻量不重绘、不跳动 */
        const row = page.el.querySelector('.row[data-iid="' + arg + '"]');
        const btn = row ? row.querySelector('.row-check') : null;
        if (btn) btn.classList.toggle('on', it.status === 'done');
        if (row) row.classList.toggle('done', it.status === 'done');
        /* 进度卡同步刷新（只换文本，不重绘整页、不跳动） */
        const pc = page.el.querySelector('.progress-card');
        if (pc) pc.outerHTML = progressCard(l);
      } else {
        page.el.innerHTML = page.render();
      }
      return;
    }

    /* 右侧「不需要」：独立状态；标记后平滑沉到列表最下方，再次点击恢复为正常 */
    case 'toggle-skip': {
      const l = getList(page.listId);
      if (!l) return;
      const it = findItem(arg);
      if (!it) return;
      if (it.status === 'skip') { it.status = 'todo'; it.skipAt = 0; }
      else { it.status = 'skip'; it.skipAt = nextSkipSeq(); }
      save();
      if (l.filter === 'all') {
        flipReorder(page.el, () => listPage(l.id).render(), arg);
      } else {
        page.el.innerHTML = page.render();
      }
      return;
    }
    case 'add-item': {
      promptSheet('添加到「' + arg + '」', {
        placeholder: '项目名称',
        ok: '添加',
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          const l = getList(page.listId);
          if (!l) return;
          let g = l.cats.find((x) => x.name === arg);
          if (!g) { g = { name: arg, items: [] }; l.cats.push(g); }
          g.items.push({ id: uid(), text: v, qty: 0, sub: '', cycle: '', status: 'todo', box: '', skipAt: 0 });
          save();
          Sheet.close();
          page.el.innerHTML = page.render();
          toast('已添加');
        }
      });
      return;
    }
    case 'set-box': {
      const l = getList(page.listId);
      if (!l) return;
      let item = null;
      l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === arg) item = it; }));
      if (!item) return;
      openBoxSheet(l, item);
      return;
    }
    case 'manage-box': {
      const l = getList(page.listId);
      if (!l) return;
      const boxes = {};
      l.cats.forEach((g) => g.items.forEach((it) => { if (it.box) boxes[it.box] = (boxes[it.box] || 0) + 1; }));
      const keys = Object.keys(boxes).sort();
      const html = (keys.length
        ? '<div class="card"><div class="rows">' + keys.map((k) =>
          '<div class="row"><span class="row-label">箱' + esc(k) + '</span>' +
          '<span class="row-meta">' + boxes[k] + ' 件</span></div>').join('') + '</div></div>'
        : '<div class="meta-line">还没有设置箱号</div>') +
        '<div class="tip-bar">' + svg('info', 'ico') + '<span>长按清单项目即可设置或清除箱号</span></div>';
      Sheet.open(html, { title: '箱号管理' });
      return;
    }
    case 'pick-box-filter': {
      toast('已筛选箱' + arg + '，可在项目上长按修改');
      return;
    }
    case 'list-menu': {
      const l = getList(page.listId);
      if (!l) return;
      const acts = [
        { key: 'rename', label: '重命名清单' },
        { key: 'save-tpl', label: '保存为我的模板' },
        { key: 'reset', label: '重置为全部未完成' },
        { key: 'del', label: '删除清单', style: 'danger' }
      ];
      Sheet._acts = acts;
      Sheet._ctx = { listId: l.id };
      actionSheet(l.title, acts);
      return;
    }

    /* --- 模板 --- */
    case 'use-sys-tpl': {
      const t = D.SYSTEM_TEMPLATES.find((x) => x.id === arg);
      if (!t) return;
      const list = createList(t.scenes, JSON.parse(JSON.stringify(t.conds)), t.name + ' · ' + (new Date().getMonth() + 1) + '月');
      pushRecent(t.scenes);
      save();
      Nav.switchTab('home');
      Nav.refreshTab('home');
      Nav.push('home', listPage(list.id));
      toast('已用模板生成清单');
      return;
    }
    case 'open-tpl': Nav.push(Nav.active, tplPage(arg)); return;
    case 'use-tpl': {
      const t = getTpl(arg);
      if (!t) return;
      const list = {
        id: uid(), kind: t.kind, title: t.name + ' · ' + (new Date().getMonth() + 1) + '月',
        scenes: [], conds: {}, createdAt: Date.now(), filter: 'all', stage: 0,
        cats: JSON.parse(JSON.stringify(t.cats)).map((g) => ({
          name: g.name,
          items: (g.items || []).map((it) => ({
            id: uid(), text: it.text, qty: it.qty || 0,
            sub: it.sub || '', cycle: it.cycle || '',
            status: 'todo', box: '', skipAt: 0
          }))
        }))
      };
      DB.data.lists.unshift(list);
      save();
      Nav.switchTab('home');
      Nav.refreshTab('home');
      Nav.push('home', listPage(list.id));
      toast('已用模板生成清单');
      return;
    }
    case 'new-tpl': {
      promptSheet('新建模板', {
        placeholder: '模板名称，例如 我的周末出行',
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          const t = { id: uid(), name: v, kind: 'life', desc: '自定义', createdAt: Date.now(), cats: [{ name: '未分类', items: [] }] };
          DB.data.templates.unshift(t); save();
          Sheet.close();
          Nav.push(Nav.active, tplPage(t.id));
        }
      });
      return;
    }
    case 'tpl-menu': {
      const stack2 = Nav.stacks[Nav.active];
      const p2 = stack2[stack2.length - 1];
      const tplId = (p2.el.querySelector('[data-tap="use-tpl"]') || {}).getAttribute ? p2.el.querySelector('[data-tap="use-tpl"]').getAttribute('data-arg') : null;
      if (!tplId) return;
      const acts = [
        { key: 'add-tpl-item', label: '添加项目' },
        { key: 'rename-tpl', label: '重命名模板' },
        { key: 'del-tpl', label: '删除模板', style: 'danger' }
      ];
      Sheet._acts = acts;
      Sheet._ctx = { tplId: tplId };
      actionSheet('模板操作', acts);
      return;
    }

    /* --- 物品库 --- */
    case 'open-items': Nav.push(Nav.active, itemsPage()); return;
    case 'add-item-lib': {
      promptSheet('添加物品', {
        placeholder: '物品名称',
        hint: '加入后，清单里同名项目会显示「已有」',
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          if (DB.data.items.some((i) => i.name === v)) { toast('已经在物品库里了'); return; }
          DB.data.items.unshift({ id: uid(), name: v }); save();
          Sheet.close();
          page.el.innerHTML = page.render();
          toast('已加入物品库');
        }
      });
      return;
    }
    case 'del-item-lib': {
      DB.data.items = DB.data.items.filter((i) => i.id !== arg);
      save();
      page.el.innerHTML = page.render();
      toast('已移出物品库');
      return;
    }

    /* --- 表单 --- */
    case 'field-clear': {
      const el = document.getElementById(arg);
      if (el) {
        el.value = '';
        const f = el.parentNode; f.classList.remove('has-value');
        el.focus();
        if (arg === 'si') renderSearch('');
      }
      return;
    }
    case 'prompt-ok': {
      const cb = Sheet._promptCb; Sheet._promptCb = null;
      const v = ($('#pi') ? $('#pi').value.trim() : '');
      if (cb) cb(v);
      return;
    }

    /* --- ActionSheet 选项 --- */
    case 'act': {
      const acts = Sheet._acts || [];
      const ctx = Sheet._ctx || {};
      Sheet.close();
      const a = acts.find((x) => x.key === arg);
      if (!a) return;
      handleAction(arg, ctx);
      return;
    }
  }
});

/* ActionSheet 后续动作 */
function handleAction(key, ctx) {
  const stack = Nav.stacks[Nav.active];
  const page = stack[stack.length - 1];

  /* 清单项目 */
  if (['edit', 'move', 'box', 'own', 'del'].indexOf(key) >= 0 && ctx.iid) {
    const l = getList(ctx.listId);
    if (!l) return;
    let item = null, cat = null;
    l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === ctx.iid) { item = it; cat = g; } }));
    if (!item) return;

    if (key === 'edit') {
      promptSheet('编辑项目', {
        value: item.text,
        onOk(v) {
          if (!v) { toast('名称不能为空'); return; }
          item.text = v; save(); Sheet.close();
          page.el.innerHTML = page.render();
          toast('已更新');
        }
      });
      return;
    }
    if (key === 'move') {
      const html = '<div class="cat-grid">' + l.cats.map((g) =>
        '<button class="cond-opt' + (g.name === cat.name ? ' on' : '') + '" data-tap="act" data-arg="cat:' + esc(g.name) + '">' + esc(g.name) + '</button>'
      ).join('') + '</div>' +
        '<div class="tip-bar">' + svg('info', 'ico') + '<span>选择要移动到的分类</span></div>';
      Sheet._acts = l.cats.map((g) => ({ key: 'cat:' + g.name, label: g.name }));
      Sheet._ctx = ctx;
      Sheet.open(html, { title: '修改分类' });
      return;
    }
    if (key === 'box') { openBoxSheet(l, item); return; }
    if (key === 'own') {
      if (hasItem(item.text)) {
        DB.data.items = DB.data.items.filter((i) => !(item.text.indexOf(i.name) >= 0 || i.name.indexOf(item.text) >= 0));
        toast('已移出物品库');
      } else {
        DB.data.items.unshift({ id: uid(), name: item.text });
        toast('已加入物品库');
      }
      save();
      page.el.innerHTML = page.render();
      return;
    }
    if (key === 'del') {
      cat.items = cat.items.filter((x) => x.id !== item.id);
      save();
      page.el.innerHTML = page.render();
      toast('已删除');
      return;
    }
    return;
  }

  /* 分类移动 */
  if (key.indexOf('cat:') === 0) {
    const target = key.slice(4);
    const l = getList(ctx.listId);
    if (!l) return;
    let item = null, from = null;
    l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === ctx.iid) { item = it; from = g; } }));
    if (!item || !from) return;
    if (from.name === target) return;
    from.items = from.items.filter((x) => x.id !== item.id);
    let to = l.cats.find((g) => g.name === target);
    if (!to) { to = { name: target, items: [] }; l.cats.push(to); }
    to.items.push(item);
    save();
    page.el.innerHTML = page.render();
    toast('已移动到「' + target + '」');
    return;
  }

  /* 清单级 */
  if (ctx.listId) {
    const l = getList(ctx.listId);
    if (!l) return;
    if (key === 'rename') {
      promptSheet('重命名清单', {
        value: l.title,
        onOk(v) {
          if (!v) { toast('名称不能为空'); return; }
          l.title = v; save(); Sheet.close();
          page.el.innerHTML = page.render();
          toast('已重命名');
        }
      });
      return;
    }
    if (key === 'save-tpl') {
      promptSheet('保存为我的模板', {
        value: l.title,
        hint: '保存后可在「模板」里反复使用，不会改动这份清单',
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          DB.data.templates.unshift({
            id: uid(), name: v, kind: l.kind,
            desc: l.kind === 'move' ? '含箱号' : (l.kind === 'cat' ? '分阶段' : '自定义'),
            createdAt: Date.now(),
            cats: JSON.parse(JSON.stringify(l.cats))
          });
          save(); Sheet.close();
          toast('已保存为我的模板');
        }
      });
      return;
    }
    if (key === 'reset') {
      l.cats.forEach((g) => g.items.forEach((it) => { it.status = 'todo'; }));
      save();
      page.el.innerHTML = page.render();
      toast('已重置');
      return;
    }
    if (key === 'del') {
      DB.data.lists = DB.data.lists.filter((x) => x.id !== l.id);
      save();
      Nav.pop();
      Nav.refreshTab('home');
      Nav.refreshTab('mine');
      toast('清单已删除');
      return;
    }
  }

  /* 模板级 */
  if (ctx.tplId) {
    const t = getTpl(ctx.tplId);
    if (!t) return;
    if (key === 'add-tpl-item') {
      promptSheet('添加项目', {
        placeholder: '项目名称',
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          t.cats[0].items.push({ text: v, qty: 0, sub: '', cycle: '' });
          save(); Sheet.close();
          page.el.innerHTML = page.render();
        }
      });
      return;
    }
    if (key === 'rename-tpl') {
      promptSheet('重命名模板', {
        value: t.name,
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          t.name = v; save(); Sheet.close();
          page.el.innerHTML = page.render();
        }
      });
      return;
    }
    if (key === 'del-tpl') {
      DB.data.templates = DB.data.templates.filter((x) => x.id !== t.id);
      save();
      Nav.pop();
      Nav.refreshTab('template');
      toast('模板已删除');
      return;
    }
  }

  /* 历史清单长按 */
  if (ctx.listLongPress) {
    const l = getList(ctx.listLongPress);
    if (!l) return;
    if (key === 'save-tpl') {
      promptSheet('保存为我的模板', {
        value: l.title,
        onOk(v) {
          if (!v) { toast('请输入名称'); return; }
          DB.data.templates.unshift({
            id: uid(), name: v, kind: l.kind, desc: '自定义', createdAt: Date.now(),
            cats: JSON.parse(JSON.stringify(l.cats))
          });
          save(); Sheet.close();
          toast('已保存为我的模板');
        }
      });
    }
    if (key === 'del') {
      DB.data.lists = DB.data.lists.filter((x) => x.id !== l.id);
      save();
      page.el.innerHTML = page.render();
      Nav.refreshTab('home');
      Nav.refreshTab('mine');
      toast('清单已删除');
    }
  }
}

/* 箱号 Sheet */
function openBoxSheet(list, item) {
  const nums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const used = {};
  list.cats.forEach((g) => g.items.forEach((it) => { if (it.box) used[it.box] = (used[it.box] || 0) + 1; }));
  const html = '<div class="box-grid">' + nums.map((n) =>
    '<button class="box-opt' + (item.box === n ? ' on' : '') + '" data-tap="act" data-arg="box:' + n + '">' + n + '</button>'
  ).join('') + '</div>' +
    (item.box ? '<button class="act-row danger" data-tap="act" data-arg="box:clear">清除箱号</button>' : '') +
    '<div class="tip-bar">' + svg('info', 'ico') + '<span>把同一箱的物品设为同一个箱号，搬运时按箱清点</span></div>';
  Sheet._acts = nums.map((n) => ({ key: 'box:' + n, label: n })).concat([{ key: 'box:clear', label: '清除' }]);
  Sheet._ctx = { iid: item.id, listId: list.id };
  Sheet.open(html, { title: '设置箱号' });
}

/* 箱号动作 */
Bus.on('tap', (e) => {
  if (e.action !== 'act') return;
  const key = e.arg;
  if (key.indexOf('box:') !== 0) return;
  const ctx = Sheet._ctx || {};
  Sheet.close();
  const l = getList(ctx.listId);
  if (!l) return;
  let item = null;
  l.cats.forEach((g) => g.items.forEach((it) => { if (it.id === ctx.iid) item = it; }));
  if (!item) return;
  const v = key.slice(4);
  item.box = (v === 'clear') ? '' : v;
  save();
  const stack = Nav.stacks[Nav.active];
  const page = stack[stack.length - 1];
  if (page && page.el) page.el.innerHTML = page.render();
  toast(v === 'clear' ? '已清除箱号' : '已设为箱' + v);
});

/* ============================================================
   长按
   ============================================================ */
Bus.on('longpress', (e) => {
  if (e.kind === 'item') {
    const el = e.el;
    const ev = window.__lastPointer || { clientY: 0 };
    startItemSort(el, ev);
    /* 松手时若未拖动 → 弹出菜单 */
    const onUp = () => {
      document.removeEventListener('pointerup', onUp);
      setTimeout(() => {
        if (!el.classList.contains('sorting')) itemMenu(e.id);
      }, 30);
    };
    document.addEventListener('pointerup', onUp);
    return;
  }
  if (e.kind === 'list') {
    const acts = [
      { key: 'save-tpl', label: '保存为我的模板' },
      { key: 'del', label: '删除清单', style: 'danger' }
    ];
    Sheet._acts = acts;
    Sheet._ctx = { listLongPress: e.id };
    actionSheet('清单操作', acts);
    return;
  }
});

/* 记录最近一次 pointer 位置，供长按排序使用 */
document.addEventListener('pointerdown', (e) => { window.__lastPointer = { clientX: e.clientX, clientY: e.clientY }; }, { passive: true });

/* 按所选场景初始化条件默认值，返回条件选择页 */
function buildCondPage() {
  const keys = condsForScenes(draft.scenes);
  const next = {};
  keys.forEach((k) => {
    const c = D.CONDS[k];
    if (!c) return;
    next[k] = (c.type === 'switch') ? !!c.def : (c.def || '');
  });
  draft.scenes.forEach((id) => {
    const s = D.SCENE_MAP[id];
    if (s && s.preset) Object.keys(s.preset).forEach((k) => { if (keys.indexOf(k) >= 0) next[k] = s.preset[k]; });
  });
  draft.conds = next;
  return condPage();
}

/* ============================================================
   启动
   ============================================================ */
function seedDemo() {
  if (DB.data.lists.length) return;
  /* 三份示例清单，对应设计稿首页 */
  const mk = (scenes, conds, title, plan) => {
    const l = createList(scenes, conds, title);
    let i = 0;
    l.cats.forEach((g) => g.items.forEach((it) => {
      const idx = i++;
      if (plan.mark === 'travel') {
        if (idx < plan.done) it.status = 'done';
        else if (idx >= plan.total - plan.skip) it.status = 'skip';
      } else if (plan.mark === 'move') {
        if (idx < plan.done) it.status = 'moved';
        else if (idx < plan.done + plan.packed) it.status = 'packed';
      } else {
        if (idx < plan.done) it.status = 'done';
      }
    }));
    return l;
  };

  const t = D.generate(['travel'], { days: '3', transport: 'plane', stay: 'hotel', season: 'autumn', photo: true, activity: 'none' });
  const tt = t.cats.reduce((a, g) => a + g.items.length, 0);
  mk(['travel'], { days: '3', transport: 'plane', stay: 'hotel', season: 'autumn', photo: true, activity: 'none' },
    '2026年9月上海旅行', { mark: 'travel', done: Math.min(23, tt - 3), skip: 3, total: tt });

  const m = D.generate(['moving'], { furniture: 'yes', appliance: 'yes', mover: 'company' });
  const mt = m.cats.reduce((a, g) => a + g.items.length, 0);
  mk(['moving'], { furniture: 'yes', appliance: 'yes', mover: 'company' },
    '浦东 → 徐汇 搬家', { mark: 'move', done: Math.min(42, mt - 14), packed: 12, total: mt });

  const c = D.generate(['catready'], { catAge: 'kitten', catCount: 'one', firstTime: 'yes', pickup: true });
  const ct = c.cats.reduce((a, g) => a + g.items.length, 0);
  mk(['catready'], { catAge: 'kitten', catCount: 'one', firstTime: 'yes', pickup: true },
    '养猫准备', { mark: 'cat', done: Math.min(15, ct), total: ct });

  DB.data.recent = ['concert', 'business', 'shopping', 'weekend'];
  save();
}

function boot() {
  DB.load();
  if (!DB.data.items.length) {
    DB.data.items = D.DEFAULT_ITEMS.map((n) => ({ id: uid(), name: n }));
  }
  seedDemo();

  Nav.reset('home', homePage);
  Nav.reset('create', createPage);
  Nav.reset('template', templatesPage);
  Nav.reset('mine', minePage);

  const tab = DB.data.activeTab && ['home', 'create', 'template', 'mine'].indexOf(DB.data.activeTab) >= 0 ? DB.data.activeTab : 'home';
  Nav.active = tab;
  $$('.stack').forEach((s) => s.classList.toggle('active', s.getAttribute('data-tab') === tab));
  Nav.renderTabBar();
  Nav.syncEdge();

  /* 恢复上次查看的清单 */
  if (DB.data.activeListId && getList(DB.data.activeListId)) {
    Nav.push(tab, listPage(DB.data.activeListId));
  }

  /* iOS 独立模式防止整页滚动 */
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.screen-body') && !e.target.closest('.sheet-body') && !e.target.closest('.chips-scroll')) {
      e.preventDefault();
    }
  }, { passive: false });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
