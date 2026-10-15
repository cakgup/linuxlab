const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'../public/ctf');
const html = fs.readFileSync(path.join(root,'lab.html'),'utf8');
assert(!/\son\w+=/i.test(html),'Unexpected original inline event handler');
assert(!/https?:\/\/|__INITIAL_PARTICIPANT__|085717119171/.test(html),'Remote URL or original session data retained');
for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if(url==='../../') continue;
  assert(fs.existsSync(path.resolve(root,url)),`Missing local resource ${url}`);
}
const answers=JSON.parse(fs.readFileSync(path.join(root,'answers.json'),'utf8'));
for(let stage=1;stage<=5;stage++) {
  assert.match(answers[stage],/^[a-f0-9]{64}$/,'Main stages require configured SHA-256 keys');
  assert(html.includes(`id="formStage${stage}"`));
  assert(html.includes(`id="lockOverlayStage${stage}"`));
}
assert(answers[6]===null || /^[a-f0-9]{64}$/.test(answers[6]),'Invalid bonus configuration');
const evidence=fs.readdirSync(path.join(root,'evidence'),{recursive:true}).filter(p=>fs.statSync(path.join(root,'evidence',p)).isFile());
assert.equal(evidence.length,13,'Expected 13 original evidence files');
for(const file of evidence) assert(html.includes(path.basename(file)),`Evidence omitted from UI: ${file}`);
console.log('PASS: CTF local assets, 13 evidence files, five configured keys, and sanitized reference.');
