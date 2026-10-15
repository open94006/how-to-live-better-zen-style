# 把「辰宇落雁體」縮成首頁意境語句用到的字，輸出 woff2。
# 依 OFL-1.1，修改過的版本不能沿用保留名稱「辰宇落雁」，所以子集改名為 HLTB Mood。
# 用法：python3 tools/subset_font.py <ChenYuluoyan-2.0-Thin.ttf>（需要 fonttools、brotli）
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

chars = open('data/mood-chars.txt', encoding='utf-8').read().strip() + '，。、——「」？ '
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['*']
font = TTFont(sys.argv[1])
sub = subset.Subsetter(opts)
sub.populate(text=chars)
sub.subset(font)
for rec in font['name'].names:
    if rec.nameID in (1, 3, 4, 6, 16, 17, 21, 22):
        rec.string = {1: 'HLTB Mood', 3: 'HLTB Mood Thin', 4: 'HLTB Mood Thin', 6: 'HLTBMood-Thin', 16: 'HLTB Mood', 17: 'Thin', 21: 'HLTB Mood', 22: 'Thin'}[rec.nameID]
font.save('site/assets/fonts/mood.woff2')
print('glyphs:', len(font.getGlyphOrder()))
