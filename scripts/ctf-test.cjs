const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'../public/ctf');
const html = fs.readFileSync(path.join(root,'lab.html'),'utf8');
assert(!/\son\w+=/i.test(html),'Unexpected original inline event handler');
assert(!/https?:\/\/|__INITIAL_PARTICIPANT__|085717119171/.test(html),'Remote URL or original session data retained');
for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if(url==='arena/') continue; // Next.js catalog route, checked in the static export.
  assert(fs.existsSync(path.resolve(root,url.split(/[?#]/)[0])),`Missing local resource ${url}`);
}
const answers=JSON.parse(fs.readFileSync(path.join(root,'answers.json'),'utf8'));
const writeup=JSON.parse(fs.readFileSync(path.join(root,'write-up.enc.json'),'utf8'));
assert.equal(writeup.version,1);
assert.equal(writeup.iterations,210000);
assert.equal(Buffer.from(writeup.salt,'base64').length,16);
assert.equal(Buffer.from(writeup.iv,'base64').length,12);
assert(Buffer.from(writeup.ciphertext,'base64').length>16,'Missing encrypted write-up');
assert(!JSON.stringify(writeup).includes('MOFCG{'),'Write-up must not expose plaintext flags');
for(let stage=1;stage<=9;stage++) {
  assert.match(answers[stage],/^[a-f0-9]{64}$/,'Main stages require configured SHA-256 keys');
  assert(html.includes(`id="formStage${stage===6?'Bonus':stage}"`));
  assert(html.includes(`id="pipeNode${stage}"`));
  if(stage<=5) assert(html.includes(`id="lockOverlayStage${stage}"`));
}
assert(answers[6]===null || /^[a-f0-9]{64}$/.test(answers[6]),'Invalid bonus configuration');
const evidence=fs.readdirSync(path.join(root,'evidence'),{recursive:true}).filter(p=>fs.statSync(path.join(root,'evidence',p)).isFile());
assert.equal(evidence.length,16,'Expected 16 evidence files across Stage 1–9');
for(const file of evidence) assert(html.includes(path.basename(file)),`Evidence omitted from UI: ${file}`);
console.log('PASS: CTF local assets, 16 evidence files, nine configured keys, and sanitized reference.');
