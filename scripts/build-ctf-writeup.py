"""Build the gated write-up from the learning Markdown; no access code is stored."""
from pathlib import Path
import base64
import getpass
import json
import os
import re

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = Path(__file__).resolve().parents[1]


def table_cells(line):
    """Keep pipes inside code spans and escaped pipes inside their table cell."""
    cells, current, code = [], [], False
    row = line.strip().strip('|')
    index = 0
    while index < len(row):
        character = row[index]
        if character == '\\' and index + 1 < len(row) and row[index + 1] == '|':
            current.append('|')
            index += 2
            continue
        if character == '`':
            code = not code
            current.append(character)
        elif character == '|' and not code:
            cells.append(''.join(current).strip())
            current = []
        else:
            current.append(character)
        index += 1
    return cells + [''.join(current).strip()]


def blocks(markdown):
    lines = markdown.strip().splitlines()
    result, index = [], 0
    while index < len(lines):
        line = lines[index].strip()
        if not line or line == '---':
            index += 1
            continue
        if line.startswith('```'):
            language, content = line[3:].strip(), []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith('```'):
                content.append(lines[index])
                index += 1
            if index == len(lines):
                raise ValueError('Unclosed code fence')
            result.append(dict(kind='code', language=language, text='\n'.join(content)))
            index += 1
            continue
        if line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                row = table_cells(lines[index])
                if not all(re.fullmatch(r':?-+:?', cell) for cell in row):
                    rows.append(row)
                index += 1
            if rows:
                assert all(len(row) == len(rows[0]) for row in rows), rows
                result.append(dict(kind='table', headers=rows[0], rows=rows[1:]))
            continue
        step = re.fullmatch(r'\*\*(\d+)\s*[—–-]\s*(.*?)\*\*', line)
        if step:
            result.append(dict(kind='step', number=step[1], text=step[2].rstrip('.')))
            index += 1
            continue
        heading = re.match(r'^#{2,4}\s+(.*)', line)
        if heading:
            result.append(dict(kind='heading', text=heading[1]))
            index += 1
            continue
        ordered = bool(re.match(r'^\d+\.\s', line))
        if line.startswith('- ') or ordered:
            items = []
            pattern = r'^\d+\.\s+' if ordered else r'^-\s+'
            while index < len(lines) and re.match(pattern, lines[index].strip()):
                items.append(re.sub(pattern, '', lines[index].strip()))
                index += 1
            result.append(dict(kind='list', ordered=ordered, items=items))
            continue
        if line.startswith('>'):
            text = []
            while index < len(lines) and lines[index].strip().startswith('>'):
                text.append(re.sub(r'^>\s?', '', lines[index].strip()))
                index += 1
            result.append(dict(kind='note', text=' '.join(text)))
            continue
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip():
            candidate = lines[index].strip()
            if re.match(r'^(#{2,4}\s|```|\||-\s|>|\d+\.\s|\*\*\d+\s*[—–-])', candidate):
                break
            paragraph.append(candidate)
            index += 1
        result.append(dict(kind='paragraph', text=' '.join(paragraph)))
    return result


def sections(markdown):
    """Split on section headings outside fenced code, preserving their block order."""
    groups, title, content, fenced = [], 'Pembahasan', [], False
    for line in markdown.strip().splitlines():
        if line.strip().startswith('```'):
            fenced = not fenced
        match = re.match(r'^## ([A-Z])\. (.*)', line) if not fenced else None
        if match:
            if content:
                groups.append(dict(title=title, blocks=blocks('\n'.join(content))))
            title, content = match[2], []
        else:
            content.append(line)
    if content:
        groups.append(dict(title=title, blocks=blocks('\n'.join(content))))
    return groups


def main():
    source = (ROOT / 'docs/CTF-WRITEUP-PEMBELAJAR.md').read_text(encoding='utf-8-sig')
    path = ROOT / 'public/ctf/write-up.enc.json'
    old = json.loads(path.read_text())
    access_code = os.environ.get('CTF_WRITEUP_CODE') or getpass.getpass('Kode akses write-up: ')
    derive = lambda salt: PBKDF2HMAC(algorithm=hashes.SHA256(), length=32,
                                    salt=salt, iterations=210000).derive(access_code.encode())
    previous_key = derive(base64.b64decode(old['salt']))
    previous = json.loads(AESGCM(previous_key).decrypt(base64.b64decode(old['iv']),
                          base64.b64decode(old['ciphertext']), None))
    matches = list(re.finditer(r'^# PRAKTIKUM STAGE ([1-9]) — (.*)$', source, re.M))
    assert [int(match[1]) for match in matches] == list(range(1, 10))
    appendix_a = source.index('# LAMPIRAN A —')
    appendix_b = source.index('# LAMPIRAN B —')
    appendix_end = source.index('# 3. Ringkasan hasil Stage')
    appendices = {
        8: dict(title='Skrip lengkap Stage 8 dan penjelasannya',
                blocks=blocks(source[appendix_a:appendix_b].split('\n', 1)[1])),
        9: dict(title='Skrip lengkap Stage 9 dan penjelasannya',
                blocks=blocks(source[appendix_b:appendix_end].split('\n', 1)[1])),
    }
    stages = previous['stages']
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else appendix_a
        stage = stages[index]
        assert stage['number'] == index + 1
        stage['sections'] = sections(source[match.end():end])
        if stage['number'] in appendices:
            stage['advanced'] = appendices[stage['number']]
        assert stage['sections']
    content = dict(stages=stages)
    salt, iv = os.urandom(16), os.urandom(12)
    encrypted = AESGCM(derive(salt)).encrypt(iv, json.dumps(content, ensure_ascii=False).encode(), None)
    b64 = lambda value: base64.b64encode(value).decode()
    envelope = dict(version=1, iterations=210000, salt=b64(salt), iv=b64(iv), ciphertext=b64(encrypted))
    assert json.loads(AESGCM(derive(salt)).decrypt(iv, encrypted, None)) == content
    path.write_text(json.dumps(envelope, indent=2) + '\n')
    print('Updated 9 gated stages from Markdown; tables, steps, code, and 2 appendices verified.')


if __name__ == '__main__':
    main()
