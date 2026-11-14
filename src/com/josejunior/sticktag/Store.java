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

    /** Packs só do teclado não têm limite; os do WhatsApp têm 30 (os escondidos dos especiais não contam). */
    public static int maxStickers(JSONObject p) { return isKb(p) ? 1000000 : MAX_STICKERS; }

    public static int visibleCount(JSONObject p) {
        JSONArray a = p.optJSONArray("stickers");
        int n = 0;
        if (a != null) for (int i = 0; i < a.length(); i++) if (!a.optJSONObject(i).optBoolean("hidden")) n++;
        return n;
    }

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

    /** Obriga a reescrever o EXIF deste sticker no próximo sync. */
    public static void forceExif(JSONObject s) { s.remove("exif"); s.remove("exifH"); }

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
            // mensagem escondida ("não cliques"): aparece a quem tocar no sticker
            String sn = st.optString("secretName", ""), sp = st.optString("secretPub", "");
            j.put("sticker-pack-name", sn.length() > 0 ? sn : pack.optString("name"));
            j.put("sticker-pack-publisher", sn.length() > 0 || sp.length() > 0 ? sp : pack.optString("publisher"));
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
              .append(':').append(joinArr(s.optJSONArray("words"), ","))
              .append(':').append(s.optString("secretName", "")).append(':').append(s.optString("secretPub", ""))
              .append(s.optBoolean("hidden") ? ":h" : "");
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
            if (want == null) continue;
            String wantH = Integer.toHexString(want.hashCode());
            // guardamos só um resumo (hash) do EXIF escrito: o data.json fica bem mais pequeno com milhares de stickers
            if (wantH.equals(s.optString("exifH", null)) || want.equals(s.optString("exif", null))) {
                if (s.has("exif")) { s.remove("exif"); s.put("exifH", wantH); }
                continue;
            }
            File f = new File(dir, s.optString("f"));
            try {
                byte[] b = readFile(f);
                byte[] nb = Webp.withExif(b, want);
                Webp.Info wi = Webp.info(b);
                boolean thisAnim = anim || (wi != null && wi.animated);
                if (nb.length > (thisAnim ? ANIM_LIMIT : STATIC_LIMIT)) nb = Webp.withExif(b, null);
                writeFile(f, nb);
                s.remove("exif");
                s.put("exifH", wantH);
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
                if (key.equals("hidden")) sync(c, data, p);
                save(c, data);
                return data.toString();
            } catch (JSONException e) { return null; }
        }
    }

    /*
     * Aprendizagem do teclado.
     * Cada sticker guarda em "lrn" as palavras que escreveste antes de o mandar: {palavra: [peso, dia, vezes]}.
     * - o peso sobe 1 cada vez que usas essa palavra para esse sticker (máx. 12);
     * - vai perdendo força com o tempo (metade a cada 45 dias sem uso): se deixares de usar uma palavra, ela desaparece;
     * - quando escolhes outro sticker em vez dos que apareciam primeiro, esses perdem um pouco de peso para essas palavras;
     * - também conta quantas vezes usas o sticker e a que horas (para o sugerir à hora a que costumas).
     */
    static final double HALF_LIFE_DAYS = 45;

    static int today() { return (int) (System.currentTimeMillis() / 86400000L); }

    static double decayed(JSONArray e, int today) {
        if (e == null) return 0;
        return e.optDouble(0, 0) * Math.pow(0.5, Math.max(0, today - e.optInt(1, today)) / HALF_LIFE_DAYS);
    }

    /** "learn" antigo ({palavra: vezes}) → "lrn" novo. */
    static JSONObject lrnOf(JSONObject s, int today) throws JSONException {
        JSONObject l = s.optJSONObject("lrn");
        if (l != null) return l;
        l = new JSONObject();
        JSONObject old = s.optJSONObject("learn");
        if (old != null) {
            java.util.Iterator<String> it = old.keys();
            while (it.hasNext()) { String k = it.next(); int n = old.optInt(k, 1); l.put(k, new JSONArray().put(Math.min(12, n)).put(today - 7).put(n)); }
            s.remove("learn");
        }
        s.put("lrn", l);
        return l;
    }

    static double r2(double v) { return Math.round(v * 100) / 100.0; }

    public static void learn(Context c, String packId, String file, JSONArray words) { learn(c, packId, file, words, null); }

    public static void learn(Context c, String packId, String file, JSONArray words, JSONArray skipped) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                if (!data.optBoolean("learnOn", true)) return;
                JSONObject p = findPack(data, packId);
                JSONObject s = p == null ? null : findSticker(p, file);
                if (s == null) return;
                int day = today();
                // quantas vezes e a que horas usas este sticker
                s.put("uses", s.optInt("uses", 0) + 1);
                s.put("last", day);
                JSONArray h = s.optJSONArray("hrs");
                if (h == null || h.length() != 6) { h = new JSONArray(); for (int i = 0; i < 6; i++) h.put(0); s.put("hrs", h); }
                int b = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY) / 4;
                h.put(b, h.optInt(b, 0) + 1);
                if (words != null && words.length() > 0) {
                    JSONObject l = lrnOf(s, day);
                    java.util.HashSet<String> ws = new java.util.HashSet<String>();
                    for (int i = 0; i < words.length(); i++) {
                        String w = words.optString(i, "").trim().toLowerCase();
                        if (w.length() < 2 || w.length() > 40 || !ws.add(w)) continue;
                        JSONArray e = l.optJSONArray(w);
                        double wt = decayed(e, day) + 1;
                        l.put(w, new JSONArray().put(r2(Math.min(12, wt))).put(day).put((e == null ? 0 : e.optInt(2, 0)) + 1));
                    }
                    // no máximo 60 palavras por sticker: saem as mais fracas
                    while (l.length() > 60) {
                        String min = null; double mv = Double.MAX_VALUE;
                        java.util.Iterator<String> it = l.keys();
                        while (it.hasNext()) { String k = it.next(); double v = decayed(l.optJSONArray(k), day); if (v < mv) { mv = v; min = k; } }
                        l.remove(min);
                    }
                    // o emoji também aprende: vale para todos os stickers com este emoji, também os que juntares depois
                    JSONArray ems = s.optJSONArray("emojis");
                    if (ems != null && ems.length() > 0) {
                        JSONObject el = data.optJSONObject("emojiLrn");
                        if (el == null) { el = new JSONObject(); data.put("emojiLrn", el); }
                        String me = packId + "/" + file;
                        for (int i = 0; i < ems.length() && i < 3; i++) {
                            String k = ems.optString(i, "").replace("\uFE0F", "");
                            if (k.length() == 0) continue;
                            JSONObject m = el.optJSONObject(k);
                            if (m == null) { m = new JSONObject(); el.put(k, m); }
                            for (String w : ws) {
                                JSONArray e = m.optJSONArray(w);
                                double wt = decayed(e, day) + 1;
                                // [força, dia, vezes, em quantos stickers diferentes, o último sticker]
                                int distinct = e == null ? 1 : e.optInt(3, 1) + (me.equals(e.optString(4, "")) ? 0 : 1);
                                m.put(w, new JSONArray().put(r2(Math.min(15, wt))).put(day).put((e == null ? 0 : e.optInt(2, 0)) + 1).put(Math.min(99, distinct)).put(me));
                            }
                            while (m.length() > 80) {
                                String min = null; double mv = Double.MAX_VALUE;
                                java.util.Iterator<String> it = m.keys();
                                while (it.hasNext()) { String kk = it.next(); double v = decayed(m.optJSONArray(kk), day); if (v < mv) { mv = v; min = kk; } }
                                m.remove(min);
                            }
                        }
                    }
                    // escolheste este em vez dos que estavam à frente: esses perdem um pouco para estas palavras
                    if (skipped != null) for (int i = 0; i < skipped.length() && i < 4; i++) {
                        JSONObject x = skipped.optJSONObject(i);
                        if (x == null) continue;
                        JSONObject sp = findPack(data, x.optString("p"));
                        JSONObject ss = sp == null ? null : findSticker(sp, x.optString("f"));
                        if (ss == null || ss == s) continue;
                        JSONObject l2 = ss.optJSONObject("lrn");
                        if (l2 == null && ss.optJSONObject("learn") != null) l2 = lrnOf(ss, day);
                        if (l2 == null) continue;
                        for (String w : ws) {
                            JSONArray e = l2.optJSONArray(w);
                            if (e == null) continue;
                            double wt = decayed(e, day) - 0.6;
                            if (wt <= 0.25) l2.remove(w);
                            else l2.put(w, new JSONArray().put(r2(wt)).put(day).put(e.optInt(2, 0)));
                        }
                    }
                }
                save(c, data);
            } catch (JSONException ignored) {}
        }
    }

    /** Esquecer: uma palavra de um sticker, tudo de um sticker (word = "") ou tudo de todos (packId = null). */
    public static String forget(Context c, String packId, String file, String word) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                JSONArray ps = data.optJSONArray("packs");
                for (int i = 0; ps != null && i < ps.length(); i++) {
                    JSONObject p = ps.getJSONObject(i);
                    if (packId != null && !packId.equals(p.optString("id"))) continue;
                    JSONArray a = p.optJSONArray("stickers");
                    for (int k = 0; a != null && k < a.length(); k++) {
                        JSONObject s = a.getJSONObject(k);
                        if (file != null && file.length() > 0 && !file.equals(s.optString("f"))) continue;
                        if (word != null && word.length() > 0) {
                            JSONObject l = lrnOf(s, today());
                            l.remove(word);
                        } else {
                            s.remove("lrn"); s.remove("learn");
                            if (packId == null) { s.remove("uses"); s.remove("hrs"); s.remove("last"); }
                        }
                    }
                }
                save(c, data);
                return data.toString();
            } catch (JSONException e) { return null; }
        }
    }

    /** Esquecer o que um emoji aprendeu: uma palavra, tudo desse emoji (word = "") ou tudo de todos (emoji = ""). */
    public static String forgetEmoji(Context c, String emoji, String word) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                JSONObject el = data.optJSONObject("emojiLrn");
                if (el != null) {
                    String k = emoji == null ? "" : emoji.replace("\uFE0F", "");
                    if (k.length() == 0) data.remove("emojiLrn");
                    else if (word == null || word.length() == 0) el.remove(k);
                    else { JSONObject m = el.optJSONObject(k); if (m != null) m.remove(word); }
                }
                save(c, data);
                return data.toString();
            } catch (Exception e) { return null; }
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
