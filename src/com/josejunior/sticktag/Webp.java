package com.josejunior.sticktag;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

/** Leitura e escrita de ficheiros WebP: dimensões, animação e metadados EXIF dos stickers do WhatsApp. */
public final class Webp {
    private Webp() {}

    static final Charset UTF8 = Charset.forName("UTF-8");

    public static final class Chunk {
        public final String id; public final int off; public final int len;
        Chunk(String id, int off, int len) { this.id = id; this.off = off; this.len = len; }
    }

    public static final class Info {
        public int width, height, frames = 1, totalMs = 0, minFrameMs = Integer.MAX_VALUE;
        public boolean animated, alpha;
    }

    public static boolean isWebp(byte[] b) {
        return b != null && b.length > 16 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
    }

    static int le24(byte[] b, int o) { return (b[o] & 0xff) | ((b[o + 1] & 0xff) << 8) | ((b[o + 2] & 0xff) << 16); }
    static int le32(byte[] b, int o) { return le24(b, o) | ((b[o + 3] & 0xff) << 24); }

    public static List<Chunk> chunks(byte[] b) {
        List<Chunk> list = new ArrayList<Chunk>();
        int p = 12;
        int end = Math.min(b.length, 8 + le32(b, 4));
        while (p + 8 <= end) {
            String id = new String(b, p, 4, Charset.forName("US-ASCII"));
            int len = le32(b, p + 4);
            if (len < 0 || p + 8 + len > b.length) break;
            list.add(new Chunk(id, p + 8, len));
            p += 8 + len + (len & 1);
        }
        return list;
    }

    public static Info info(byte[] b) {
        if (!isWebp(b)) return null;
        Info in = new Info();
        boolean gotSize = false;
        int anmf = 0;
        for (Chunk c : chunks(b)) {
            if (c.id.equals("VP8X") && c.len >= 10) {
                int flags = b[c.off] & 0xff;
                in.animated = (flags & 0x02) != 0;
                in.alpha = (flags & 0x10) != 0;
                in.width = le24(b, c.off + 4) + 1;
                in.height = le24(b, c.off + 7) + 1;
                gotSize = true;
            } else if (c.id.equals("ANMF") && c.len >= 16) {
                anmf++;
                int d = le24(b, c.off + 12);
                in.totalMs += d;
                if (d < in.minFrameMs) in.minFrameMs = d;
            } else if (!gotSize && c.id.equals("VP8 ") && c.len >= 10) {
                in.width = ((b[c.off + 6] & 0xff) | ((b[c.off + 7] & 0xff) << 8)) & 0x3fff;
                in.height = ((b[c.off + 8] & 0xff) | ((b[c.off + 9] & 0xff) << 8)) & 0x3fff;
                gotSize = true;
            } else if (!gotSize && c.id.equals("VP8L") && c.len >= 5) {
                int v = le32(b, c.off + 1);
                in.width = (v & 0x3fff) + 1;
                in.height = ((v >> 14) & 0x3fff) + 1;
                in.alpha = ((v >> 28) & 1) != 0;
                gotSize = true;
            } else if (c.id.equals("ALPH")) {
                in.alpha = true;
            }
        }
        in.frames = in.animated ? anmf : 1;
        if (in.minFrameMs == Integer.MAX_VALUE) in.minFrameMs = 0;
        return gotSize ? in : null;
    }

    /** Devolve o texto JSON guardado no EXIF (formato dos stickers do WhatsApp), ou null. */
    public static String readExifJson(byte[] b) {
        if (!isWebp(b)) return null;
        for (Chunk c : chunks(b)) {
            if (!c.id.equals("EXIF")) continue;
            int s = -1, e = -1;
            for (int i = c.off; i < c.off + c.len; i++) if (b[i] == '{') { s = i; break; }
            for (int i = c.off + c.len - 1; i >= 0 && i > s; i--) if (b[i] == '}') { e = i; break; }
            if (s >= 0 && e > s) return new String(b, s, e - s + 1, UTF8);
        }
        return null;
    }

    static void writeChunk(ByteArrayOutputStream out, String id, byte[] src, int off, int len) {
        out.write(id.getBytes(Charset.forName("US-ASCII")), 0, 4);
        out.write(len & 0xff); out.write((len >> 8) & 0xff); out.write((len >> 16) & 0xff); out.write((len >>> 24) & 0xff);
        out.write(src, off, len);
        if ((len & 1) == 1) out.write(0);
    }

    static byte[] exifPayload(String json) {
        byte[] j = json.getBytes(UTF8);
        byte[] h = new byte[]{0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00,
                0, 0, 0, 0, 0x16, 0x00, 0x00, 0x00};
        h[14] = (byte) (j.length & 0xff); h[15] = (byte) ((j.length >> 8) & 0xff);
        h[16] = (byte) ((j.length >> 16) & 0xff); h[17] = (byte) ((j.length >>> 24) & 0xff);
        byte[] r = new byte[h.length + j.length];
        System.arraycopy(h, 0, r, 0, h.length);
        System.arraycopy(j, 0, r, h.length, j.length);
        return r;
    }

    /** Reescreve o WebP sem EXIF/XMP e, se json != null, com um EXIF novo no formato do WhatsApp. */
    public static byte[] withExif(byte[] b, String json) {
        Info in = info(b);
        if (in == null) return b;
        List<Chunk> list = chunks(b);
        ByteArrayOutputStream body = new ByteArrayOutputStream(b.length + 512);
        boolean hasX = false;
        for (Chunk c : list) if (c.id.equals("VP8X")) hasX = true;
        if (!hasX && json == null) return b;
        if (!hasX) {
            byte[] x = new byte[10];
            int flags = 0x08 | (in.alpha ? 0x10 : 0);
            x[0] = (byte) flags;
            int w = in.width - 1, h = in.height - 1;
            x[4] = (byte) (w & 0xff); x[5] = (byte) ((w >> 8) & 0xff); x[6] = (byte) ((w >> 16) & 0xff);
            x[7] = (byte) (h & 0xff); x[8] = (byte) ((h >> 8) & 0xff); x[9] = (byte) ((h >> 16) & 0xff);
            writeChunk(body, "VP8X", x, 0, 10);
        }
        for (Chunk c : list) {
            if (c.id.equals("EXIF") || c.id.equals("XMP ")) continue;
            if (c.id.equals("VP8X")) {
                byte[] x = new byte[c.len];
                System.arraycopy(b, c.off, x, 0, c.len);
                int flags = x[0] & 0xff;
                flags &= ~0x04; // sem XMP
                if (json != null) flags |= 0x08; else flags &= ~0x08;
                x[0] = (byte) flags;
                writeChunk(body, "VP8X", x, 0, x.length);
            } else {
                writeChunk(body, c.id, b, c.off, c.len);
            }
        }
        if (json != null) {
            byte[] p = exifPayload(json);
            writeChunk(body, "EXIF", p, 0, p.length);
        }
        byte[] data = body.toByteArray();
        ByteArrayOutputStream out = new ByteArrayOutputStream(data.length + 12);
        int size = data.length + 4;
        out.write('R'); out.write('I'); out.write('F'); out.write('F');
        out.write(size & 0xff); out.write((size >> 8) & 0xff); out.write((size >> 16) & 0xff); out.write((size >>> 24) & 0xff);
        out.write('W'); out.write('E'); out.write('B'); out.write('P');
        out.write(data, 0, data.length);
        return out.toByteArray();
    }
}
