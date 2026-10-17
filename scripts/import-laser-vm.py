"""Build browser fixtures from the explicitly authorized, read-only VM capture.

Run after scripts/audit-laser-vm.py and downloading SHA-256-verified gzip blobs
into tmp/vm-files. Private shell history, SSH/GPG keys and caches are excluded.
Large originals remain gzip assets and are loaded only when a command reads them.
"""
import base64
import gzip
import hashlib
import json
import pathlib
import shutil
from laser_artifacts import rebrand

root = pathlib.Path(__file__).resolve().parents[1]
snapshot = json.loads((root / 'tmp/vm-snapshot.json').read_text())
assets = root / 'public/ctf/linux-vm'
assets.mkdir(parents=True, exist_ok=True)
nodes = []
used_assets = set()
adaptations = []
for source in snapshot['nodes']:
    if 'error' in source:
        raise RuntimeError(source)
    node = {key: source[key] for key in ['path', 'mode', 'owner', 'group', 'type', 'size']}
    node['name'] = source['path'].rsplit('/', 1)[-1] or '/'
    node['path'] = node['path'].replace('Laser{', 'Cakgup{')
    node['name'] = node['name'].replace('Laser{', 'Cakgup{')
    node['modified'] = source['mtime']
    if source['type'] == 'file':
        packed = root / 'tmp/vm-files' / (source['sha256'] + '.gz')
        content = gzip.decompress(packed.read_bytes())
        assert hashlib.sha256(content).hexdigest() == source['sha256']
        content = rebrand(source['path'], content, root)
        node['size'] = len(content)
        current_hash = hashlib.sha256(content).hexdigest()
        adaptations.append(dict(path=node['path'], original_sha256=source['sha256'], sha256=current_hash))
        node['digests'] = {name: hashlib.new(algorithm, content).hexdigest() for name, algorithm in
                           [('md5sum', 'md5'), ('sha1sum', 'sha1'), ('sha256sum', 'sha256'), ('sha512sum', 'sha512')]}
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
            node['binary'] = True
        if len(content) <= 4096:
            node['content'] = text
        else:
            name = current_hash + '.gz'
            (assets / name).write_bytes(gzip.compress(content, mtime=0))
            used_assets.add(name)
            node['blob'] = name
    nodes.append(node)
for unused in assets.glob('*.gz'):
    assert unused.resolve().parent == assets.resolve()
    if unused.name not in used_assets:
        unused.unlink()
header = '// Derived from the authorized Laser VM capture; flags rebranded to Cakgup. See docs/LASER_VM_PARITY.md.\nimport type { VNode } from "./types";\n'
output = header + 'export const laserVmNodes: VNode[] = ' + json.dumps(nodes, ensure_ascii=True, separators=(',', ':')) + ';\n'
output += 'export const laserVmUname = ' + json.dumps(snapshot['uname']) + ';\n'
output += 'export const laserVmAccounts = ' + json.dumps(snapshot['accounts'], separators=(',', ':')) + ';\n'
(root / 'lib/laser-vm-fixtures.ts').write_text(output, encoding='utf-8')
(root / 'docs/LASER_FLAG_ADAPTATIONS.json').write_text(json.dumps(adaptations, indent=2) + '\n', encoding='utf-8')
print('Imported', len(nodes), 'verified nodes;', len(list(assets.glob('*.gz'))), 'lazy gzip assets')
