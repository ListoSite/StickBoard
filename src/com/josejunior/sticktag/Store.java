package com.josejunior.sticktag;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Guarda os packs (data.json + ficheiros) na memória interna da app. */
public final class Store {
    private Store() {}

    public static final Object LOCK = new Object();
    public static final int MAX_PACKS = 10;
    public static final int MAX_STICKERS = 30;
    public static final int STATIC_LIMIT = 100 * 1024;
    public static final int ANIM_LIMIT = 500 * 1024;

    public static boolean isKb(JSONObject p) { return "kb".equals(p.optString("kind")); }

    public static int maxStickers(JSONObject p) { return isKb(p) ? 300 : MAX_STICKERS; }

    public static String authority(Context c) { return c.getPackageName() + ".stickercontentprovider"; }

    public static File root(Context c) {
        File f = new File(c.getFilesDir(), "st");
        if (!f.exists()) f.mkdirs();
        return f;
    }

    public static File packDir(Context c, String id) {
        File f = new File(root(c), "packs/" + id);
        if (!f.exists()) f.mkdirs();
        return f;
    }

    public static JSONObject load(Context c) {
        synchronized (LOCK) {
            File f = new File(root(c), "data.json");
            try {
                if (f.exists()) {
                    JSONObject o = new JSONObject(new String(readFile(f), Webp.UTF8));
                    if (!o.has("packs")) o.put("packs", new JSONArray());
                    return o;
                }
            } catch (Exception ignored) {}
            JSONObject o = new JSONObject();
            try { o.put("packs", new JSONArray()); o.put("a11y", true); } catch (JSONException ignored) {}
            return o;
        }
    }

    public static void save(Context c, JSONObject o) {
        synchronized (LOCK) {
            File f = new File(root(c), "data.json");
            File t = new File(root(c), "data.json.tmp");
            try {
                writeFile(t, o.toString().getBytes(Webp.UTF8));
                if (!t.renameTo(f)) { writeFile(f, o.toString().getBytes(Webp.UTF8)); t.delete(); }
            } catch (IOException ignored) {}
        }
        try {
            c.getContentResolver().notifyChange(Uri.parse("content://" + authority(c) + "/metadata"), null);
        } catch (Exception ignored) {}
    }

    public static JSONObject findPack(JSONObject data, String id) {
        JSONArray a = data.optJSONArray("packs");
        if (a == null) return null;
        for (int i = 0; i < a.length(); i++) {
            JSONObject p = a.optJSONObject(i);
            if (p != null && id.equals(p.optString("id"))) return p;
        }
        return null;
    }

    public static JSONObject findSticker(JSONObject pack, String file) {
        JSONArray a = pack.optJSONArray("stickers");
        if (a == null) return null;
        for (int i = 0; i < a.length(); i++) {
            JSONObject s = a.optJSONObject(i);
            if (s != null && file.equals(s.optString("f"))) return s;
        }
        return null;
    }

    public static byte[] readFile(File f) throws IOException {
        FileInputStream in = new FileInputStream(f);
        try { return readAll(in, Integer.MAX_VALUE); } finally { in.close(); }
    }

    public static byte[] readAll(InputStream in, int max) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n, total = 0;
        while ((n = in.read(buf)) > 0) {
            total += n;
            if (total > max) throw new IOException("ficheiro demasiado grande");
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    public static void writeFile(File f, byte[] b) throws IOException {
        FileOutputStream out = new FileOutputStream(f);
        try { out.write(b); out.getFD().sync(); } finally { out.close(); }
    }

    static String joinArr(JSONArray a, String sep) {
        StringBuilder sb = new StringBuilder();
        if (a == null) return "";
        for (int i = 0; i < a.length(); i++) {
            String s = a.optString(i, "").trim();
            if (s.length() == 0) continue;
            if (sb.length() > 0) sb.append(sep);
            sb.append(s);
        }
        return sb.toString();
    }

    /** Texto de acessibilidade (as palavras do sticker), dentro do limite do WhatsApp. */
    static String a11yText(JSONObject data, JSONObject pack, JSONObject st) {
        if (!data.optBoolean("a11y", true)) return null;
        String t = joinArr(st.optJSONArray("words"), ", ");
        if (t.length() == 0) return null;
        int max = pack.optBoolean("animated") ? 255 : 125;
        if (t.length() > max) t = t.substring(0, max);
        return t;
    }

    static String exifJson(JSONObject pack, JSONObject st) {
        try {
            JSONObject j = new JSONObject();
            j.put("sticker-pack-id", pack.optString("id"));
            j.put("sticker-pack-name", pack.optString("name"));
            j.put("sticker-pack-publisher", pack.optString("publisher"));
            JSONArray e = st.optJSONArray("emojis");
            j.put("emojis", e == null ? new JSONArray() : e);
            return j.toString();
        } catch (JSONException ex) { return null; }
    }

    static String signature(JSONObject data, JSONObject pack) {
        StringBuilder sb = new StringBuilder();
        sb.append(pack.optString("name")).append('|').append(pack.optString("publisher")).append('|')
          .append(pack.optString("cover")).append('|').append(data.optBoolean("a11y", true));
        JSONArray a = pack.optJSONArray("stickers");
        if (a != null) for (int i = 0; i < a.length(); i++) {
            JSONObject s = a.optJSONObject(i);
            sb.append('#').append(s.optString("f")).append(':').append(joinArr(s.optJSONArray("emojis"), ","))
              .append(':').append(joinArr(s.optJSONArray("words"), ","));
        }
        return sb.toString();
    }

    /**
     * Depois de uma alteração: escreve os emojis no EXIF de cada sticker, gera o ícone (tray)
     * e aumenta a versão para o WhatsApp saber que há novidades.
     */
    public static void sync(Context c, JSONObject data, JSONObject pack) throws JSONException {
        String id = pack.optString("id");
        File dir = packDir(c, id);
        JSONArray a = pack.optJSONArray("stickers");
        if (a == null) { a = new JSONArray(); pack.put("stickers", a); }
        boolean anim = pack.optBoolean("animated");
        for (int i = 0; i < a.length(); i++) {
            JSONObject s = a.getJSONObject(i);
            String want = exifJson(pack, s);
            if (want != null && want.equals(s.optString("exif", null))) continue;
            File f = new File(dir, s.optString("f"));
            try {
                byte[] b = readFile(f);
                byte[] nb = Webp.withExif(b, want);
                Webp.Info wi = Webp.info(b);
                boolean thisAnim = anim || (wi != null && wi.animated);
                if (nb.length > (thisAnim ? ANIM_LIMIT : STATIC_LIMIT)) nb = Webp.withExif(b, null);
                writeFile(f, nb);
                s.put("exif", want);
            } catch (IOException ignored) {}
        }
        // capa do pack
        String cover = pack.optString("cover", "");
        if (findSticker(pack, cover) == null) {
            cover = a.length() > 0 ? a.getJSONObject(0).optString("f") : "";
            pack.put("cover", cover);
        }
        File tray = new File(dir, "tray.png");
        if (cover.length() > 0 && (!tray.exists() || !cover.equals(pack.optString("trayFrom")))) {
            if (makeTray(new File(dir, cover), tray)) pack.put("trayFrom", cover);
        }
        pack.put("tray", "tray.png");
        String sig = signature(data, pack);
        if (!sig.equals(pack.optString("sig"))) {
            pack.put("sig", sig);
            pack.put("version", pack.optInt("version", 0) + 1);
        }
    }

    static boolean makeTray(File src, File dst) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap b = BitmapFactory.decodeFile(src.getAbsolutePath(), o);
            if (b == null) return false;
            Bitmap t = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888);
            Canvas cv = new Canvas(t);
            Paint p = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
            cv.drawBitmap(b, new Rect(0, 0, b.getWidth(), b.getHeight()), new Rect(0, 0, 96, 96), p);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            t.compress(Bitmap.CompressFormat.PNG, 100, out);
            writeFile(dst, out.toByteArray());
            b.recycle(); t.recycle();
            return true;
        } catch (Exception e) { return false; }
    }

    /** Liga/desliga uma marca num sticker (ex.: fav). */
    public static String setFlag(Context c, String packId, String file, String key, boolean value) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                JSONObject p = findPack(data, packId);
                JSONObject s = p == null ? null : findSticker(p, file);
                if (s == null) return null;
                if (value) s.put(key, true); else s.remove(key);
                save(c, data);
                return data.toString();
            } catch (JSONException e) { return null; }
        }
    }

    /** O teclado aprende: estas palavras levaram a este sticker. */
    public static void learn(Context c, String packId, String file, JSONArray words) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                JSONObject p = findPack(data, packId);
                JSONObject s = p == null ? null : findSticker(p, file);
                if (s == null || words == null) return;
                JSONObject l = s.optJSONObject("learn");
                if (l == null) { l = new JSONObject(); s.put("learn", l); }
                for (int i = 0; i < words.length(); i++) {
                    String w = words.optString(i, "").trim();
                    if (w.length() < 2 || w.length() > 30) continue;
                    l.put(w, l.optInt(w, 0) + 1);
                }
                // no máximo 40 palavras aprendidas por sticker: tira as menos usadas
                while (l.length() > 40) {
                    String min = null; int mv = Integer.MAX_VALUE;
                    java.util.Iterator<String> it = l.keys();
                    while (it.hasNext()) { String k = it.next(); if (l.optInt(k) < mv) { mv = l.optInt(k); min = k; } }
                    l.remove(min);
                }
                save(c, data);
            } catch (JSONException ignored) {}
        }
    }

    /** Junta palavras a um sticker (a partir do teclado). */
    public static String addWords(Context c, String packId, String file, JSONArray words) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                JSONObject p = findPack(data, packId);
                JSONObject s = p == null ? null : findSticker(p, file);
                if (s == null || words == null) return null;
                JSONArray w = s.optJSONArray("words");
                if (w == null) { w = new JSONArray(); s.put("words", w); }
                for (int i = 0; i < words.length(); i++) {
                    String n = words.optString(i, "").trim();
                    if (n.length() == 0) continue;
                    boolean has = false;
                    for (int k = 0; k < w.length(); k++) if (w.optString(k).equalsIgnoreCase(n)) has = true;
                    if (!has) w.put(n);
                }
                sync(c, data, p);
                save(c, data);
                return data.toString();
            } catch (JSONException e) { return null; }
        }
    }

    static void deleteDir(File f) {
        File[] l = f.listFiles();
        if (l != null) for (File x : l) { if (x.isDirectory()) deleteDir(x); else x.delete(); }
        f.delete();
    }
}
