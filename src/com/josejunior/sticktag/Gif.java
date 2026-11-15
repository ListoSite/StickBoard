package com.josejunior.sticktag;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Converte stickers WebP (também animados) para GIF, para as apps que só aceitam GIF/PNG do teclado.
 * Assim os animados continuam animados (em vez de irem só com o 1.º quadro).
 */
public final class Gif {
    private Gif() {}

    public static final class Frame {
        public final Bitmap bmp; public final int ms;
        Frame(Bitmap b, int ms) { this.bmp = b; this.ms = ms; }
    }

    /* ------------------------------------------------------------------ */
    /* WebP animado → quadros já compostos (com blending e disposal)        */
    /* ------------------------------------------------------------------ */

    /** Quadros do WebP (1 quadro se for estático). maxSide reduz o tamanho; maxFrames junta quadros a mais. */
    public static List<Frame> frames(byte[] b, int maxSide, int maxFrames) {
        List<Frame> out = new ArrayList<Frame>();
        Webp.Info info = Webp.info(b);
        if (info == null) return out;
        if (!info.animated) {
            Bitmap one = BitmapFactory.decodeByteArray(b, 0, b.length);
            if (one != null) out.add(new Frame(scale(one, maxSide), 0));
            return out;
        }
        int W = info.width, H = info.height;
        Bitmap canvasBmp = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(canvasBmp);
        Paint over = new Paint(Paint.FILTER_BITMAP_FLAG);
        Paint src = new Paint(Paint.FILTER_BITMAP_FLAG);
        src.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC));
        Paint clear = new Paint();
        clear.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.CLEAR));
        Rect prevRect = null;
        boolean prevDispose = false;
        List<Webp.Chunk> cs = Webp.chunks(b);
        int total = 0;
        for (Webp.Chunk c : cs) if (c.id.equals("ANMF")) total++;
        int step = maxFrames > 0 && total > maxFrames ? (int) Math.ceil(total / (double) maxFrames) : 1;
        int idx = 0, pendingMs = 0;
        for (Webp.Chunk c : cs) {
            if (!c.id.equals("ANMF") || c.len < 16) continue;
            int x = Webp.le24(b, c.off) * 2, y = Webp.le24(b, c.off + 3) * 2;
            int fw = Webp.le24(b, c.off + 6) + 1, fh = Webp.le24(b, c.off + 9) + 1;
            int dur = Webp.le24(b, c.off + 12);
            int flags = b[c.off + 15] & 0xff;
            boolean noBlend = (flags & 0x02) != 0, dispose = (flags & 0x01) != 0;
            if (prevDispose && prevRect != null) cv.drawRect(prevRect, clear);
            Bitmap fb = decodeFrame(b, c.off + 16, c.len - 16, fw, fh);
            Rect r = new Rect(x, y, x + fw, y + fh);
            if (fb != null) cv.drawBitmap(fb, null, r, noBlend ? src : over);
            prevRect = r; prevDispose = dispose;
            pendingMs += Math.max(20, dur);
            if (idx % step == 0 || idx == total - 1) {
                out.add(new Frame(scale(canvasBmp.copy(Bitmap.Config.ARGB_8888, false), maxSide), pendingMs));
                pendingMs = 0;
            }
            if (fb != null) fb.recycle();
            idx++;
        }
        canvasBmp.recycle();
        return out;
    }

    /** Monta um WebP sozinho com os dados de um quadro (ALPH + VP8, ou VP8L) e descodifica-o. */
    static Bitmap decodeFrame(byte[] b, int off, int len, int w, int h) {
        byte[] alph = null; int aOff = 0, aLen = 0;
        int vOff = -1, vLen = 0; String vId = null;
        int p = off, end = off + len;
        while (p + 8 <= end) {
            String id = new String(b, p, 4, Webp.UTF8);
            int l = Webp.le32(b, p + 4);
            if (l < 0 || p + 8 + l > end) break;
            if (id.equals("ALPH")) { alph = b; aOff = p + 8; aLen = l; }
            else if (id.equals("VP8 ") || id.equals("VP8L")) { vId = id; vOff = p + 8; vLen = l; }
            p += 8 + l + (l & 1);
        }
        if (vId == null) return null;
        ByteArrayOutputStream o = new ByteArrayOutputStream(vLen + aLen + 64);
        ByteArrayOutputStream body = new ByteArrayOutputStream(vLen + aLen + 48);
        body.write('W'); body.write('E'); body.write('B'); body.write('P');
        if (vId.equals("VP8 ") && alph != null) {
            byte[] x = new byte[10];
            x[0] = 0x10; // tem transparência
            put24(x, 4, w - 1); put24(x, 7, h - 1);
            Webp.writeChunk(body, "VP8X", x, 0, 10);
            Webp.writeChunk(body, "ALPH", alph, aOff, aLen);
        }
        Webp.writeChunk(body, vId, b, vOff, vLen);
        byte[] bb = body.toByteArray();
        o.write('R'); o.write('I'); o.write('F'); o.write('F');
        int n = bb.length;
        o.write(n & 0xff); o.write((n >> 8) & 0xff); o.write((n >> 16) & 0xff); o.write((n >>> 24) & 0xff);
        o.write(bb, 0, bb.length);
        byte[] file = o.toByteArray();
        return BitmapFactory.decodeByteArray(file, 0, file.length);
    }

    static void put24(byte[] a, int o, int v) { a[o] = (byte) v; a[o + 1] = (byte) (v >> 8); a[o + 2] = (byte) (v >> 16); }

    static Bitmap scale(Bitmap b, int maxSide) {
        if (maxSide <= 0 || (b.getWidth() <= maxSide && b.getHeight() <= maxSide)) return b;
        float k = maxSide / (float) Math.max(b.getWidth(), b.getHeight());
        Bitmap s = Bitmap.createScaledBitmap(b, Math.max(1, Math.round(b.getWidth() * k)), Math.max(1, Math.round(b.getHeight() * k)), true);
        if (s != b) b.recycle();
        return s;
    }

    /** Pinta um fundo por baixo (para apps que estragam a transparência). color = 0 → fica transparente. */
    public static Bitmap withBackground(Bitmap b, int color) {
        if (color == 0) return b;
        Bitmap r = Bitmap.createBitmap(b.getWidth(), b.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(r);
        c.drawColor(color);
        c.drawBitmap(b, 0, 0, null);
        return r;
    }

    /* ------------------------------------------------------------------ */
    /* GIF: paleta por quadro (median cut), transparência e LZW            */
    /* ------------------------------------------------------------------ */

    public static byte[] encode(List<Frame> frames, int bgColor) {
        if (frames.isEmpty()) return null;
        int W = frames.get(0).bmp.getWidth(), H = frames.get(0).bmp.getHeight();
        ByteArrayOutputStream o = new ByteArrayOutputStream(64 * 1024);
        writeAscii(o, "GIF89a");
        le16(o, W); le16(o, H);
        o.write(0x70); // sem paleta global
        o.write(0); o.write(0);
        if (frames.size() > 1) { // repetir para sempre
            o.write(0x21); o.write(0xFF); o.write(11); writeAscii(o, "NETSCAPE2.0");
            o.write(3); o.write(1); le16(o, 0); o.write(0);
        }
        int[] px = new int[W * H];
        for (Frame f : frames) {
            Bitmap bm = bgColor != 0 ? withBackground(f.bmp, bgColor) : f.bmp;
            bm.getPixels(px, 0, W, 0, 0, W, H);
            int[] pal = new int[256];
            byte[] idx = quantize(px, pal);
            // controlo gráfico: atraso, transparência (índice 255) e "repor o fundo" entre quadros
            o.write(0x21); o.write(0xF9); o.write(4);
            o.write((2 << 2) | 1);
            le16(o, Math.max(2, Math.round(f.ms / 10f)));
            o.write(255); o.write(0);
            // imagem com paleta local de 256 cores
            o.write(0x2C); le16(o, 0); le16(o, 0); le16(o, W); le16(o, H);
            o.write(0x80 | 7);
            for (int i = 0; i < 256; i++) { int c = pal[i]; o.write((c >> 16) & 0xff); o.write((c >> 8) & 0xff); o.write(c & 0xff); }
            lzw(o, idx, 8);
        }
        o.write(0x3B);
        return o.toByteArray();
    }

    /** Median cut sobre as cores visíveis (até 255 cores; o 255 fica para o transparente). */
    static byte[] quantize(int[] px, int[] pal) {
        int n = px.length;
        int[] hist = new int[32768];
        for (int i = 0; i < n; i++) {
            int c = px[i];
            if ((c >>> 24) < 128) continue;
            hist[((c >> 9) & 0x7C00) | ((c >> 6) & 0x3E0) | ((c >> 3) & 0x1F)]++;
        }
        List<int[]> colors = new ArrayList<int[]>();
        for (int k = 0; k < 32768; k++) if (hist[k] > 0) colors.add(new int[]{(k >> 10) & 31, (k >> 5) & 31, k & 31, hist[k]});
        List<List<int[]>> boxes = new ArrayList<List<int[]>>();
        if (!colors.isEmpty()) boxes.add(colors);
        while (boxes.size() < 255) {
            int bi = -1, bestRange = 0;
            for (int i = 0; i < boxes.size(); i++) {
                List<int[]> bx = boxes.get(i);
                if (bx.size() < 2) continue;
                int r = range(bx);
                if (r > bestRange) { bestRange = r; bi = i; }
            }
            if (bi < 0) break;
            List<int[]> bx = boxes.remove(bi);
            final int ch = channel(bx);
            java.util.Collections.sort(bx, new java.util.Comparator<int[]>() {
                @Override public int compare(int[] a, int[] c) { return a[ch] - c[ch]; }
            });
            long tot = 0; for (int[] c : bx) tot += c[3];
            long acc = 0; int cut = 1;
            for (int i = 0; i < bx.size() - 1; i++) { acc += bx.get(i)[3]; if (acc >= tot / 2) { cut = i + 1; break; } }
            boxes.add(new ArrayList<int[]>(bx.subList(0, cut)));
            boxes.add(new ArrayList<int[]>(bx.subList(cut, bx.size())));
        }
        int[] lut = new int[32768];
        java.util.Arrays.fill(lut, -1);
        for (int i = 0; i < boxes.size(); i++) {
            long r = 0, g = 0, bl = 0, t = 0;
            for (int[] c : boxes.get(i)) { r += (long) c[0] * c[3]; g += (long) c[1] * c[3]; bl += (long) c[2] * c[3]; t += c[3]; lut[(c[0] << 10) | (c[1] << 5) | c[2]] = i; }
            if (t == 0) t = 1;
            int R = (int) (r * 255 / (31 * t)), G = (int) (g * 255 / (31 * t)), B = (int) (bl * 255 / (31 * t));
            pal[i] = (R << 16) | (G << 8) | B;
        }
        byte[] out = new byte[n];
        for (int i = 0; i < n; i++) {
            int c = px[i];
            if ((c >>> 24) < 128) { out[i] = (byte) 255; continue; }
            int k = ((c >> 9) & 0x7C00) | ((c >> 6) & 0x3E0) | ((c >> 3) & 0x1F);
            int v = lut[k];
            out[i] = (byte) (v < 0 ? 0 : v);
        }
        return out;
    }

    static int range(List<int[]> bx) {
        int best = 0;
        for (int ch = 0; ch < 3; ch++) {
            int mn = 99, mx = -1;
            for (int[] c : bx) { if (c[ch] < mn) mn = c[ch]; if (c[ch] > mx) mx = c[ch]; }
            best = Math.max(best, mx - mn);
        }
        return best;
    }

    static int channel(List<int[]> bx) {
        int best = 0, bc = 0;
        for (int ch = 0; ch < 3; ch++) {
            int mn = 99, mx = -1;
            for (int[] c : bx) { if (c[ch] < mn) mn = c[ch]; if (c[ch] > mx) mx = c[ch]; }
            if (mx - mn > best) { best = mx - mn; bc = ch; }
        }
        return bc;
    }

    /** Compressão LZW do GIF, em blocos de até 255 bytes. */
    static void lzw(ByteArrayOutputStream o, byte[] data, int minCode) {
        o.write(minCode);
        final int clear = 1 << minCode, eoi = clear + 1;
        int codeSize = minCode + 1, next = eoi + 1;
        java.util.HashMap<Integer, Integer> dict = new java.util.HashMap<Integer, Integer>(8192);
        byte[] block = new byte[255];
        int[] st = {0, 0, 0}; // bits, nBits, blockLen
        emit(o, block, st, clear, codeSize);
        int prefix = data.length > 0 ? (data[0] & 0xff) : 0;
        for (int i = 1; i < data.length; i++) {
            int k = data[i] & 0xff;
            int key = (prefix << 8) | k;
            Integer code = dict.get(key);
            if (code != null) { prefix = code; continue; }
            emit(o, block, st, prefix, codeSize);
            if (next < 4096) {
                dict.put(key, next++);
                if (next > (1 << codeSize) && codeSize < 12) codeSize++;
            } else {
                emit(o, block, st, clear, codeSize);
                dict.clear();
                codeSize = minCode + 1; next = eoi + 1;
            }
            prefix = k;
        }
        emit(o, block, st, prefix, codeSize);
        emit(o, block, st, eoi, codeSize);
        while (st[1] > 0) { addByte(o, block, st, st[0] & 0xff); st[0] >>>= 8; st[1] = Math.max(0, st[1] - 8); }
        if (st[2] > 0) { o.write(st[2]); o.write(block, 0, st[2]); st[2] = 0; }
        o.write(0);
    }

    static void emit(ByteArrayOutputStream o, byte[] block, int[] st, int code, int size) {
        st[0] |= code << st[1];
        st[1] += size;
        while (st[1] >= 8) { addByte(o, block, st, st[0] & 0xff); st[0] >>>= 8; st[1] -= 8; }
    }

    static void addByte(ByteArrayOutputStream o, byte[] block, int[] st, int v) {
        block[st[2]++] = (byte) v;
        if (st[2] == 255) { o.write(255); o.write(block, 0, 255); st[2] = 0; }
    }

    static void le16(ByteArrayOutputStream o, int v) { o.write(v & 0xff); o.write((v >> 8) & 0xff); }
    static void writeAscii(ByteArrayOutputStream o, String s) { for (int i = 0; i < s.length(); i++) o.write(s.charAt(i)); }
}
