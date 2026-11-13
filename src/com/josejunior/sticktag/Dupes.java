package com.josejunior.sticktag;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Deteta stickers repetidos comparando as imagens (não só o nome do ficheiro):
 * uma "impressão digital" de 32×32 dos contornos + as cores médias de uma grelha 4×4.
 * As impressões ficam guardadas em hashes.json para não ter de as calcular outra vez.
 */
public final class Dupes {
    private Dupes() {}

    static final int W = 32;
    static final Object LOCK = new Object();
    /** Iguais: quase nenhuma diferença. Parecidos: talvez o mesmo (ex.: comprimido de outra forma). */
    static final int SAME_BITS = 24, SAME_COLOR = 8, LIKE_BITS = 40, LIKE_COLOR = 12;

    static final class H {
        final long[] bits; final int[] col;
        H(long[] b, int[] c) { bits = b; col = c; }
    }

    /* ---------- calcular ---------- */

    static Bitmap decodeSmall(byte[] b) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(b, 0, b.length, o);
        if (o.outWidth <= 0 || o.outHeight <= 0) return null;
        int sample = 1;
        while (Math.min(o.outWidth, o.outHeight) / (sample * 2) >= 64) sample *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = sample;
        o2.inPreferredConfig = Bitmap.Config.ARGB_8888;
        try { return BitmapFactory.decodeByteArray(b, 0, b.length, o2); } catch (Throwable e) { return null; }
    }

    static int[] pixels(Bitmap src, int w, int h) {
        Bitmap d = Bitmap.createScaledBitmap(src, w, h, true);
        int[] px = new int[w * h];
        d.getPixels(px, 0, w, 0, 0, w, h);
        if (d != src) d.recycle();
        return px;
    }

    /** Desenha a imagem num quadrado (como quando é importada) sobre cinzento e tira a impressão. */
    static String hashBitmap(Bitmap src) {
        Bitmap sq = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(sq);
        cv.drawColor(Color.rgb(128, 128, 128));
        float w = src.getWidth(), h = src.getHeight();
        float s = Math.min(64f / w, 64f / h);
        float dw = w * s, dh = h * s;
        cv.drawBitmap(src, null, new RectF((64 - dw) / 2f, (64 - dh) / 2f, (64 + dw) / 2f, (64 + dh) / 2f), new Paint(Paint.FILTER_BITMAP_FLAG));
        int[] g = pixels(sq, W + 1, W);
        long[] bits = new long[W * W / 64];
        int k = 0;
        for (int y = 0; y < W; y++) for (int x = 0; x < W; x++, k++) {
            if (lum(g[y * (W + 1) + x]) > lum(g[y * (W + 1) + x + 1])) bits[k >> 6] |= 1L << (k & 63);
        }
        int[] c = pixels(sq, 4, 4);
        sq.recycle();
        StringBuilder sb = new StringBuilder();
        for (long b : bits) sb.append(String.format("%016x", b));
        sb.append(':');
        for (int p : c) sb.append(String.format("%02x%02x%02x", Color.red(p), Color.green(p), Color.blue(p)));
        return sb.toString();
    }

    static int lum(int p) { return (Color.red(p) * 299 + Color.green(p) * 587 + Color.blue(p) * 114) / 1000; }

    static String hashBytes(byte[] b) {
        Bitmap bm = decodeSmall(b);
        if (bm == null) return null;
        try { return hashBitmap(bm); } finally { bm.recycle(); }
    }

    static String hashFile(File f) {
        try { return hashBytes(Store.readFile(f)); } catch (Exception e) { return null; }
    }

    static String hashUri(Context c, Uri u) {
        try {
            InputStream in = c.getContentResolver().openInputStream(u);
            byte[] b = Store.readAll(in, 30 * 1024 * 1024);
            in.close();
            return hashBytes(b);
        } catch (Exception e) { return null; }
    }

    static H parse(String s) {
        if (s == null) return null;
        try {
            int i = s.indexOf(':');
            long[] bits = new long[W * W / 64];
            for (int k = 0; k < bits.length; k++) bits[k] = (Long.parseLong(s.substring(k * 16, k * 16 + 8), 16) << 32) | Long.parseLong(s.substring(k * 16 + 8, k * 16 + 16), 16);
            int[] col = new int[48];
            for (int k = 0; k < 48; k++) col[k] = Integer.parseInt(s.substring(i + 1 + k * 2, i + 3 + k * 2), 16);
            return new H(bits, col);
        } catch (Exception e) { return null; }
    }

    /** 2 = iguais, 1 = parecidos, 0 = diferentes. */
    static int level(H a, H b) {
        if (a == null || b == null) return 0;
        int d = 0;
        for (int k = 0; k < a.bits.length; k++) d += Long.bitCount(a.bits[k] ^ b.bits[k]);
        if (d > LIKE_BITS) return 0;
        int cd = 0;
        for (int k = 0; k < 48; k++) cd += Math.abs(a.col[k] - b.col[k]);
        cd /= 48;
        if (d <= SAME_BITS && cd <= SAME_COLOR) return 2;
        if (cd <= LIKE_COLOR) return 1;
        return 0;
    }

    /* ---------- cache ---------- */

    static JSONObject loadCache(Context c) {
        synchronized (LOCK) {
            try {
                File f = new File(Store.root(c), "hashes.json");
                if (f.exists()) return new JSONObject(new String(Store.readFile(f), Webp.UTF8));
            } catch (Exception ignored) {}
            return new JSONObject();
        }
    }

    static void saveCache(Context c, JSONObject o) {
        synchronized (LOCK) {
            try { Store.writeFile(new File(Store.root(c), "hashes.json"), o.toString().getBytes(Webp.UTF8)); } catch (Exception ignored) {}
        }
    }

    /** Uma entrada para comparar: sticker da app (pack + ficheiro) ou ficheiro de uma pasta (uri). */
    static final class Item {
        String pack, file, uri; H h; boolean anim;
        JSONObject json() {
            JSONObject o = new JSONObject();
            try {
                if (uri != null) o.put("uri", uri); else { o.put("p", pack); o.put("f", file); }
                if (anim) o.put("anim", true);
            } catch (Exception ignored) {}
            return o;
        }
    }

    interface Progress { void on(int done, int total); }

    /** Impressões de todos os stickers da app (calcula as que faltam). */
    static List<Item> appItems(Context c, Progress pr) {
        JSONObject data = Store.load(c);
        JSONObject cache = loadCache(c);
        List<Item> out = new ArrayList<Item>();
        JSONArray ps = data.optJSONArray("packs");
        int total = 0, done = 0;
        if (ps != null) for (int i = 0; i < ps.length(); i++) total += ps.optJSONObject(i).optJSONArray("stickers").length();
        boolean changed = false;
        JSONObject keep = new JSONObject();
        if (ps != null) for (int i = 0; i < ps.length(); i++) {
            JSONObject p = ps.optJSONObject(i);
            JSONArray st = p.optJSONArray("stickers");
            for (int k = 0; st != null && k < st.length(); k++) {
                JSONObject s = st.optJSONObject(k);
                String key = p.optString("id") + "/" + s.optString("f");
                String hs = cache.optString(key, null);
                if (hs == null) {
                    hs = hashFile(new File(Store.packDir(c, p.optString("id")), s.optString("f")));
                    changed = true;
                }
                done++;
                if (pr != null && (done % 8 == 0 || done == total)) pr.on(done, total);
                if (hs == null) continue;
                try { keep.put(key, hs); } catch (Exception ignored) {}
                Item it = new Item();
                it.pack = p.optString("id"); it.file = s.optString("f"); it.h = parse(hs);
                it.anim = s.optBoolean("anim") || p.optBoolean("animated");
                out.add(it);
            }
        }
        // guarda só os que existem (os apagados saem)
        JSONArray docs = cache.names();
        if (docs != null) for (int i = 0; i < docs.length(); i++) {
            String n = docs.optString(i);
            if (n.startsWith("doc|")) try { keep.put(n, cache.optString(n)); } catch (Exception ignored) {}
        }
        if (changed || keep.length() != cache.length()) saveCache(c, keep);
        return out;
    }

    /** Junta os itens em grupos de repetidos. Só devolve grupos onde há pelo menos um item de "focus" (ou todos se focus = null). */
    static JSONArray groups(List<Item> items, java.util.Set<Item> focus) { return groups(items, focus, null); }

    static JSONArray groups(List<Item> items, java.util.Set<Item> focus, Progress pr) {
        int n = items.size();
        int[] parent = new int[n];
        int[] lvl = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; lvl[i] = 2; }
        long last = 0;
        for (int i = 0; i < n; i++) {
          if (pr != null && System.currentTimeMillis() - last > 200) { pr.on(i, n); last = System.currentTimeMillis(); }
          for (int j = i + 1; j < n; j++) {
            int l = level(items.get(i).h, items.get(j).h);
            if (l == 0) continue;
            int a = find(parent, i), b = find(parent, j);
            if (a != b) { parent[b] = a; lvl[a] = Math.min(Math.min(lvl[a], lvl[b]), l); }
            else lvl[a] = Math.min(lvl[a], l);
          }
        }
        java.util.LinkedHashMap<Integer, List<Integer>> g = new java.util.LinkedHashMap<Integer, List<Integer>>();
        for (int i = 0; i < n; i++) {
            int r = find(parent, i);
            List<Integer> l = g.get(r);
            if (l == null) { l = new ArrayList<Integer>(); g.put(r, l); }
            l.add(i);
        }
        JSONArray out = new JSONArray();
        for (java.util.Map.Entry<Integer, List<Integer>> e : g.entrySet()) {
            if (e.getValue().size() < 2) continue;
            boolean hit = focus == null;
            JSONArray a = new JSONArray();
            for (int i : e.getValue()) { a.put(items.get(i).json()); if (focus != null && focus.contains(items.get(i))) hit = true; }
            if (!hit) continue;
            try { out.put(new JSONObject().put("level", lvl[e.getKey()] == 2 ? "same" : "like").put("items", a)); } catch (Exception ignored) {}
        }
        return out;
    }

    static int find(int[] p, int i) { while (p[i] != i) { p[i] = p[p[i]]; i = p[i]; } return i; }

    /** Algum sticker da app igual a esta impressão? Devolve {p,f} ou null. */
    static Item sameAs(List<Item> app, String hs, String exceptPack, String exceptFile) {
        H h = parse(hs);
        for (Item it : app) {
            if (it.pack.equals(exceptPack) && it.file.equals(exceptFile)) continue;
            if (level(h, it.h) == 2) return it;
        }
        return null;
    }

    static void rememberAll(Context c, java.util.Map<String, String> m) {
        if (m == null || m.isEmpty()) return;
        JSONObject cache = loadCache(c);
        for (java.util.Map.Entry<String, String> e : m.entrySet()) try { cache.put(e.getKey(), e.getValue()); } catch (Exception ignored) {}
        saveCache(c, cache);
    }

    static void remember(Context c, String key, String hs) {
        if (hs == null) return;
        JSONObject cache = loadCache(c);
        try { cache.put(key, hs); } catch (Exception ignored) {}
        saveCache(c, cache);
    }
}
