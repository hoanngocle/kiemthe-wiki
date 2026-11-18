"""Read-only Lua 5.1 chunk inspection for the upgrade wiki audit.

Run from repository root:
  python Sever/admin/docs/decode-tayhaothien-bytecode.py > evidence.json

This does not execute the game script. It decodes its header, constants,
function metadata and instructions using only Python's standard library.
Instruction numbers are one-based; original_line_start/end come from the
chunk's function metadata, not physical lines in the binary file.
"""
import hashlib
import json
from pathlib import Path
import struct
import sys

WORKSPACE = Path(__file__).resolve().parents[3]
SOURCE = WORKSPACE / "Sever/gameserver/script/tranphai/haothien/tayhaothien.lua"
if not SOURCE.read_bytes().startswith(b"\x1bLua"):
    SOURCE = WORKSPACE / ".diagnostics/upgrade-fixes/backups/Sever/gameserver/script/tranphai/haothien/tayhaothien.lua"
data = SOURCE.read_bytes()
assert data[:12] == b"\x1bLua\x51\x00\x01\x04\x04\x04\x08\x00", "Unexpected chunk layout"
offset = 12
OPCODES = ("MOVE LOADK LOADBOOL LOADNIL GETUPVAL GETGLOBAL GETTABLE SETGLOBAL "
           "SETUPVAL SETTABLE NEWTABLE SELF ADD SUB MUL DIV MOD POW UNM NOT LEN "
           "CONCAT JMP EQ LT LE TEST TESTSET CALL TAILCALL RETURN FORLOOP FORPREP "
           "TFORLOOP SETLIST CLOSE CLOSURE VARARG").split()


def uint():
    global offset
    value = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    return value


def string():
    global offset
    length = uint()
    value = data[offset:offset + length - 1].decode("utf-8", "replace") if length else ""
    offset += length
    return value


def function():
    global offset
    source_name = string()
    start, end = uint(), uint()
    attributes = list(data[offset:offset + 4])
    offset += 4
    instructions = [uint() for _ in range(uint())]
    constants = []
    for _ in range(uint()):
        tag = data[offset]
        offset += 1
        if tag == 0:
            constants.append(None)
        elif tag == 1:
            constants.append(bool(data[offset]))
            offset += 1
        elif tag == 3:
            constants.append(struct.unpack_from("<d", data, offset)[0])
            offset += 8
        elif tag == 4:
            constants.append(string())
        else:
            raise ValueError(f"Unknown constant tag {tag}")
    children = [function() for _ in range(uint())]
    line_info = [uint() for _ in range(uint())]
    locals_info = [(string(), uint(), uint()) for _ in range(uint())]
    upvalues = [string() for _ in range(uint())]

    def rk(value):
        return {"constant_index": value - 256, "value": constants[value - 256]} if value >= 256 else {"register": value}

    decoded = []
    for pc, instruction in enumerate(instructions, 1):
        op = instruction & 63
        a, b, c = (instruction >> 6) & 255, (instruction >> 23) & 511, (instruction >> 14) & 511
        bx = instruction >> 14
        row = {"pc": pc, "op": OPCODES[op], "A": a, "B": b, "C": c}
        if op in (1, 5, 7):
            row.update(constant_index=bx, constant_value=constants[bx])
        if op in (6, 9, 11, 12, 13, 14, 15, 16, 17, 23, 24, 25):
            row.update(B_operand=rk(b), C_operand=rk(c))
        if op in (22, 31, 32):
            row.update(sBx=bx - 131071, jump_target_pc=pc + 1 + bx - 131071)
        decoded.append(row)
    return {"source_name": source_name, "original_line_start": start, "original_line_end": end,
            "attributes": attributes, "constants": constants, "instructions": decoded,
            "children": children, "line_info": line_info, "locals": locals_info, "upvalues": upvalues}


chunk = function()
assert offset == len(data), (offset, len(data))
sys.stdout.reconfigure(encoding="utf-8")
print(json.dumps({"source": SOURCE.relative_to(WORKSPACE).as_posix(), "historical_pre_fix_evidence": True, "bytes": len(data),
                  "sha256": hashlib.sha256(data).hexdigest(), "method": "static decode; no execution",
                  "chunk": chunk}, ensure_ascii=False, indent=2))
