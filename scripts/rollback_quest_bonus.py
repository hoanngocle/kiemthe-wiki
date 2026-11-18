"""Restore only this reward patch; refuse to overwrite subsequent edits."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from apply_quest_bonus import ROOT, ADMIN, BACKUP

manifest = json.loads((BACKUP / 'manifest.json').read_text('utf-8'))
staged = []
for relative, hashes in manifest['files'].items():
    file = ROOT / relative
    assert hashlib.sha256(file.read_bytes()).hexdigest() == hashes['after'], f'Subsequent edit detected: {file}'
    original = (BACKUP / 'originals' / relative).read_bytes()
    assert hashlib.sha256(original).hexdigest() == hashes['before']
    staged.append((file, original))
for file, original in staged:
    file.write_bytes(original)
subprocess.run([sys.executable, str(ADMIN / 'scripts/export-quest-wiki.py')], check=True, cwd=ADMIN)
print('Restored quest XML and package priority. Patch PACK remains on disk but inactive. Restart game processes to reload.')
