import os
from PIL import Image
this_dir_path = os.path.dirname(os.path.realpath(__file__))

ausbmp = Image.open(os.path.join(this_dir_path, "ausinv.bmp"))

# The Mullard SAA5050 graphics characters are a 6-bit code arranged in a 2x3 grid:
# 0 1
# 2 3
# 4 5
# In the CALFAX, I've put these at offset 0x7F onwards.

# This image is (22 x 3) h x (40 x 2) w, so  80w x 66h. It's a 1-bit bitmap but PIL reports it as 8-bit even though
# the values reported are 0 and 1.

# Firstly, get the image as an array of pixels
pixels = ausbmp.load()
bit_map = []

blocks_as_bytes = []

# Now, get each 2x3 block
r = c = 0
for y in range(0, 66, 3):
    row1 = ""
    row2 = ""
    row3 = ""
    c = 0
    for x in range(0, 80, 2):
        # Get the 6 bits
        b0 = pixels[x, y]
        b1 = pixels[x+1, y]
        b2 = pixels[x, y+1]
        b3 = pixels[x+1, y+1]
        b4 = pixels[x, y+2]
        b5 = pixels[x+1, y+2]

        # Convert to 1 or 0; 1 for black 0 for white
        if type(b0) is tuple:
            bits = [1 if b != (255, 255, 255) else 0 for b in [b0, b1, b2, b3, b4, b5]]
        else:
            bits = [b0, b1, b2, b3, b4, b5]

        # Convert to a byte
        b = bits[0] | (bits[1] << 1) | (bits[2] << 2) | (bits[3] << 3) | (bits[4] << 4) | (bits[5] << 5)
        blocks_as_bytes.append(b)

        # if (r == 9 and c == 19):
        #     breakpoint()

        # Add to row
        row1 += ("*" if bits[0] else " ") + ("*" if bits[1] else " ") + "|"
        row2 += ("*" if bits[2] else " ") + ("*" if bits[3] else " ") + "|"
        row3 += ("*" if bits[4] else " ") + ("*" if bits[5] else " ") + "|"
        c += 1
    print(row1)
    print(row2)
    print(row3)
    print()
    r += 1

# Now compile each byte into a calfax code
# 0XXXXXXX YYYYYYYI DDBBBFFF CCCCCCCC
# X position
# Y position
# I = 1 if inverse
# D =/= 00 if double height
# B = background colour
# F = foreground colour
# C = character code

fg = 3
bg = 0
inverse = 0

blocks_as_cfx = []

for row in range(22):
    for col in range(40):
        b = blocks_as_bytes[row*40 + col] + 0x7F
        cfx = b | (fg << 8) | (bg << 11) | (inverse << 16) | col << 17 | row << 24
        blocks_as_cfx.append(cfx)

# Blank blocks are 1824
filtered_blocks_as_cfx = [block for block in blocks_as_cfx if (block & 0xFF) != 0x7F]

# Convert array of uint32 to bytearray
# First, convert each uint32 to 4 bytes
bytearr_blocks = []
for block in filtered_blocks_as_cfx:
    bytearr_blocks.append(block & 0xff)
    bytearr_blocks.append((block >> 8) & 0xff)
    bytearr_blocks.append((block >> 16) & 0xff)
    bytearr_blocks.append((block >> 24) & 0xff)

bytearr_blocks = bytearray(bytearr_blocks)
#print(bytearr_blocks)

# Convert each byte to a string
# bytearr_blocks_as_str = "".join([chr(b) for b in bytearr_blocks])

# Convert to b64
import base64
b64_blocks = base64.b64encode(bytearr_blocks)

print("PE," + str(b64_blocks)[2:-1])