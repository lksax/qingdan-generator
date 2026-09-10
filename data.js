/* ============================================================
   清单生成器 · 场景库 / 条件库 / 清单生成规则
   ============================================================ */
(function () {
'use strict';

/* ---------------- 条件库 ---------------- */
const CONDS = {
  days: {
    title: '出行天数',
    type: 'grid', cols: 4,
    options: [
      { k: '1-2', label: '1-2天', n: 2 },
      { k: '3', label: '3天', n: 3 },
      { k: '4-7', label: '4-7天', n: 5 },
      { k: '7+', label: '7天以上', n: 8 }
    ],
    def: '3'
  },
  season: {
    title: '季节',
    type: 'grid', cols: 4,
    options: [
      { k: 'spring', label: '春季' },
      { k: 'summer', label: '夏季' },
      { k: 'autumn', label: '秋季' },
      { k: 'winter', label: '冬季' }
    ],
    def: ''
  },
  transport: {
    title: '交通方式',
    type: 'grid', cols: 4,
    options: [
      { k: 'plane', label: '飞机' },
      { k: 'train', label: '高铁' },
      { k: 'selfdrive', label: '自驾' },
      { k: 'coach', label: '大巴' }
    ],
    def: 'plane'
  },
  stay: {
    title: '住宿方式',
    type: 'grid', cols: 4,
    options: [
      { k: 'hotel', label: '酒店' },
      { k: 'homestay', label: '民宿' },
      { k: 'friend', label: '亲友家' },
      { k: 'camp', label: '露营' }
    ],
    def: 'hotel'
  },
  photo: {
    title: '是否拍照',
    type: 'switch',
    def: false,
    sub: '加入相机、备用电池等拍摄装备'
  },
  activity: {
    title: '特殊活动',
    type: 'grid', cols: 3,
    options: [
      { k: 'none', label: '无' },
      { k: 'seaside', label: '海边' },
      { k: 'camp', label: '露营' },
      { k: 'hiking', label: '徒步' },
      { k: 'concert', label: '演唱会' },
      { k: 'business', label: '出差办公' }
    ],
    def: 'none'
  },
  /* 搬家 */
  furniture: {
    title: '是否带家具',
    type: 'grid', cols: 2,
    options: [{ k: 'yes', label: '带家具' }, { k: 'no', label: '不带家具' }],
    def: 'yes'
  },
  appliance: {
    title: '大型电器',
    type: 'grid', cols: 2,
    options: [{ k: 'yes', label: '有大型电器' }, { k: 'no', label: '无大型电器' }],
    def: 'yes'
  },
  mover: {
    title: '搬运方式',
    type: 'grid', cols: 2,
    options: [{ k: 'self', label: '自己搬' }, { k: 'company', label: '搬家公司' }],
    def: 'company'
  },
  /* 养猫 */
  catAge: {
    title: '猫咪年龄',
    type: 'grid', cols: 2,
    options: [{ k: 'kitten', label: '幼猫' }, { k: 'adult', label: '成猫' }],
    def: 'kitten'
  },
  catCount: {
    title: '猫咪数量',
    type: 'grid', cols: 2,
    options: [{ k: 'one', label: '一只' }, { k: 'multi', label: '多只' }],
    def: 'one'
  },
  firstTime: {
    title: '是否第一次养猫',
    type: 'grid', cols: 2,
    options: [{ k: 'yes', label: '第一次养' }, { k: 'no', label: '养过猫' }],
    def: 'yes'
  },
  pickup: {
    title: '是否需要接猫回家',
    type: 'switch',
    def: true,
    sub: '加入「接猫回家」阶段事项'
  }
};

/* ---------------- 场景库 ---------------- */
/* kind: travel | move | cat | life */
const SCENES = [
  /* 出行 */
  { id: 'travel', name: '旅行', group: '出行', kind: 'travel', conds: ['days', 'season', 'transport', 'stay', 'photo', 'activity'] },
  { id: 'shorttrip', name: '短途旅行', group: '出行', kind: 'travel', conds: ['days', 'season', 'transport', 'stay', 'photo'], preset: { days: '1-2', stay: 'hotel' } },
  { id: 'business', name: '出差', group: '出行', kind: 'travel', conds: ['days', 'season', 'transport', 'stay', 'photo'], preset: { activity: 'business', stay: 'hotel' } },
  { id: 'weekend', name: '周末出行', group: '出行', kind: 'travel', light: true, conds: ['days', 'transport', 'stay', 'photo'], preset: { days: '1-2' } },
  { id: 'hotel', name: '住酒店', group: '出行', kind: 'travel', light: true, conds: ['days', 'season', 'photo'], preset: { stay: 'hotel', transport: 'train' } },
  { id: 'overnight', name: '过夜', group: '出行', kind: 'travel', light: true, conds: ['days', 'transport', 'photo'], preset: { days: '1-2', stay: 'friend' } },
  { id: 'seaside', name: '海边', group: '出行', kind: 'travel', conds: ['days', 'season', 'transport', 'stay', 'photo'], preset: { activity: 'seaside' } },
  { id: 'camping', name: '露营', group: '出行', kind: 'travel', conds: ['days', 'season', 'transport', 'photo'], preset: { activity: 'camp', stay: 'camp' } },
  { id: 'selfdrive', name: '自驾', group: '出行', kind: 'travel', conds: ['days', 'season', 'stay', 'photo'], preset: { transport: 'selfdrive' } },
  { id: 'plane', name: '飞机', group: '出行', kind: 'travel', conds: ['days', 'season', 'stay', 'photo'], preset: { transport: 'plane' } },
  { id: 'highspeed', name: '高铁', group: '出行', kind: 'travel', conds: ['days', 'season', 'stay', 'photo'], preset: { transport: 'train' } },
  { id: 'concert', name: '演唱会', group: '出行', kind: 'travel', light: true, conds: ['days', 'transport', 'stay', 'photo'], preset: { activity: 'concert', days: '1-2' } },
  { id: 'photo', name: '拍照', group: '出行', kind: 'travel', light: true, conds: ['days', 'season', 'transport', 'stay'], preset: { photo: true } },

  /* 生活 */
  { id: 'moving', name: '搬家', group: '生活', kind: 'move', conds: ['furniture', 'appliance', 'mover'] },
  { id: 'renting', name: '租房', group: '生活', kind: 'life',
    items: [
      ['证件材料', ['身份证复印件', '工作证明', '押金与租金', '租赁合同']],
      ['看房检查', ['水电是否正常', '网络信号', '采光通风', '隔音情况', '周边配套']],
      ['入住准备', ['钥匙与门禁', '更换锁芯', '开荒清洁', '宽带办理', '燃气开通']]
    ] },
  { id: 'school', name: '开学', group: '生活', kind: 'life',
    items: [
      ['证件材料', ['录取通知书', '身份证', '学籍档案', '组织关系', '证件照']],
      ['宿舍用品', ['被褥床品', '洗漱用品', '衣架', '插排', '台灯']],
      ['学习用品', ['笔记本', '笔袋', '书包', 'U盘', '电脑充电器']],
      ['生活用品', ['水杯', '常备药', '雨伞', '晾衣杆']]
    ] },
  { id: 'party', name: '聚会', group: '生活', kind: 'life',
    items: [
      ['场地', ['场地预订', '场地布置', '背景音乐', '座位安排']],
      ['餐饮', ['饮料', '零食', '餐具纸杯', '蛋糕']],
      ['其他', ['拍照道具', '垃圾袋', '备用充电宝', '急救包']]
    ] },
  { id: 'birthday', name: '生日', group: '生活', kind: 'life',
    items: [
      ['场地布置', ['气球', '横幅', '彩带', '桌布']],
      ['餐饮', ['生日蛋糕', '饮料', '零食', '蜡烛']],
      ['流程', ['礼物准备', '拍照安排', '音乐歌单', '时间安排']]
    ] },
  { id: 'shopping', name: '日常采购', group: '生活', kind: 'life',
    items: [
      ['食材', ['蔬菜', '水果', '肉类', '蛋奶']],
      ['日用品', ['纸巾', '洗衣液', '洗洁精', '垃圾袋']],
      ['其他', ['米面粮油', '调味品', '清洁工具']]
    ] },

  /* 宠物 */
  { id: 'catready', name: '准备养猫', group: '宠物', kind: 'cat', conds: ['catAge', 'catCount', 'firstTime', 'pickup'] },
  { id: 'cathome', name: '接猫回家', group: '宠物', kind: 'cat', conds: ['catAge', 'catCount', 'firstTime'], preset: { pickup: true } },
  { id: 'catnewhome', name: '猫咪新家准备', group: '宠物', kind: 'cat', conds: ['catAge', 'catCount'], preset: { pickup: false } },
  { id: 'catdaily', name: '猫咪日常用品', group: '宠物', kind: 'cat', conds: ['catCount'], preset: { pickup: false } },
  { id: 'catout', name: '猫咪外出', group: '宠物', kind: 'cat', conds: ['catCount'], preset: { pickup: false },
    extra: [['外出用品', ['航空箱', '牵引绳', '宠物背包', '便携水壶', '一次性尿垫']]] },
  { id: 'catfoster', name: '猫咪寄养准备', group: '宠物', kind: 'cat', conds: ['catCount'], preset: { pickup: false },
    extra: [['寄养准备', ['寄养机构确认', '疫苗本', '常备猫粮', '常用玩具', '紧急联系人']]] }
];

const SCENE_MAP = {};
SCENES.forEach((s) => { SCENE_MAP[s.id] = s; });

/* ---------------- 旅行清单生成 ---------------- */
function genTravel(c) {
  const n = (CONDS.days.options.find((o) => o.k === (c.days || '3')) || { n: 3 }).n;
  const cats = [];
  const put = (cat, text, qty) => {
    let g = cats.find((x) => x.name === cat);
    if (!g) { g = { name: cat, items: [] }; cats.push(g); }
    g.items.push({ text: text, qty: qty || 0 });
  };
  const is = (k, v) => c[k] === v;

  /* 证件 */
  put('证件', '身份证');
  put('证件', '银行卡');
  put('证件', '现金零钱');
  if (is('transport', 'plane')) put('证件', '机票行程单');
  if (is('transport', 'train')) put('证件', '高铁票');
  if (is('transport', 'selfdrive')) { put('证件', '驾驶证'); put('证件', '行驶证'); }
  if (is('stay', 'hotel') || is('stay', 'homestay')) put('证件', '住宿预订确认单');

  /* 衣物 */
  put('衣物', 'T恤', n + 2);
  put('衣物', '内衣', n + 2);
  put('衣物', '袜子', n + 2);
  put('衣物', '裤子', Math.min(4, Math.ceil(n / 2) + 1));
  put('衣物', '外套', 1);
  put('衣物', '睡衣', 1);
  put('衣物', '运动鞋', 1);
  if (is('stay', 'homestay') || is('stay', 'friend') || is('stay', 'camp')) put('衣物', '拖鞋', 1);
  if (is('season', 'summer')) { put('衣物', '帽子', 1); put('衣物', '凉鞋', 1); }
  if (is('season', 'winter')) { put('衣物', '厚外套', 1); put('衣物', '保暖内衣', 2); put('衣物', '手套围巾', 1); }
  if (c.activity === 'seaside') { put('衣物', '泳衣', 1); put('衣物', '沙滩鞋', 1); }
  if (c.activity === 'business') put('衣物', '正装衬衫', 2);
  if (c.activity === 'hiking') { put('衣物', '登山鞋', 1); put('衣物', '速干衣', 2); }
  if (c.activity === 'concert') put('衣物', '应援服', 1);

  /* 电子设备 */
  put('电子设备', '手机充电器');
  put('电子设备', '充电宝');
  put('电子设备', '耳机');
  put('电子设备', '数据线', 2);
  if (is('transport', 'plane')) put('电子设备', '转换插头');
  if (is('transport', 'selfdrive')) { put('电子设备', '车载充电器'); put('电子设备', '手机支架'); }
  if (c.photo) {
    put('电子设备', '相机');
    put('电子设备', '相机备用电池', 2);
    put('电子设备', '存储卡', 2);
    put('电子设备', '镜头清洁布');
    if (c.activity === 'hiking' || is('stay', 'camp')) put('电子设备', '三脚架');
  }
  if (c.activity === 'business') { put('电子设备', '笔记本电脑'); put('电子设备', '电脑充电器'); }

  /* 洗漱 */
  put('洗漱', '牙刷牙膏');
  put('洗漱', '洗面奶');
  put('洗漱', '护肤品小样');
  if (is('stay', 'homestay') || is('stay', 'camp') || is('stay', 'friend')) {
    put('洗漱', '沐浴洗发'); put('洗漱', '毛巾');
  }
  if (is('season', 'summer') || c.activity === 'seaside') { put('洗漱', '防晒霜'); put('洗漱', '墨镜'); }
  if (is('season', 'summer') || c.activity === 'camp' || c.activity === 'hiking') put('洗漱', '驱蚊液');
  if (is('season', 'winter')) put('洗漱', '润唇膏');

  /* 日用品 */
  put('日用品', '纸巾湿巾');
  put('日用品', '雨伞');
  put('日用品', '常备药');
  put('日用品', '创可贴');
  put('日用品', '指甲剪');
  put('日用品', '水杯');

  /* 食物 */
  put('食物', '饮用水', 2);
  put('食物', '零食');
  if (is('transport', 'selfdrive') || c.activity === 'camp' || c.activity === 'hiking') put('食物', '能量补给');
  if (is('stay', 'hotel') || is('stay', 'homestay')) put('食物', '泡面速食');

  /* 活动用品 */
  if (c.activity === 'seaside') {
    put('活动用品', '沙滩巾'); put('活动用品', '防水袋'); put('活动用品', '浮潜镜'); put('活动用品', '沙滩玩具');
  }
  if (c.activity === 'camp') {
    put('活动用品', '帐篷'); put('活动用品', '睡袋'); put('活动用品', '防潮垫'); put('活动用品', '营地灯');
  }
  if (c.activity === 'hiking') {
    put('活动用品', '登山杖'); put('活动用品', '登山包'); put('活动用品', '护膝');
  }
  if (c.activity === 'concert') {
    put('活动用品', '演唱会门票'); put('活动用品', '应援物'); put('活动用品', '护耳耳塞'); put('活动用品', '便携小风扇');
  }
  if (c.activity === 'business') {
    put('活动用品', '名片'); put('活动用品', '文件资料'); put('活动用品', '签字笔');
  }

  /* 其他 */
  put('其他', '背包');
  put('其他', '折叠购物袋');
  if (is('transport', 'selfdrive')) put('其他', '停车卡与零钱');

  return cats;
}

/* 轻量出行（住酒店 / 过夜 / 演唱会 / 拍照等短时场景） */
function genTravelLight(c) {
  const cats = [];
  const put = (cat, text, qty) => {
    let g = cats.find((x) => x.name === cat);
    if (!g) { g = { name: cat, items: [] }; cats.push(g); }
    g.items.push({ text: text, qty: qty || 0 });
  };
  const is = (k, v) => c[k] === v;

  put('证件', '身份证');
  put('证件', '现金零钱');
  if (is('transport', 'plane')) put('证件', '机票行程单');
  if (is('transport', 'train')) put('证件', '高铁票');
  if (is('transport', 'selfdrive')) put('证件', '驾驶证');

  put('衣物', '换洗衣物', 2);
  put('衣物', '外套', 1);
  if (c.activity === 'seaside') put('衣物', '泳衣', 1);
  if (c.activity === 'concert') put('衣物', '应援服', 1);
  if (is('season', 'winter')) put('衣物', '厚外套', 1);

  put('电子设备', '手机充电器');
  put('电子设备', '充电宝');
  put('电子设备', '数据线', 1);
  if (c.photo) { put('电子设备', '相机'); put('电子设备', '相机备用电池', 1); put('电子设备', '存储卡', 1); }

  if (is('stay', 'homestay') || is('stay', 'camp') || is('stay', 'friend')) {
    put('洗漱', '牙刷牙膏'); put('洗漱', '洗面奶');
  }
  if (is('season', 'summer') || c.activity === 'seaside') put('洗漱', '防晒霜');

  put('日用品', '纸巾湿巾');
  put('日用品', '常备药');

  if (c.activity === 'concert') {
    put('活动用品', '演唱会门票'); put('活动用品', '应援物');
    put('活动用品', '护耳耳塞'); put('活动用品', '便携小风扇');
  }
  if (c.activity === 'seaside') {
    put('活动用品', '沙滩巾'); put('活动用品', '防水袋');
  }
  if (c.activity === 'camp') {
    put('活动用品', '帐篷'); put('活动用品', '睡袋');
  }

  put('其他', '背包');
  return cats;
}

/* ---------------- 搬家清单生成 ---------------- */
const MOVE_BASE = [
  ['卧室', [
    ['衣物', ['当季衣物', '换季衣物', '鞋子', '包袋配饰']],
    ['床上用品', ['被子', '枕头', '床单被套', '凉席床垫']],
    ['书籍', ['常用书籍', '藏书', '杂志画册', '文具']],
    ['个人物品', ['化妆品', '首饰手表', '药品', '闹钟']]
  ]],
  ['卫生间', [
    ['洗漱用品', ['牙刷牙膏', '洗面奶', '沐浴洗发', '毛巾浴巾']],
    ['护肤用品', ['水乳精华', '面膜', '防晒', '美妆工具']],
    ['清洁用品', ['马桶刷', '清洁剂', '拖把扫把', '垃圾袋']]
  ]],
  ['厨房', [
    ['餐具', ['碗盘', '筷子勺子', '杯子', '保鲜盒']],
    ['厨具', ['锅具', '刀具砧板', '铲勺', '烘焙工具']],
    ['食品', ['米面粮油', '调味品', '干货', '零食']],
    ['小家电', ['电饭煲', '微波炉', '烧水壶', '破壁机']]
  ]],
  ['客厅', [
    ['电器', ['电视', '空调', '扫地机器人', '音响']],
    ['装饰品', ['挂画', '绿植', '摆件', '照片墙']],
    ['书籍', ['书柜藏书', '影音光盘', '遥控器', '机顶盒']],
    ['杂物', ['数据线', '工具箱', '备用灯泡', '遥控器电池']]
  ]],
  ['其他', [
    ['文件', ['房产证合同', '证件', '票据保修卡', '说明书']],
    ['贵重物品', ['现金首饰', '电子产品', '收藏品', '数据备份']],
    ['零碎物品', ['钥匙', '雨伞', '宠物用品', '备用行李箱']]
  ]]
];

function genMove(c) {
  const cats = MOVE_BASE.map((room) => ({
    name: room[0],
    items: room[1].reduce((acc, sub) => acc.concat(sub[1].map((t) => ({ text: t, sub: sub[0] }))), [])
  }));

  const extra = [];
  if (c.furniture === 'yes') {
    extra.push({ text: '拆装工具', sub: '大件' });
    extra.push({ text: '家具保护膜', sub: '大件' });
    extra.push({ text: '螺丝收纳袋', sub: '大件' });
  }
  if (c.appliance === 'yes') {
    extra.push({ text: '冰箱断电排水', sub: '大件' });
    extra.push({ text: '洗衣机排水固定', sub: '大件' });
    extra.push({ text: '空调拆机预约', sub: '大件' });
  }
  if (c.mover === 'company') {
    extra.push({ text: '预约搬家公司', sub: '准备' });
    extra.push({ text: '拍照留档贵重物品', sub: '准备' });
  } else {
    extra.push({ text: '借用手推车', sub: '准备' });
    extra.push({ text: '预约搬家帮手', sub: '准备' });
  }
  extra.push({ text: '打包纸箱', sub: '准备' });
  extra.push({ text: '气泡膜与缠绕膜', sub: '准备' });
  extra.push({ text: '记号笔与标签', sub: '准备' });
  extra.push({ text: '封箱胶带', sub: '准备' });
  cats.push({ name: '搬家准备', items: extra });
  return cats;
}

/* ---------------- 养猫清单生成 ---------------- */
function genCat(c) {
  const cats = [];
  const put = (cat, text, cycle) => {
    let g = cats.find((x) => x.name === cat);
    if (!g) { g = { name: cat, items: [] }; cats.push(g); }
    g.items.push({ text: text, cycle: cycle || '' });
  };

  /* 接猫前 · 固定 13 项 */
  put('接猫前', '猫砂盆', c.catCount === 'multi' ? '2 个' : '');
  put('接猫前', '猫砂');
  put('接猫前', c.catAge === 'kitten' ? '幼猫粮' : '成猫粮');
  put('接猫前', '食盆 + 水碗');
  put('接猫前', '猫抓板');
  put('接猫前', '运输箱');
  put('接猫前', '猫窝');
  put('接猫前', '逗猫棒');
  put('接猫前', '猫玩具');
  put('接猫前', '指甲剪');
  put('接猫前', '梳子');
  put('接猫前', '宠物湿巾');
  put('接猫前', '体内外驱虫药');

  /* 接猫回家 · 6 项 */
  if (c.pickup) {
    put('接猫回家', '确认隔离空间');
    put('接猫回家', '放置猫砂盆');
    put('接猫回家', '备好饮水与猫粮');
    put('接猫回家', '检查门窗安全');
    put('接猫回家', '收起危险物品');
    put('接猫回家', '预约宠物医院建档');
  }

  /* 日常养猫 · 周期事项 6 项 */
  put('日常养猫', '补充猫粮', '每天');
  put('日常养猫', '补充饮水', '每天');
  put('日常养猫', '清理猫砂', '每天');
  put('日常养猫', '清洗食盆和水碗', '每周');
  put('日常养猫', '整理猫咪用品', '每周');
  put('日常养猫', '检查消耗品', '每月');

  return cats;
}

/* ---------------- 生活类清单生成 ---------------- */
function genLife(scene, c) {
  const cats = (scene.items || []).map((g) => ({
    name: g[0],
    items: (g[1] || []).map((t) => ({ text: t }))
  }));
  if (scene.extra) {
    scene.extra.forEach((g) => {
      let target = cats.find((x) => x.name === g[0]);
      if (!target) { target = { name: g[0], items: [] }; cats.push(target); }
      g[1].forEach((t) => target.items.push({ text: t }));
    });
  }
  return cats;
}

/* ---------------- 统一生成入口 ---------------- */
function generate(sceneIds, conds) {
  const scenes = sceneIds.map((id) => SCENE_MAP[id]).filter(Boolean);
  if (!scenes.length) return { cats: [], kind: 'travel', title: '' };

  /* 主 kind 优先级：move > cat > travel > life */
  let kind = 'life';
  if (scenes.some((s) => s.kind === 'move')) kind = 'move';
  else if (scenes.some((s) => s.kind === 'cat')) kind = 'cat';
  else if (scenes.some((s) => s.kind === 'travel')) kind = 'travel';

  const mainScene = scenes.find((s) => s.kind === kind) || scenes[0];
  let cats = [];

  if (kind === 'move') cats = genMove(conds);
  else if (kind === 'cat') cats = genCat(conds);
  else if (kind === 'travel') {
    const light = scenes.some((s) => s.light) && !scenes.some((s) => s.kind === 'travel' && !s.light);
    cats = light ? genTravelLight(conds) : genTravel(conds);
  }
  else cats = genLife(mainScene, conds);

  /* 合并同类目去重 */
  const merged = [];
  const seenText = {};
  cats.forEach((g) => {
    let target = merged.find((x) => x.name === g.name);
    if (!target) { target = { name: g.name, items: [] }; merged.push(target); }
    g.items.forEach((it) => {
      const key = g.name + '/' + it.text;
      if (seenText[key]) return;
      seenText[key] = 1;
      target.items.push(it);
    });
  });

  /* 其他场景的附加项目（如猫咪外出、寄养） */
  scenes.forEach((s) => {
    if (s === mainScene) return;
    if (s.kind === 'life' && s.items) {
      s.items.forEach((g) => {
        let target = merged.find((x) => x.name === g[0]);
        if (!target) { target = { name: g[0], items: [] }; merged.push(target); }
        g[1].forEach((t) => {
          if (!target.items.some((x) => x.text === t)) target.items.push({ text: t });
        });
      });
    }
    if (s.extra) {
      s.extra.forEach((g) => {
        let target = merged.find((x) => x.name === g[0]);
        if (!target) { target = { name: g[0], items: [] }; merged.push(target); }
        g[1].forEach((t) => {
          if (!target.items.some((x) => x.text === t)) target.items.push({ text: t });
        });
      });
    }
  });

  return { cats: merged.filter((g) => g.items.length), kind: kind, scene: mainScene };
}

/* ---------------- 默认标题 ---------------- */
function defaultTitle(sceneIds, conds) {
  const now = new Date();
  const names = sceneIds.map((id) => (SCENE_MAP[id] ? SCENE_MAP[id].name : '')).filter(Boolean);
  const main = names[0] || '清单';
  const ym = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
  if (main === '搬家') return ym + '搬家';
  if (main === '准备养猫' || main === '接猫回家') return ym + '养猫准备';
  return ym + main;
}

/* ---------------- 系统模板 ---------------- */
const SYSTEM_TEMPLATES = [
  { id: 'sys-travel3', name: '3天旅行', kind: 'travel', desc: '出行', scenes: ['travel'], conds: { days: '3', transport: 'plane', stay: 'hotel', season: 'autumn', photo: false, activity: 'none' } },
  { id: 'sys-moving', name: '搬家', kind: 'move', desc: '生活 · 按房间', scenes: ['moving'], conds: { furniture: 'yes', appliance: 'yes', mover: 'company' } },
  { id: 'sys-cat', name: '准备养猫', kind: 'cat', desc: '宠物 · 分阶段', scenes: ['catready'], conds: { catAge: 'kitten', catCount: 'one', firstTime: 'yes', pickup: true } },
  { id: 'sys-shopping', name: '日常采购', kind: 'life', desc: '生活', scenes: ['shopping'], conds: {} },
  { id: 'sys-concert', name: '演唱会', kind: 'travel', desc: '出行', scenes: ['concert'], conds: { days: '1-2', transport: 'train', stay: 'friend', photo: false, activity: 'concert' } }
];

/* ---------------- 默认物品库 ---------------- */
const DEFAULT_ITEMS = ['充电器', '耳机', '相机', '充电宝', '猫砂铲', '运输箱', '护照', '雨伞', '转换插头', '洗漱包', '指甲剪', '常备药'];

window.Data = {
  CONDS: CONDS, SCENES: SCENES, SCENE_MAP: SCENE_MAP,
  SYSTEM_TEMPLATES: SYSTEM_TEMPLATES, DEFAULT_ITEMS: DEFAULT_ITEMS,
  generate: generate, defaultTitle: defaultTitle,
  GROUPS: ['出行', '生活', '宠物']
};
})();
