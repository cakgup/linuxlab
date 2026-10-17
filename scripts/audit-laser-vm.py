"""Read-only challenge snapshot; run with Python 3 on the authorized Laser VM.

Only challenge files are collected. Shell
history, credentials in .ssh/.gnupg, caches and unrelated system data are excluded.
The result is a gzip/base64 JSON envelope on stdout; nothing is written on the VM.
"""
import base64
import gzip
import grp
import hashlib
import json
import os
import platform
import pwd
import stat

nodes = []
total = 0
limit = 32 * 1024 * 1024
file_limit = 4096

def inspect(path, recurse=False):
    global total
    try:
        info = os.lstat(path)
        entry = dict(path=path, mode=stat.S_IMODE(info.st_mode), uid=info.st_uid,
                     gid=info.st_gid, owner=pwd.getpwuid(info.st_uid).pw_name,
                     group=grp.getgrgid(info.st_gid).gr_name, size=info.st_size,
                     mtime=info.st_mtime, type='dir' if stat.S_ISDIR(info.st_mode) else 'file')
        if stat.S_ISLNK(info.st_mode):
            entry['symlink'] = os.readlink(path)
        elif stat.S_ISREG(info.st_mode):
            digest = hashlib.sha256()
            with open(path, 'rb') as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(chunk)
            entry['sha256'] = digest.hexdigest()
            if info.st_size <= file_limit and total + info.st_size <= limit:
                with open(path, 'rb') as stream:
                    content = stream.read(file_limit + 1)
                total += len(content)
                entry['base64'] = base64.b64encode(content).decode('ascii')
                entry['sha256'] = hashlib.sha256(content).hexdigest()
            else:
                entry['omitted'] = 'size limit'
        nodes.append(entry)
        if recurse and stat.S_ISDIR(info.st_mode):
            for name in sorted(os.listdir(path)):
                child = os.path.join(path, name)
                if not name.startswith('.') or name.startswith('.Laser'):
                    inspect(child, True)
    except OSError as error:
        nodes.append(dict(path=path, error=str(error)))

for path in ['/', '/home', '/var', '/var/log', '/root']:
    inspect(path)
for number in range(31):
    inspect('/home/level' + str(number), True)
for path in ['/root/GoldenTiket.txt', '/var/log/flag_level11.txt']:
    inspect(path)
accounts = [dict(name=a.pw_name, uid=a.pw_uid, gid=a.pw_gid, home=a.pw_dir, shell=a.pw_shell)
            for a in pwd.getpwall() if a.pw_name.startswith('level') or a.pw_name in ('root', 'laser')]
payload = json.dumps(dict(uname=list(platform.uname()), nodes=nodes, accounts=accounts,
                          collected_bytes=total), sort_keys=True).encode('utf-8')
encoded = base64.b64encode(gzip.compress(payload)).decode('ascii')
print('LASER_SNAPSHOT_BEGIN')
for index in range(0, len(encoded), 72):
    print(encoded[index:index + 72])
print('LASER_SNAPSHOT_END')
