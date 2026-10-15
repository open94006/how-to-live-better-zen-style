#!/usr/bin/env python3
"""下載 data/image-picks.json 指定的 Openverse 圖片（只收 CC0／公眾領域），縮成兩種寬度。

  python3 -I tools/fetch_images.py [挑圖用的 meta.json ...]

picks 裡 id 留空、q 寫「key#序號」時，會到傳入的 meta.json（scratch 的搜尋結果）找對應 id。
輸出：site/assets/img/<key>-{1800,900}.jpg、data/images.json（作者、授權、原始頁面）。
需要系統 Python 有 Pillow。
"""
import json, os, subprocess, sys
from PIL import Image

PICKS, OUT_JSON, IMG_DIR = 'data/image-picks.json', 'data/images.json', 'site/assets/img'
WIDTHS = (1800, 900)
OK_LICENSES = {'cc0', 'pdm'}


def curl(url, dest=None):
    args = ['curl', '-sfL', '-m', '120', '-A', 'hltb-site/1.0', url]
    if dest:
        subprocess.run(args + ['-o', dest], check=True)
        return None
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout


def main():
    picks = json.load(open(PICKS))
    search = {}
    for path in sys.argv[1:]:
        for key, rows in json.load(open(path)).items():
            search[key] = rows
    done = json.load(open(OUT_JSON)) if os.path.exists(OUT_JSON) else {}
    os.makedirs(IMG_DIR, exist_ok=True)
    for key, pick in picks.items():
        if not pick.get('id'):
            group, idx = pick['q'].split('#')
            pick['id'] = search[group][int(idx)]['id']
        if done.get(key, {}).get('id') == pick['id'] and all(os.path.exists(f'{IMG_DIR}/{key}-{w}.jpg') for w in WIDTHS):
            continue
        meta = json.loads(curl(f'https://api.openverse.org/v1/images/{pick["id"]}/'))
        assert meta['license'] in OK_LICENSES, f'{key}: 授權是 {meta["license"]}，不是 CC0／公眾領域'
        raw = f'{IMG_DIR}/.{key}.raw'
        curl(meta['url'], raw)
        im = Image.open(raw).convert('RGB')
        for w in WIDTHS:
            out = im.copy()
            if out.width > w:
                out = out.resize((w, round(out.height * w / out.width)), Image.LANCZOS)
            out.save(f'{IMG_DIR}/{key}-{w}.jpg', quality=78, optimize=True, progressive=True)
        os.remove(raw)
        done[key] = {
            'id': pick['id'], 'alt': pick['alt'], 'ratio': round(im.width / im.height, 4),
            'title': meta.get('title'), 'creator': meta.get('creator'), 'creator_url': meta.get('creator_url'),
            'license': meta['license'], 'license_url': meta.get('license_url'),
            'source': meta.get('source'), 'landing': meta.get('foreign_landing_url'),
        }
        print('ok', key, meta['license'], meta.get('creator'), f'{im.width}x{im.height}')
    for key in done:
        if key in picks:
            done[key]['alt'] = picks[key]['alt']
            done[key]['pos'] = picks[key].get('pos')  # 裁切時的對焦位置（CSS object-position）
        with Image.open(f'{IMG_DIR}/{key}-{WIDTHS[0]}.jpg') as big:
            done[key]['large_w'] = big.width  # 原圖不到 1800 寬時不放大，srcset 要用真實寬度
    json.dump(picks, open(PICKS, 'w'), ensure_ascii=False, indent=1)
    json.dump(done, open(OUT_JSON, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
