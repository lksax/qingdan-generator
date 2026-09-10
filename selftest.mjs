/* 数据层自检：验证各场景清单生成结果 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
global.window = {};
eval(readFileSync(join(dir, 'data.js'), 'utf8'));
const D = window.Data;

function show(label, scenes, conds) {
  const r = D.generate(scenes, conds);
  const n = r.cats.reduce((a, g) => a + g.items.length, 0);
  console.log(label.padEnd(14), '| kind=' + r.kind.padEnd(6), '| 共 ' + String(n).padStart(2) + ' 项 |',
    r.cats.map((g) => g.name + '(' + g.items.length + ')').join(' '));
}

show('3天旅行', ['travel'], { days: '3', transport: 'plane', stay: 'hotel', season: 'autumn', photo: false, activity: 'none' });
show('演唱会', ['concert'], { days: '1-2', transport: 'train', stay: 'hotel', photo: true, activity: 'concert' });
show('搬家', ['moving'], { furniture: 'yes', appliance: 'yes', mover: 'company' });
show('搬家(自己搬)', ['moving'], { furniture: 'no', appliance: 'no', mover: 'self' });
show('准备养猫', ['catready'], { catAge: 'kitten', catCount: 'one', firstTime: 'yes', pickup: true });
show('养猫(多只成猫)', ['cathome'], { catAge: 'adult', catCount: 'multi', firstTime: 'no', pickup: true });
show('日常采购', ['shopping'], {});
show('开学', ['school'], {});
show('旅行+海边+拍照', ['travel', 'seaside', 'photo'], { days: '4-7', season: 'summer', transport: 'plane', stay: 'homestay', photo: true, activity: 'seaside' });
show('冬日自驾', ['travel', 'selfdrive'], { days: '7+', season: 'winter', transport: 'selfdrive', stay: 'hotel', photo: false, activity: 'none' });

console.log('');
console.log('场景总数:', D.SCENES.length,
  '| 出行', D.SCENES.filter((s) => s.group === '出行').length,
  '生活', D.SCENES.filter((s) => s.group === '生活').length,
  '宠物', D.SCENES.filter((s) => s.group === '宠物').length);

console.log('系统模板项数:');
D.SYSTEM_TEMPLATES.forEach((t) => {
  const n = D.generate(t.scenes, t.conds).cats.reduce((a, g) => a + g.items.length, 0);
  console.log('  ' + t.name.padEnd(8), n + ' 项');
});

/* 重复项检查 */
['travel', 'moving', 'catready'].forEach((s) => {
  const sc = D.SCENE_MAP[s];
  const conds = {};
  (sc.conds || []).forEach((k) => { conds[k] = D.CONDS[k].type === 'switch' ? !!D.CONDS[k].def : (D.CONDS[k].def || ''); });
  if (s === 'catready') conds.pickup = true;
  const r = D.generate([s], conds);
  const all = [];
  r.cats.forEach((g) => g.items.forEach((it) => all.push(g.name + '/' + it.text)));
  const dup = all.filter((x, i) => all.indexOf(x) !== i);
  console.log('去重检查 [' + s + ']:', dup.length ? '发现重复 ' + dup.join(', ') : '无重复 ✓');
});
