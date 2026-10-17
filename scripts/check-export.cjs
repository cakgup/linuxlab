const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../out');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
assert(fs.existsSync(path.join(root, 'index.html')), 'Missing exported homepage');
assert(fs.existsSync(path.join(root, '404.html')), 'Missing exported 404 page');
const files = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.html'));
let checked = 0;
for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    assert(url.startsWith(`${basePath}/`), `${file}: incorrect deployment path ${url}`);
    const target = path.join(root, decodeURIComponent(url.slice(basePath.length)));
    assert(fs.existsSync(target), `${file}: missing asset or route ${url}`);
    if (fs.statSync(target).isDirectory()) {
      assert(fs.existsSync(path.join(target, 'index.html')), `${file}: missing route index ${url}`);
    }
    checked++;
  }
}
console.log(`PASS: ${files.length} exported HTML files, ${checked} local links and assets (${basePath || '/'}).`);
const vmFixture = fs.readFileSync(path.resolve(__dirname, '../lib/laser-vm-fixtures.ts'), 'utf8');
const vmNodes = JSON.parse(vmFixture.split('export const laserVmNodes: VNode[] = ')[1].split(/;\r?\n/)[0]);
for (const node of vmNodes.filter(node => node.blob)) {
  const target = path.join(root, 'ctf/linux-vm', node.blob);
  assert(fs.existsSync(target), `Missing lazy original VM asset: ${node.blob}`);
  const bytes = require('node:zlib').gunzipSync(fs.readFileSync(target));
  assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'), node.digests.sha256sum, node.path);
}
console.log('PASS: lazy original VM assets exported with matching SHA-256.');
