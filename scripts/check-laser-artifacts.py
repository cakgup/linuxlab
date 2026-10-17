"""Inspect the shipped bytes and decode archives/encoded challenge payloads."""
import base64
import gzip
import io
import json
import pathlib
import re
import shutil
import struct
import subprocess
import tarfile
import tempfile
import zipfile
import zlib

root = pathlib.Path(__file__).resolve().parents[1]
source = (root / 'lib/laser-vm-fixtures.ts').read_text(encoding='utf-8')
nodes = json.loads(source.split('export const laserVmNodes: VNode[] = ')[1].split(';\n')[0])

def content(node):
    return gzip.decompress((root / 'public/ctf/linux-vm' / node['blob']).read_bytes()) if 'blob' in node else node['content'].encode('latin-1' if node.get('binary') else 'utf-8')

def file_at(path):
    return content(next(node for node in nodes if node['path'] == path))

for node in nodes:
    assert 'Laser{' not in node['path'], node['path']
    if node['type'] == 'file':
        assert b'Laser{' not in content(node), node['path']

pyc = file_at('/home/level15/flag.pyc')
decoded = [base64.b64decode(value) for value in re.findall(rb'[A-Za-z0-9+/]{16,}={0,2}', pyc)]
assert b'Cakgup{wearepython}\n' in decoded
assert not any(b'Laser{' in value for value in decoded)
assert pyc[:4] == b'\x03\xf3\r\n'

elf = file_at('/home/level16/flag')
assert elf[:7] == b'\x7fELF\x01\x01\x01'
assert struct.unpack_from('<H', elf, 18)[0] == 3  # i386
assert struct.unpack_from('<I', elf, 24)[0] == 0x08048000 + 84
assert elf.endswith(b'Cakgup{vitaminc}\n')
assert struct.unpack_from('<I', elf, 52 + 16)[0] == len(elf)

with zipfile.ZipFile(io.BytesIO(file_at('/home/level19/flag.zip'))) as archive:
    assert archive.testzip() is None
    assert archive.read('flag.txt') == b'Cakgup{kulitmanggis}\n'
with tarfile.open(fileobj=io.BytesIO(file_at('/home/level20/flag.tar.xz'))) as archive:
    assert archive.extractfile('flag.txt').read() == b'Cakgup{mastinhadir}\n'

def read_vint(data, offset):
    value = shift = 0
    while True:
        byte = data[offset]; offset += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, offset
        shift += 7

rar = file_at('/home/level21/flag.rar')
assert rar.startswith(b'Rar!\x1a\x07\x01\x00')
offset = 8
found = False
while offset < len(rar):
    checksum = struct.unpack_from('<I', rar, offset)[0]
    size_start = offset + 4
    size, header_start = read_vint(rar, size_start)
    end = header_start + size
    assert zlib.crc32(rar[size_start:end]) == checksum
    kind, cursor = read_vint(rar, header_start)
    flags, cursor = read_vint(rar, cursor)
    if flags & 1:
        _, cursor = read_vint(rar, cursor)
    packed = 0
    if flags & 2:
        packed, cursor = read_vint(rar, cursor)
    if kind == 2:
        file_flags, cursor = read_vint(rar, cursor)
        unpacked, cursor = read_vint(rar, cursor)
        _, cursor = read_vint(rar, cursor)
        if file_flags & 2: cursor += 4
        data_crc = struct.unpack_from('<I', rar, cursor)[0]
        payload = rar[end:end + packed]
        assert payload == b'Cakgup{nexusian}\n'
        assert len(payload) == unpacked and zlib.crc32(payload) == data_crc
        found = True
    offset = end + packed
assert found
assert base64.b64decode(file_at('/home/level23/flag.txt')) == b'Cakgup{reperto}\n'

gpg = shutil.which('gpg') or r'C:\Program Files\Git\usr\bin\gpg.exe'
with tempfile.TemporaryDirectory(prefix='cakgup-artifacts-') as directory:
    artifact = pathlib.Path(directory) / 'flag.txt.gpg'
    artifact.write_bytes(file_at('/home/level29/flag.txt.gpg'))
    # Git's Windows GPG expects paths relative to its MSYS working directory.
    result = subprocess.run([gpg, '--homedir', '.', '--batch', '--pinentry-mode', 'loopback', '--passphrase', '12345678', '--decrypt', artifact.name], cwd=directory, check=True, capture_output=True)
    assert result.stdout == b'Cakgup{kauyangterakhir}\n'
    sevenzip = shutil.which('7z') or r'C:\Program Files\7-Zip\7z.exe'
    if pathlib.Path(sevenzip).exists() or shutil.which(sevenzip):
        artifact = pathlib.Path(directory) / 'flag.rar'
        artifact.write_bytes(rar)
        checked = subprocess.run([sevenzip, 'x', '-so', str(artifact)], check=True, capture_output=True)
        assert checked.stdout == b'Cakgup{nexusian}\n'
print('PASS: Cakgup flags in all shipped files, Python bytecode, i386 ELF, ZIP, TAR/XZ, RAR5, Base64 and decrypted GPG.')
