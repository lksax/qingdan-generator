/* ============================================================
   清单生成器 · 核心引擎
   导航栈 / 触摸系统 / iOS 守卫 / 本地存储
   ============================================================ */
(function () {
'use strict';

/* ---------------- 工具 ---------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ============================================================
   1. iOS 守卫：禁止缩放、禁止长按选中、禁止回弹
   ============================================================ */
(function iosGuards() {
  // 双指缩放 / 手势缩放
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => {
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
  });
  // 多指触摸
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  // 双击放大
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  // 长按照片/链接系统菜单
  document.addEventListener('contextmenu', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
  });
  // 拖拽选中
  document.addEventListener('selectstart', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
  });
  // 页面级横向拖动
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) return;
    const scroller = e.target.closest ? e.target.closest('.chips-scroll') : null;
    if (scroller) return;
    if (document.body.hasAttribute('data-dragging')) e.preventDefault();
  }, { passive: false });
})();

/* ============================================================
   2. 触摸系统：tap / 长按 / 按下反馈 / 防误触 / 防重复触发
   ============================================================ */
const TAP_SLOP = 10;        // 允许的手指移动像素
const TAP_MAX_MS = 800;     // 最长按压时间
const LONG_PRESS_MS = 480;  // 长按阈值
const TAP_LOCK_MS = 320;    // 全局点击锁，防一次点击触发多个操作

const Touch = {
  lockUntil: 0,
  locked() {
    if (Date.now() < this.lockUntil) return true;
    this.lockUntil = Date.now() + TAP_LOCK_MS;
    return false;
  },
  reset() { this.lockUntil = 0; }
};

let ptr = null;

function clearPressed() {
  $$('.pressed').forEach((el) => el.classList.remove('pressed'));
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  /* 点击目标与长按目标分开解析：
     - 点击取最近的 [data-tap]（通常是内部小按钮）
     - 长按取其祖先 [data-lp]（通常是承载整行/整卡的容器）
     二者可在不同元素上，因此即使没有 [data-tap] 也要允许长按触发 */
  const lpEl = e.target.closest ? e.target.closest('[data-lp]') : null;
  const target = e.target.closest ? e.target.closest('[data-tap]') : null;
  clearPressed();
  if (!target && !lpEl) { ptr = null; return; }

  ptr = {
    el: target,
    lpEl: lpEl,
    x: e.clientX, y: e.clientY,
    t: Date.now(),
    moved: false,
    fired: false,
    lpTimer: null,
    scrollHost: e.target.closest ? e.target.closest('.screen-body,.sheet-body,.chips-scroll') : null
  };
  /* 只在真正的点击目标（内部小按钮）上加按下态，绝不给整行加灰色，
     长按整行排序/菜单仍由 data-lp 解析，不依赖 pressed 类 —— 交互因此更轻量 */
  if (target) target.classList.add('pressed');

  const kind = lpEl ? lpEl.getAttribute('data-lp') : null;
  if (kind) {
    ptr.lpTimer = setTimeout(() => {
      if (ptr && !ptr.moved && !ptr.fired) {
        ptr.fired = true;
        if (target) target.classList.remove('pressed');
        if (lpEl) lpEl.classList.remove('pressed');
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
        Bus.emit('longpress', { el: lpEl, kind: kind, id: lpEl.getAttribute('data-lp-id') });
      }
    }, LONG_PRESS_MS);
  }
}

function onPointerMove(e) {
  if (!ptr) return;
  const dx = e.clientX - ptr.x;
  const dy = e.clientY - ptr.y;
  if (!ptr.moved && Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) {
    ptr.moved = true;
    if (ptr.el) ptr.el.classList.remove('pressed');
    if (ptr.lpTimer) { clearTimeout(ptr.lpTimer); ptr.lpTimer = null; }
  }
}

function onPointerUp(e) {
  if (!ptr) return;
  const p = ptr;
  ptr = null;
  if (p.lpTimer) clearTimeout(p.lpTimer);
  if (p.el) p.el.classList.remove('pressed');
  if (p.lpEl) p.lpEl.classList.remove('pressed');
  if (p.fired || p.moved) return;
  if (Date.now() - p.t > TAP_MAX_MS) return;
  if (Touch.locked()) return;

  if (!p.el) return;
  const action = p.el.getAttribute('data-tap');
  if (!action) return;
  const arg = p.el.getAttribute('data-arg');
  Bus.emit('tap', { action: action, arg: arg, el: p.el });
}

function onPointerCancel() {
  if (ptr) {
    if (ptr.lpTimer) clearTimeout(ptr.lpTimer);
    if (ptr.el) ptr.el.classList.remove('pressed');
    if (ptr.lpEl) ptr.lpEl.classList.remove('pressed');
    ptr = null;
  }
}

document.addEventListener('pointerdown', onPointerDown, { passive: true });
document.addEventListener('pointermove', onPointerMove, { passive: true });
document.addEventListener('pointerup', onPointerUp, { passive: true });
document.addEventListener('pointercancel', onPointerCancel, { passive: true });
window.addEventListener('blur', onPointerCancel);
// 兜底：屏蔽原生 click 造成的二次触发
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('[data-tap]')) e.preventDefault();
}, { passive: false });

/* ============================================================
   3. 事件总线
   ============================================================ */
const Bus = {
  map: {},
  on(k, fn) { (this.map[k] = this.map[k] || []).push(fn); },
  emit(k, payload) { (this.map[k] || []).forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } }); }
};

/* ============================================================
   4. 图标（全部 SVG，不使用 emoji）
   ============================================================ */
const ICONS = {
  home: '<path d="M3 10.2 L12 3 L21 10.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 9.4 V20 H18.4 V9.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<rect x="11" y="4.6" width="2" height="14.8" rx="1" fill="currentColor"/><rect x="4.6" y="11" width="14.8" height="2" rx="1" fill="currentColor"/>',
  template: '<rect x="4" y="3.6" width="16" height="16.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8" y="8.4" width="8" height="1.7" rx="0.85" fill="currentColor"/><rect x="8" y="12.4" width="8" height="1.7" rx="0.85" fill="currentColor"/><rect x="8" y="16.4" width="5" height="1.7" rx="0.85" fill="currentColor"/>',
  user: '<circle cx="12" cy="8.4" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.6 20.4 C5.4 16.2 8.4 14 12 14 C15.6 14 18.6 16.2 19.4 20.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  back: '<path d="M14.5 4.5 L7 12 L14.5 19.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="M9.5 4.5 L16 12 L9.5 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15.6 15.6 L20.4 20.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  more: '<circle cx="5.4" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="18.6" cy="12" r="1.8" fill="currentColor"/>',
  trash: '<path d="M4.6 6.8 H19.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.4 6.8 V4.6 H14.6 V6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.6 6.8 L7.6 20 H16.4 L17.4 6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  edit: '<path d="M4.8 19.2 L5.6 15.2 L15.4 5.4 C16.2 4.6 17.4 4.6 18.2 5.4 C19 6.2 19 7.4 18.2 8.2 L8.4 18 L4.8 19.2 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  drag: '<circle cx="9" cy="6" r="1.6" fill="currentColor"/><circle cx="15" cy="6" r="1.6" fill="currentColor"/><circle cx="9" cy="12" r="1.6" fill="currentColor"/><circle cx="15" cy="12" r="1.6" fill="currentColor"/><circle cx="9" cy="18" r="1.6" fill="currentColor"/><circle cx="15" cy="18" r="1.6" fill="currentColor"/>',
  box: '<rect x="3.4" y="7.4" width="17.2" height="12.6" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3.4" y="4" width="17.2" height="4.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="10.8" y="7.4" width="2.4" height="12.6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="11" y="10.6" width="2" height="6.6" rx="1" fill="currentColor"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor"/>',
  check: '<path d="M5.4 12.4 L9.6 16.6 L18.6 7.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  plane: '<path d="M2.8 13.2 L21.2 4.6 L15.4 21 L12.2 14.8 L2.8 13.2 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  sofa: '<path d="M4.6 12.4 V8.4 C4.6 6.7 6 5.4 7.7 5.4 H16.3 C18 5.4 19.4 6.7 19.4 8.4 V12.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><rect x="2.6" y="12.4" width="18.8" height="6.6" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.6 12.4 V16.4 M17.4 12.4 V16.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  cat: '<path d="M7.4 8.6 C7.4 8.6 7 4.6 9.2 5.4 C10 5.7 10.6 6.6 10.6 6.6 L13.4 6.6 C13.4 6.6 14 5.7 14.8 5.4 C17 4.6 16.6 8.6 16.6 8.6 C16.6 8.6 18 10.4 18 13.8 C18 17.8 15.4 20 12 20 C8.6 20 6 17.8 6 13.8 C6 10.4 7.4 8.6 7.4 8.6 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="9.8" cy="12.6" r="1.1" fill="currentColor"/><circle cx="14.2" cy="12.6" r="1.1" fill="currentColor"/>',
  party: '<path d="M4 20 L7 11 L13 17 L20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="4" r="2" fill="currentColor"/>',
  camera: '<rect x="3" y="6.6" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="9" y="3.4" width="5" height="3" rx="1.2" fill="currentColor"/>',
  bag: '<path d="M4.6 8 H19.4 L18.4 20.4 H5.6 L4.6 8 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.6 8 V5.6 C8.6 4.2 10 3.4 12 3.4 C14 3.4 15.4 4.2 15.4 5.6 V8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  heart: '<path d="M12 20 C12 20 3.6 14.8 3.6 9.4 C3.6 6.6 5.8 4.6 8.2 4.6 C9.9 4.6 11.3 5.6 12 6.8 C12.7 5.6 14.1 4.6 15.8 4.6 C18.2 4.6 20.4 6.6 20.4 9.4 C20.4 14.8 12 20 12 20 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.2 V12 L15.6 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  archive: '<rect x="3.4" y="4.6" width="17.2" height="4.6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 9.2 V18.8 C5 19.6 5.6 20.2 6.4 20.2 H17.6 C18.4 20.2 19 19.6 19 18.8 V9.2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="10" y="12.6" width="4" height="3" rx="1" fill="currentColor"/>',
  layers: '<path d="M12 3.4 L21 8 L12 12.6 L3 8 L12 3.4 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3.6 12.6 L12 16.8 L20.4 12.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.6 16.8 L12 21 L20.4 16.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  tune: '<path d="M4 7.4 H14 M17.6 7.4 H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.8" cy="7.4" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 16.6 H9 M12.6 16.6 H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10.8" cy="16.6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  close: '<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};

function svg(name, cls) {
  return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' + (ICONS[name] || '') + '</svg>';
}

/* 状态圆点（三种清单共用绘制） */
function dotSvg(state, kind) {
  if (kind === 'move') {
    if (state === 'packed') {
      return '<svg class="row-dot" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#2E9E7E"/><rect x="6.4" y="6.4" width="7.2" height="7.2" rx="1.6" fill="#FFFFFF"/></svg>';
    }
    if (state === 'moved' || state === 'confirmed') {
      return '<svg class="row-dot" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#2E9E7E"/><path d="M6 10.2 L8.6 12.8 L14 7.2" stroke="#FFFFFF" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    return '<svg class="row-dot" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9.2" stroke="#C9CFD8" stroke-width="1.6" fill="none"/></svg>';
  }
  if (state === 'done') {
    return '<svg class="row-dot" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#2E9E7E"/><path d="M6 10.2 L8.6 12.8 L14 7.2" stroke="#FFFFFF" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  if (state === 'skip') {
    return '<svg class="row-dot" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#DFE3E8"/><rect x="6" y="9.2" width="8" height="1.6" rx="0.8" fill="#FFFFFF"/></svg>';
  }
  return '<svg class="row-dot" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9.2" stroke="#C9CFD8" stroke-width="1.6" fill="none"/></svg>';
}

/* ============================================================
   5. 本地存储
   ============================================================ */
const DB = {
  KEY: 'qingdan.generator.v1',
  data: null,
  load() {
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (_) {}
    let d = null;
    if (raw) { try { d = JSON.parse(raw); } catch (_) { d = null; } }
    if (!d || typeof d !== 'object') d = {};
    this.data = {
      version: 1,
      lists: Array.isArray(d.lists) ? d.lists : [],
      templates: Array.isArray(d.templates) ? d.templates : [],
      items: Array.isArray(d.items) ? d.items : [],
      recent: Array.isArray(d.recent) ? d.recent : [],
      activeTab: d.activeTab || 'home',
      activeListId: d.activeListId || null
    };
    return this.data;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { console.warn('保存失败', e); }
  }
};

/* ============================================================
   6. 导航栈
   ============================================================ */
const TABS = [
  { id: 'home', label: '首页', icon: 'home' },
  { id: 'create', label: '新建', icon: 'plus' },
  { id: 'template', label: '模板', icon: 'template' },
  { id: 'mine', label: '我的', icon: 'user' }
];

const Nav = {
  stacks: { home: [], create: [], template: [], mine: [] },
  active: 'home',
  animating: false,

  el(tab) { return $('.stack[data-tab="' + tab + '"]'); },

  /* 渲染并推入新页面 */
  push(tab, page) {
    const host = this.el(tab);
    const prev = this.stacks[tab][this.stacks[tab].length - 1];
    const screen = document.createElement('div');
    screen.className = 'screen push-in';
    screen.innerHTML = page.render();
    host.appendChild(screen);
    page.el = screen;
    this.stacks[tab].push(page);

    if (prev) prev.el.style.transform = '';
    // 强制重排后触发滑入
    void screen.offsetWidth;
    screen.classList.remove('push-in');
    if (prev) { prev.el.style.transform = 'translate3d(-24%,0,0)'; prev.el.classList.add('dim'); }
    if (page.onEnter) page.onEnter(screen);
    this.syncEdge();
    return page;
  },

  pop() {
    const tab = this.active;
    const stack = this.stacks[tab];
    if (stack.length <= 1) return false;
    const page = stack.pop();
    const prev = stack[stack.length - 1];
    page.el.classList.add('pop-out');
    if (prev) { prev.el.style.transform = ''; prev.el.classList.remove('dim'); }
    setTimeout(() => {
      if (page.el.parentNode) page.el.parentNode.removeChild(page.el);
      if (page.onLeave) page.onLeave();
      this.syncEdge();
    }, 290);
    if (prev && prev.onReenter) prev.onReenter(prev.el);
    return true;
  },

  /* 切换 Tab：保留各栈，重复点击当前 Tab 回到该栈根 */
  switchTab(tab) {
    if (this.active === tab) {
      if (this.stacks[tab].length > 1) this.popToRoot(tab);
      else this.scrollTop(tab);
      return;
    }
    const from = this.active;
    this.active = tab;
    $$('.stack').forEach((s) => s.classList.toggle('active', s.getAttribute('data-tab') === tab));
    this.renderTabBar();
    DB.data.activeTab = tab; DB.save();
    const stack = this.stacks[tab];
    if (stack.length && stack[stack.length - 1].onReenter) stack[stack.length - 1].onReenter(stack[stack.length - 1].el);
    this.syncEdge();
    // 滚到顶部
    const body = $('.stack[data-tab="' + tab + '"] .screen:last-child .screen-body');
    if (body) body.scrollTop = 0;
    return from;
  },

  popToRoot(tab) {
    const stack = this.stacks[tab];
    while (stack.length > 1) {
      const p = stack.pop();
      if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
    }
    const root = stack[0];
    if (root) { root.el.style.transform = ''; root.el.classList.remove('dim'); if (root.onReenter) root.onReenter(root.el); }
    this.syncEdge();
  },

  scrollTop(tab) {
    const body = $('.stack[data-tab="' + tab + '"] .screen:last-child .screen-body');
    if (!body) return;
    if (typeof body.scrollTo === 'function') body.scrollTo({ top: 0, behavior: 'smooth' });
    else body.scrollTop = 0;
  },

  /* 重建某个 Tab 的根页面 */
  reset(tab, pageFactory) {
    const host = this.el(tab);
    host.innerHTML = '';
    this.stacks[tab] = [];
    const page = pageFactory();
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.innerHTML = page.render();
    host.appendChild(screen);
    page.el = screen;
    this.stacks[tab].push(page);
    if (page.onEnter) page.onEnter(screen);
    this.syncEdge();
  },

  /* 重绘当前栈顶页面（保持滚动位置） */
  refresh() {
    const stack = this.stacks[this.active];
    if (!stack.length) return;
    const page = stack[stack.length - 1];
    const body = page.el.querySelector('.screen-body');
    const top = body ? body.scrollTop : 0;
    page.el.innerHTML = page.render();
    if (page.onEnter) page.onEnter(page.el);
    const nb = page.el.querySelector('.screen-body');
    if (nb) nb.scrollTop = top;
    this.syncEdge();
  },

  /* 重绘某个 Tab 的所有页面 */
  refreshTab(tab) {
    this.stacks[tab].forEach((page) => {
      const body = page.el.querySelector('.screen-body');
      const top = body ? body.scrollTop : 0;
      page.el.innerHTML = page.render();
      if (page.onEnter) page.onEnter(page.el);
      const nb = page.el.querySelector('.screen-body');
      if (nb) nb.scrollTop = top;
    });
  },

  syncEdge() {
    const stack = this.stacks[this.active];
    $('#edgeBack').style.display = stack && stack.length > 1 ? 'block' : 'none';
  },

  renderTabBar() {
    const bar = $('#tabbar');
    bar.innerHTML =
      '<div class="tab-pill">' +
      TABS.map((t) =>
        '<button class="tab-item' + (t.id === this.active ? ' on' : '') + '" data-tap="tab" data-arg="' + t.id + '">' +
        svg(t.icon, 'tab-ico') +
        '<span class="tab-label">' + t.label + '</span>' +
        '</button>'
      ).join('') +
      '</div>';
  }
};

/* ============================================================
   7. 边缘返回手势
   ============================================================ */
(function edgeBackGesture() {
  const edge = $('#edgeBack');
  let startX = 0, startY = 0, tracking = false, decided = false, dx = 0, cur = null, prev = null;

  edge.addEventListener('touchstart', (e) => {
    const stack = Nav.stacks[Nav.active];
    if (!stack || stack.length <= 1) return;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    tracking = true; decided = false; dx = 0;
    cur = stack[stack.length - 1];
    prev = stack[stack.length - 2];
  }, { passive: true });

  edge.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    const ddx = t.clientX - startX;
    const ddy = t.clientY - startY;
    if (!decided) {
      if (Math.abs(ddy) > Math.abs(ddx) && Math.abs(ddy) > 10) { tracking = false; return; }
      if (ddx > 6) decided = true;
      else if (ddx < -6) { tracking = false; return; }
    }
    if (!decided) return;
    dx = clamp(ddx, 0, window.innerWidth);
    document.body.setAttribute('data-dragging', '1');
    cur.el.classList.add('dragging');
    if (prev) prev.el.classList.add('dragging');
    cur.el.style.transform = 'translate3d(' + dx + 'px,0,0)';
    if (prev) {
      const p = -0.24 + (dx / window.innerWidth) * 0.24;
      prev.el.style.transform = 'translate3d(' + (p * 100) + '%,0,0)';
      prev.el.style.filter = 'brightness(' + (0.94 + 0.06 * (dx / window.innerWidth)) + ')';
    }
  }, { passive: true });

  function finish() {
    if (!tracking || !decided) { tracking = false; return; }
    tracking = false;
    document.body.removeAttribute('data-dragging');
    cur.el.classList.remove('dragging');
    if (prev) prev.el.classList.remove('dragging');
    const shouldPop = dx > window.innerWidth * 0.3;
    if (shouldPop) {
      cur.el.style.transition = '';
      cur.el.classList.add('pop-out');
      setTimeout(() => {
        if (cur.el.parentNode) cur.el.parentNode.removeChild(cur.el);
        if (prev) { prev.el.style.filter = ''; prev.el.classList.remove('dim'); }
      }, 290);
      const stack = Nav.stacks[Nav.active];
      const p = stack.pop();
      if (p.onLeave) p.onLeave();
      if (prev) {
        prev.el.style.transform = '';
        prev.el.style.filter = '';
        prev.el.classList.remove('dim');
        if (prev.onReenter) prev.onReenter(prev.el);
      }
      Nav.syncEdge();
    } else {
      cur.el.style.transform = '';
      if (prev) {
        prev.el.style.transform = 'translate3d(-24%,0,0)';
        prev.el.style.filter = '';
      }
    }
    dx = 0;
  }

  edge.addEventListener('touchend', finish, { passive: true });
  edge.addEventListener('touchcancel', finish, { passive: true });
})();

/* ============================================================
   8. Sheet / ActionSheet / 输入弹窗 / Toast
   ============================================================ */
const Sheet = {
  open(html, opts) {
    opts = opts || {};
    const host = $('#sheetHost');
    const mask = $('#sheetMask');
    host.innerHTML = '<div class="sheet">' +
      '<div class="sheet-grab"></div>' +
      (opts.title ? '<div class="sheet-title">' + esc(opts.title) + '</div>' : '') +
      '<div class="sheet-body">' + html + '</div>' +
      '</div>';
    mask.classList.add('on');
    void host.offsetWidth;
    host.querySelector('.sheet').classList.add('on');
    host.style.pointerEvents = 'auto';
    if (opts.onOpen) opts.onOpen(host);
    this.onClose = opts.onClose || null;
  },
  close() {
    const host = $('#sheetHost');
    const mask = $('#sheetMask');
    const s = host.querySelector('.sheet');
    if (s) s.classList.remove('on');
    mask.classList.remove('on');
    host.style.pointerEvents = 'none';
    if (this.onClose) { const f = this.onClose; this.onClose = null; f(); }
    setTimeout(() => { if (!mask.classList.contains('on')) host.innerHTML = ''; }, 300);
  },
  isOpen() { return $('#sheetMask').classList.contains('on'); }
};

$('#sheetMask').addEventListener('pointerdown', () => Sheet.close());

function actionSheet(title, actions) {
  const html = '<div class="sheet-actions">' + actions.map((a) =>
    '<button class="act-row' + (a.style ? ' ' + a.style : '') + '" data-tap="act" data-arg="' + a.key + '">' + esc(a.label) + '</button>'
  ).join('') + '</div>' +
    '<button class="act-row" data-tap="sheet-close">取消</button>';
  Sheet._actions = actions;
  Sheet.open(html, { title: title });
}

/* 文本输入弹窗（键盘避让已处理） */
function promptSheet(title, opts) {
  opts = opts || {};
  const html =
    '<div class="field" id="pf">' +
    '<input id="pi" type="text" placeholder="' + esc(opts.placeholder || '') + '" value="' + esc(opts.value || '') + '" ' +
    'autocomplete="off" autocorrect="off" autocapitalize="sentences" enterkeyhint="done" maxlength="' + (opts.max || 40) + '">' +
    '<button class="clear" data-tap="field-clear" data-arg="pi">×</button>' +
    '</div>' +
    (opts.hint ? '<div class="meta-line">' + esc(opts.hint) + '</div>' : '') +
    '<div class="cta-row">' +
    '<button class="cta ghost" data-tap="sheet-close">取消</button>' +
    '<button class="cta" data-tap="prompt-ok">' + esc(opts.ok || '确定') + '</button>' +
    '</div>';
  Sheet._promptCb = opts.onOk;
  Sheet.open(html, {
    title: title,
    onOpen() {
      const input = $('#pi');
      if (!input) return;
      $('#pf').classList.toggle('has-value', !!input.value);
      input.addEventListener('input', () => $('#pf').classList.toggle('has-value', !!input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); Bus.emit('tap', { action: 'prompt-ok' }); } });
      setTimeout(() => input.focus(), 260);
    }
  });
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}

/* 键盘避让：输入框聚焦时抬起 Sheet / CTA */
(function keyboardAvoid() {
  const vv = window.visualViewport;
  if (!vv) return;
  const host = $('#sheetHost');
  function apply() {
    const offset = Math.max(0, window.innerHeight - vv.height - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0));
    host.style.transform = offset > 0 ? 'translateY(-' + offset + 'px)' : '';
  }
  vv.addEventListener('resize', apply);
  vv.addEventListener('scroll', apply);
})();

/* 暴露到全局 */
window.App = { $, $$, esc, uid, clamp, svg, dotSvg, DB, Nav, TABS, Sheet, actionSheet, promptSheet, toast, Bus, Touch, ICONS };
})();
