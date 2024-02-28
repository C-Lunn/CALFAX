# This is a script to generate new graphics characters. Before I realised it was a simple binary code, I used some images and generated bitmaps from those.
# This script modifies the old character set with fresh graphics characters.

# The SAA5050 graphics characters are a 6-bit code arranged in a 2x3 grid:
# 0 1
# 2 3
# 4 5
# In the CALFAX, I've put these at offset 0x7F onwards.
# The SAA5050 uses a 12x20 tile for the characters, and according to Wikipedia, this is arranged in a 6/8/6 formation, i.e.
# the top 6 rows correspond to bits 1 and 2, the next 8 to 2 and 3, and the bottom 6 to 4 and 5.

import json
import numpy as np

old_char_set = json.load(open("character_set_arr.json", "r"))
old_char_set = old_char_set[0:0x7F]

# (Starting X, Starting Y, Height)
offsets = [(0, 0, 6), (6, 0, 6), (0, 6, 8), (6, 6, 8), (0, 14, 6), (6, 14, 6)]

for i in range(0, 64):
    char = np.ones((20, 12), dtype=np.uint8)
    for j in range(6):
        val = (i >> j) & 1 
        if (val == 1):
            arr_of_ones = np.zeros((offsets[j][2], 6), dtype=np.uint8)
            char[offsets[j][1]:offsets[j][1]+offsets[j][2], offsets[j][0]:offsets[j][0]+6] = arr_of_ones
    old_char_set.append(char.flatten().tolist())
    for r in range(20):
        print(" ".join(["*" if b else "-" for b in char[r]]))
    print()

json.dump(old_char_set, open("character_set_arr_new.json", "w"), indent=4)