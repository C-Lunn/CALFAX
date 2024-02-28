# Open ../character_set_arr_new.json
# Read in the file
import json
from PIL import Image
import numpy as np


cs = []
with open('../character_set_arr_new.json', 'r') as file :
    filedata = file.read()
    cs = json.loads(filedata)

for img in ["up.bmp", "down.bmp", "left.bmp", "right.bmp"]:
    i = Image.open(img)
    pixels = i.load()
    pixels = np.array(i)
    # print(pixels)
    bit_map = []
    for row in pixels:
        for pixel in row:
            bit_map.append(1 if pixel else 0)
    # print(bit_map)
    cs.append(bit_map)

with open('../character_set_arr_new.json', 'w') as file:
    file.write(json.dumps(cs))