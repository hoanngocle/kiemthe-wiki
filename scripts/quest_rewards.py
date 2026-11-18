"""Read literal Lua award tables as data; never evaluate Lua code."""
import re


def parse_lua(source):
    position = 0

    def space():
        nonlocal position
        while position < len(source) and source[position].isspace():
            position += 1

    def value():
        nonlocal position
        space()
        if position >= len(source):
            raise ValueError('Unexpected end of Lua literal')
        char = source[position]
        if char in '\"\'':
            quote = char
            position += 1
            result = ''
            while position < len(source):
                char = source[position]
                position += 1
                if char == quote:
                    return result
                if char == '\\':
                    if position >= len(source):
                        break
                    char = source[position]
                    position += 1
                    char = {'n': '\n', 'r': '\r', 't': '\t'}.get(char, char)
                result += char
            raise ValueError('Unterminated Lua string')
        if char == '{':
            position += 1
            array, fields = [], {}
            space()
            while position < len(source) and source[position] != '}':
                key = re.match(r'([A-Za-z_]\w*)\s*=', source[position:])
                if key:
                    position += key.end()
                    fields[key[1]] = value()
                else:
                    array.append(value())
                space()
                if position < len(source) and source[position] in ',;':
                    position += 1
                    space()
                elif position >= len(source) or source[position] != '}':
                    raise ValueError('Expected separator in Lua table')
            if position >= len(source):
                raise ValueError('Unterminated Lua table')
            position += 1
            if fields and array:
                raise ValueError('Mixed Lua table is unsupported')
            return fields if fields else array
        match = re.match(r'-?\d+(?:\.\d+)?|true\b|false\b|nil\b', source[position:])
        if not match:
            raise ValueError(f'Nonliteral award data near {source[position:position + 50]}')
        position += match.end()
        token = match[0]
        if token in ('true', 'false', 'nil'):
            return {'true': True, 'false': False, 'nil': None}[token]
        return float(token) if '.' in token else int(token)

    result = value()
    space()
    if position != len(source):
        raise ValueError('Trailing executable or unsupported Lua data')
    return result


CONDITIONS = {'IsJin': 'Hệ Kim', 'IsMu': 'Hệ Mộc', 'IsShui': 'Hệ Thủy', 'IsHuo': 'Hệ Hỏa',
              'IsTu': 'Hệ Thổ', 'IsMale': 'Nam', 'IsFemale': 'Nữ',
              'ArmyCampReputeLimit90_100': 'Điều kiện quân doanh (hàm hiện luôn cho nhận)',
              'FuNiuShanExtAreaTaskNum': 'Giới hạn lượt Phục Ngưu Sơn'}
FACTIONS = {'ShaoLin': 'Thiếu Lâm', 'TianWang': 'Thiên Vương', 'TangMen': 'Đường Môn',
            'WuDu': 'Ngũ Độc', 'EMei': 'Nga Mi', 'CuiYan': 'Thúy Yên', 'GaiBang': 'Cái Bang',
            'TianRen': 'Thiên Nhẫn', 'WuDang': 'Võ Đang', 'KunLun': 'Côn Lôn', 'MingJiao': 'Minh Giáo', 'DuanShi': 'Đoàn Thị'}


def describe_reward(award, items, reputes):
    kind, val = award['szType'], award.get('varValue')
    conditions = []
    for i in range(1, 4):
        condition = award.get(f'szCondition{i}', '').replace('TaskAwardCond:', '')
        if condition and condition != 'None':
            conditions.append(CONDITIONS.get(condition, FACTIONS.get(condition, condition)))
    result = {'kind': kind, 'label': kind, 'amount': None, 'itemId': '', 'conditions': conditions,
              'note': '', 'rawType': kind, 'description': award.get('szDesc', '')}
    if kind == 'genieaward':
        kind = {1: 'KinReputeEntry', 2: 'bindmoney', 3: 'activemoney', 4: 'bindcoin'}.get(val[0], 'unknown')
        val = val[1] if kind in ('bindmoney', 'activemoney') else val[1:]
        result['kind'] = kind
    labels = {'money': 'Bạc khóa', 'bindmoney': 'Bạc khóa', 'activemoney': 'Bạc', 'bindcoin': 'Đồng khóa',
              'coin': 'Đồng', 'makepoint': 'Tinh lực', 'gatherpoint': 'Hoạt lực', 'exp': 'Kinh nghiệm',
              'KinReputeEntry': 'Uy danh giang hồ'}
    if kind in labels:
        result.update(label=labels[kind], amount=val[0] if isinstance(val, list) else val)
    elif kind in ('item', 'customizeitem'):
        item_id = ','.join(str(n) for n in val[:4])
        result.update(label=items.get(item_id, 'Vật phẩm chưa có tên trong bảng cấu hình'), itemId=item_id,
                      amount=max(1, int(award.get('szAddParam1', 1) or 1)) if kind == 'item' else 1)
        result['note'] = f'Tham số trang bị: hệ={val[4] if len(val) > 4 else 0}, may mắn={val[5] if len(val) > 5 else 0}'
    elif kind == 'repute':
        result.update(label='Danh vọng ' + reputes.get((str(val[0]), str(val[1])), f'{val[0]}/{val[1]}'), amount=val[2])
    elif kind == 'taskvalue':
        result.update(label='Độ bền cơ quan' if val[:2] == [2025, 2] else f'Biến nhiệm vụ {val[0]}/{val[1]}', amount=val[2])
    elif kind == 'title':
        result.update(label='Danh hiệu', note='ID ' + ','.join(map(str, val)))
    elif kind == 'script':
        match = re.fullmatch(r'Task:Award_([123])\((\d+)\)', val)
        if match:
            which, amount = match[1], int(match[2])
            result.update(label={'1': 'Bạc', '2': 'Uy danh giang hồ', '3': 'Ngũ Hành Hồn Thạch khóa'}[which], amount=amount)
            result['kind'] = {'1': 'activemoney', '2': 'KinReputeEntry', '3': 'item'}[which]
            result['note'] = 'Tối đa 4 lần/tuần' if which in ('1', '2') else ''
            if which == '3':
                result['itemId'] = '18,1,205,1'
        else:
            result.update(label='Thưởng qua script', note=val)
    else:
        result.update(label=award.get('szDesc') or kind, note=str(val))
    return result


def expand_bonus_reward(award, items):
    bonus = award['tbQuestBonus']
    results = []
    for key, kind, label in [('coin', 'coin', 'Đồng thường'), ('silver', 'bindmoney', 'Bạc khóa'),
                             ('make', 'makepoint', 'Tinh lực'), ('gather', 'gatherpoint', 'Hoạt lực'),
                             ('repute', 'repute', 'Danh vọng ngẫu nhiên (1 trong 7 loại)')]:
        if bonus.get(key, 0):
            results.append({'kind': kind, 'label': label, 'amount': bonus[key], 'itemId': '',
                            'conditions': [], 'note': '', 'description': '', 'rawType': 'script',
                            'group': 'bonus', 'step': None, 'rate': None})
    for item_id, amount, name in [(f'18,1,114,{bonus["crystal"]}', bonus.get('crystalCount', 0), f'Huyền Tinh cấp {bonus["crystal"]} khóa'),
                                  ('18,1,3071,1', bonus.get('spirit', 0), 'Linh Khí khóa')]:
        if amount:
            results.append({'kind': 'item', 'label': name, 'amount': amount, 'itemId': item_id,
                            'conditions': [], 'note': 'Khóa', 'description': '', 'rawType': 'script',
                            'group': 'bonus', 'step': None, 'rate': None})
    return results
