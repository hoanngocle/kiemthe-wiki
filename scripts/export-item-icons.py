"""Export first-frame Wiki icons from this client's SPR/PACK files. No game code runs.

Usage: python scripts/export-item-icons.py [--skills] (paths resolve from this script).
PACK hash/NRV2B verified against the workspace's qi-heart-check/read_pak.py.
"""
import argparse
import csv
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET
import zlib
from collections import Counter
from pathlib import Path

ADMIN = Path(__file__).resolve().parents[1]
ROOT = ADMIN.parents[1]

def filename_hash(name):
    value = 0
    for i, char in enumerate(name.lower().replace('/', '\\').encode('gb18030')):
        value = ((((i + 1) * char + value) & 0xffffffff) % 0x8000000b * -17) & 0xffffffff
    return value ^ 0x12345678

def nrv2b(data, size):
    pos, bits, last = 0, 0, 1
    out = bytearray()
    def byte():
        nonlocal pos
        if pos >= len(data): raise ValueError('Truncated NRV2B')
        result = data[pos]
        pos += 1
        return result
    def bit():
        nonlocal bits
        bits = bits * 2 if bits & 0x7f else byte() * 2 + 1
        return (bits >> 8) & 1
    while True:
        while bit():
            out.append(byte())
            if len(out) > size: raise ValueError('NRV2B output overflow')
        offset = 1
        while True:
            offset = offset * 2 + bit()
            if bit(): break
            if offset > 0x1000002: raise ValueError('Invalid NRV2B offset')
        if offset == 2: offset = last
        else:
            offset = (offset - 3) * 256 + byte()
            if offset == 0xffffffff: break
            offset += 1
            last = offset
        length = bit() * 2 + bit()
        if length == 0:
            length = 1
            while True:
                length = length * 2 + bit()
                if length > size: raise ValueError('Invalid NRV2B length')
                if bit(): break
            length += 2
        length += offset > 0xd00
        if not 0 < offset <= len(out) or len(out) + length + 1 > size:
            raise ValueError('Invalid NRV2B back reference')
        for _ in range(length + 1): out.append(out[-offset])
    if len(out) != size: raise ValueError('NRV2B size mismatch')
    return bytes(out)

def decode_spr(data):
    if len(data) < 32 or data[:4] != b'SPR\0': raise ValueError('Invalid SPR header')
    frames, colors = struct.unpack_from('<2H', data, 12)
    if not 0 < colors <= 256 or not 0 < frames <= 4096: raise ValueError('Invalid SPR counts')
    table = 32 + colors * 3
    if table + frames * 8 > len(data): raise ValueError('Truncated SPR table')
    offset, length = struct.unpack_from('<2I', data, table)
    start = table + frames * 8 + offset
    end = start + length
    if length < 8 or end > len(data): raise ValueError('Truncated SPR frame')
    width, height, _, _ = struct.unpack_from('<4H', data, start)
    if not 0 < width <= 2048 or not 0 < height <= 2048: raise ValueError('Invalid SPR dimensions')
    rgba = bytearray(width * height * 4)
    cursor, pixel = start + 8, 0
    while cursor < end and pixel < width * height:
        if cursor + 2 > end: raise ValueError('Truncated SPR run')
        count, alpha = data[cursor:cursor + 2]
        cursor += 2
        if count == 0 or pixel + count > width * height: raise ValueError('Invalid SPR run')
        if alpha:
            if cursor + count > end: raise ValueError('Truncated SPR pixels')
            for index in data[cursor:cursor + count]:
                if index >= colors: raise ValueError('Invalid SPR palette index')
                rgba[pixel * 4:pixel * 4 + 4] = data[32 + index * 3:35 + index * 3] + bytes([alpha])
                pixel += 1
            cursor += count
        else: pixel += count
    if pixel != width * height: raise ValueError('Incomplete SPR image')
    return width, height, bytes(rgba)

def png_bytes(width, height, rgba):
    def chunk(tag, payload):
        return struct.pack('>I', len(payload)) + tag + payload + struct.pack('>I', zlib.crc32(tag + payload) & 0xffffffff)
    scanlines = b''.join(b'\0' + rgba[y * width * 4:(y + 1) * width * 4] for y in range(height))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(scanlines)) + chunk(b'IEND', b'')

def read_text(file):
    data = file.read_bytes()
    try: return data.decode('utf-8-sig')
    except UnicodeDecodeError: return data.decode('gb18030', errors='replace')

def item_icon_paths():
    paths = set()
    for file in (ROOT / 'Sever/gameserver/setting/item').rglob('*.txt'):
        rows = csv.DictReader(read_text(file).splitlines(), delimiter='\t')
        if not rows.fieldnames or not {'Name', 'Icon', 'Genre', 'DetailType', 'ParticularType', 'Level'} <= set(rows.fieldnames): continue
        for row in rows:
            if not row.get('Name') or not all(re.fullmatch(r'\d+', (row.get(k) or '').strip()) for k in ['Genre', 'DetailType', 'ParticularType', 'Level']): continue
            icon = (row.get('Icon') or '').strip().replace('/', '\\').lower()
            if icon: paths.add(icon)
    return sorted(paths)

def faction_icon_paths():
    setting = ADMIN.parent / 'gameserver/setting'
    factions = ET.parse(setting / 'faction/faction.xml')
    skill_ids = {int(skill.attrib['id']) for skill in factions.findall('faction/route/skill')}
    books = csv.DictReader(read_text(setting / 'item/001/equip/general/book.txt').splitlines(), delimiter='\t')
    for book in books:
        if (book['Genre'], book['DetailType'], book['ClassName']) != ('1', '14', 'book'):
            continue
        level = int(book['Level'])
        particular = int(book['ParticularType'])
        if (1 <= level <= 4 and 1 <= particular <= 24) or (level == 4 and 145 <= particular <= 168):
            skill_ids.update(int(book[f'SkillID{slot}'] or '0') for slot in range(1, 5))
    skills = csv.DictReader(read_text(setting / 'fightskill/skill.txt').splitlines(), delimiter='\t')
    paths = {row['SkillIcon'].strip().replace('/', '\\').lower() for row in skills
             if (row['SkillId'] or '').isdigit() and int(row['SkillId']) in skill_ids and row['SkillIcon']}
    return sorted(paths)


def export(paths, directory):
    client = ROOT / 'Client'
    output = ADMIN / 'public' / directory
    output.mkdir(parents=True, exist_ok=True)
    wanted = {filename_hash(candidate) for name in paths for candidate in (name, '\\' + name.lstrip('\\'))}
    locations = {}
    # Package precedence follows the client's configured search order.
    packages = re.findall(r'^\d+=(.+\.pak)\s*$', read_text(client / 'package.ini'), re.M)
    for name in dict.fromkeys(n.strip() for n in packages):
        pak = client / 'pak' / name
        if not pak.is_file(): continue
        with pak.open('rb') as stream:
            header = stream.read(32)
            if len(header) != 32 or header[:4] != b'PACK': continue
            count, index = struct.unpack_from('<2I', header, 4)
            stream.seek(index)
            for fileid, offset, size, packed in struct.iter_unpack('<4I', stream.read(count * 16)):
                if fileid in wanted: locations.setdefault(fileid, []).append((pak, offset, size, packed))
    available, missing, methods = {}, {}, Counter()
    for name in paths:
        loose = client / name.lstrip('\\').replace('\\', '/')
        candidates = [(None, 0, 0, 0)] if loose.is_file() else locations.get(filename_hash(name), [])
        if not candidates: candidates = locations.get(filename_hash('\\' + name.lstrip('\\')), [])
        reason = 'Không tìm thấy tài nguyên trong Client'
        for pak, offset, size, packed in candidates:
            try:
                if pak is None: data = loose.read_bytes()
                else:
                    method, length = packed >> 24, packed & 0xffffff
                    methods[f'{method:02x}'] += 1
                    with pak.open('rb') as stream:
                        stream.seek(offset)
                        data = stream.read(length)
                    if method == 0x20: data = nrv2b(data, size)
                    elif method != 0: raise ValueError(f'Unsupported PACK method {method:02x}')
                width, height, rgba = decode_spr(data)
                filename = hashlib.sha1(name.encode('utf-8')).hexdigest()[:20] + '.png'
                (output / filename).write_bytes(png_bytes(width, height, rgba))
                available[name] = f'/{directory}/{filename}'
                break
            except (ValueError, IndexError, struct.error) as error: reason = str(error)
        if name not in available: missing[name] = reason
    manifest = {'icons': available, 'missing': missing, 'total': len(paths), 'exported': len(available), 'methods': dict(methods)}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'total': len(paths), 'exported': len(available), 'missing': len(missing), 'methods': dict(methods)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skills', action='store_true', help='Export faction skill icons instead of item icons')
    if parser.parse_args().skills:
        export(faction_icon_paths(), 'skill-icons')
    else:
        export(item_icon_paths(), 'item-icons')
