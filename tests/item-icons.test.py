import importlib.util
import struct
import unittest
from pathlib import Path

script = Path(__file__).resolve().parents[1] / 'scripts/export-item-icons.py'
spec = importlib.util.spec_from_file_location('item_icons', script)
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

class SpriteTests(unittest.TestCase):
    def test_palette_transparent_and_partial_alpha_runs(self):
        header = bytearray(32)
        header[:4] = b'SPR\0'
        struct.pack_into('<6H', header, 4, 3, 1, 0, 0, 1, 2)
        frame = struct.pack('<4H', 3, 1, 0, 0) + bytes([1, 0, 1, 255, 0, 1, 128, 1])
        data = header + bytes([255, 0, 0, 0, 255, 0]) + struct.pack('<2I', 0, len(frame)) + frame
        width, height, rgba = icons.decode_spr(data)
        self.assertEqual((width, height), (3, 1))
        self.assertEqual(rgba, bytes([0, 0, 0, 0, 255, 0, 0, 255, 0, 255, 0, 128]))

    def test_corrupt_sprites_are_rejected(self):
        for data in [b'', b'SPR\0' + bytes(28), b'not a sprite']:
            with self.assertRaises(ValueError): icons.decode_spr(data)

    def test_filename_hash_matches_existing_pack_lookup(self):
        self.assertEqual(icons.filename_hash(r'\image\item\other\scriptitem\xuanjing_001_s.spr'), 0xd66a7b9f)
        self.assertEqual(icons.filename_hash('/IMAGE/item/other/scriptitem/xuanjing_001_s.spr'), 0xd66a7b9f)

if __name__ == '__main__': unittest.main()
