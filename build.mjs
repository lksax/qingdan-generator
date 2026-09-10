/* 把 styles.css / app.js / data.js / screens.js 内联进 index.html，输出单文件 App */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(dir, f), 'utf8');

let html = read('index.html');
html = html.replace(
  /<link rel="stylesheet" href="styles\.css">/,
  '<style>\n' + read('styles.css') + '\n</style>'
);
html = html.replace(/<script src="(app|data|screens)\.js"><\/script>/g, (_, n) =>
  '<script>\n' + read(n + '.js') + '\n</script>'
);

const out = join(dir, '清单生成器.html');
writeFileSync(out, html, 'utf8');
console.log('已生成单文件：' + out + '  (' + (html.length / 1024).toFixed(1) + ' KB)');
