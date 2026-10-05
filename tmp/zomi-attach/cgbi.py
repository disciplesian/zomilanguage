import zlib, struct, sys

def convert_cgbi(inp, outp):
    data = open(inp, 'rb').read()
    pos = 8; idat = b''; ihdr = None
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]; chunk = data[pos+8:pos+8+ln]
        if typ == b'IHDR':
            ihdr = chunk
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'IEND':
            break
        pos += 12 + ln
    w, h, depth, color, comp, filt, inter = struct.unpack('>IIBBBBB', ihdr)
    bpp = 4 if color == 6 else 3
    raw = zlib.decompress(idat)
    stride = w * bpp + 1
    rows = []
    prev = bytearray(w * bpp)
    i = 0
    for y in range(h):
        f = raw[i]; line = bytearray(raw[i+1:i+stride]); i += stride
        for x in range(len(line)):
            a = line[x-bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x-bpp] if x >= bpp else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa = abs(p - a); pb = abs(p - b); pc = abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append(bytes(line)); prev = line
    img = bytearray()
    for line in rows:
        for x in range(0, len(line), bpp):
            r, g, b = line[x+2], line[x+1], line[x]  # BGRA -> RGBA
            a = line[x+3] if bpp == 4 else 255
            if bpp == 4 and 0 < a < 255:
                r = min(255, r * 255 // a)
                g = min(255, g * 255 // a)
                b = min(255, b * 255 // a)
            img += bytes((r, g, b, a))

    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    comp = zlib.compress(bytes(img), 9)
    out += chunk(b'IDAT', comp) + chunk(b'IEND', b'')
    open(outp, 'wb').write(out)
    print(outp, w, h)

if __name__ == '__main__':
    convert_cgbi(sys.argv[1], sys.argv[2])
