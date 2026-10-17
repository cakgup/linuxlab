"""Rebrand challenge payloads, including valid binary/archive containers."""
import base64
import io
import os
import pathlib
import shutil
import struct
import subprocess
import tarfile
import zipfile
import zlib

OLD, NEW = b'Laser{', b'Cakgup{'

def vint(value):
    result = bytearray()
    while value >= 128:
        result.append((value & 127) | 128)
        value >>= 7
    result.append(value)
    return bytes(result)

def rar_block(header):
    data = vint(len(header)) + header
    return struct.pack('<I', zlib.crc32(data)) + data

def make_rar(payload):
    # Stored RAR5, following https://www.rarlab.com/technote.htm.
    name = b'flag.txt'
    header = (vint(2) + vint(2) + vint(len(payload)) + vint(4) +
              vint(len(payload)) + vint(0o644) + struct.pack('<I', zlib.crc32(payload)) +
              vint(0) + vint(1) + vint(len(name)) + name)
    return b'Rar!\x1a\x07\x01\x00' + rar_block(b'\x01\x00\x00') + rar_block(header) + payload + rar_block(b'\x05\x04\x00')

def make_elf(payload):
    # Equivalent Linux i386 flag printer: write(1, message, len); exit(0).
    base, offset = 0x08048000, 52 + 32
    code_size = 31
    code = (b'\xb8\x04\x00\x00\x00\xbb\x01\x00\x00\x00\xb9' +
            struct.pack('<I', base + offset + code_size) + b'\xba' +
            struct.pack('<I', len(payload)) + b'\xcd\x80\xb8\x01\x00\x00\x00\x31\xdb\xcd\x80')
    assert len(code) == code_size
    total = offset + len(code) + len(payload)
    header = b'\x7fELF\x01\x01\x01' + b'\x00' * 9 + struct.pack('<HHIIIIIHHHHHH', 2, 3, 1, base + offset, 52, 0, 0, 52, 32, 1, 0, 0, 0)
    program = struct.pack('<IIIIIIII', 1, 0, base, base, total, total, 5, 4096)
    return header + program + code + payload

def rebrand(path, content, root):
    if path.endswith('flag.zip'):
        output = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(content)) as source, zipfile.ZipFile(output, 'w') as target:
            for info in source.infolist():
                target.writestr(info, source.read(info).replace(OLD, NEW))
        return output.getvalue()
    if path.endswith('flag.tar.xz'):
        output = io.BytesIO()
        with tarfile.open(fileobj=io.BytesIO(content), mode='r:xz') as source, tarfile.open(fileobj=output, mode='w:xz') as target:
            for info in source.getmembers():
                data = source.extractfile(info).read().replace(OLD, NEW)
                info.size = len(data)
                target.addfile(info, io.BytesIO(data))
        return output.getvalue()
    if path.endswith('flag.rar'):
        return make_rar(b'Cakgup{nexusian}\n')
    if path.endswith('flag.pyc'):
        old = base64.b64encode(b'Laser{wearepython}\n')
        new = base64.b64encode(b'Cakgup{wearepython}\n')
        before = b's' + struct.pack('<I', len(old)) + old
        after = b's' + struct.pack('<I', len(new)) + new
        assert content.count(before) == 1
        return content.replace(before, after)
    if path == '/home/level16/flag':
        return make_elf(b'Cakgup{vitaminc}\n')
    if path == '/home/level23/flag.txt':
        return base64.b64encode(base64.b64decode(content).replace(OLD, NEW)) + b'\n'
    if path.endswith('flag.txt.gpg'):
        directory = root / 'tmp/rebranded-artifacts'
        directory.mkdir(parents=True, exist_ok=True)
        (root / 'tmp/gpg-audit').mkdir(parents=True, exist_ok=True)
        source, target = directory / 'flag.txt', directory / 'flag.txt.gpg'
        source.write_bytes(b'Cakgup{kauyangterakhir}\n')
        gpg = os.environ.get('GPG_BINARY') or shutil.which('gpg') or r'C:\Program Files\Git\usr\bin\gpg.exe'
        if not target.exists():
            subprocess.run([gpg, '--homedir', 'tmp/gpg-audit', '--batch', '--yes', '--pinentry-mode', 'loopback', '--passphrase', '12345678', '--cipher-algo', 'AES', '--symmetric', '--output', str(target.relative_to(root)), str(source.relative_to(root))], cwd=root, check=True, capture_output=True)
        checked = subprocess.run([gpg, '--homedir', 'tmp/gpg-audit', '--batch', '--pinentry-mode', 'loopback', '--passphrase', '12345678', '--decrypt', str(target.relative_to(root))], cwd=root, check=True, capture_output=True)
        assert checked.stdout == source.read_bytes()
        return target.read_bytes()
    return content.replace(OLD, NEW)
