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

    public static void learn(Context c, String packId, String file, JSONArray words, JSONArray skipped) { learn(c, packId, file, words, skipped, null); }

    /** Junta um vetor (tema/emojis/forma da frase) ao que o sticker já sabia: o antigo perde força com o tempo, fica só o mais forte. */
    static JSONObject mergeVec(JSONObject old, JSONObject add, double k, int keep) throws JSONException {
        JSONObject out = new JSONObject();
        if (old != null) { java.util.Iterator<String> it = old.keys(); while (it.hasNext()) { String x = it.next(); out.put(x, old.optDouble(x, 0) * k); } }
        if (add != null) { java.util.Iterator<String> it = add.keys(); while (it.hasNext()) { String x = it.next(); out.put(x, out.optDouble(x, 0) + add.optDouble(x, 0)); } }
        // só os mais fortes
        java.util.List<String> ks = new java.util.ArrayList<String>();
        java.util.Iterator<String> it = out.keys(); while (it.hasNext()) ks.add(it.next());
        final JSONObject o = out;
        java.util.Collections.sort(ks, new java.util.Comparator<String>() { public int compare(String a, String b) { return Double.compare(o.optDouble(b, 0), o.optDouble(a, 0)); } });
        JSONObject r = new JSONObject();
        for (int i = 0; i < ks.size() && i < keep; i++) { double v = out.optDouble(ks.get(i), 0); if (v >= 0.02) r.put(ks.get(i), r2(Math.min(30, v))); }
        return r;
    }

    /** O contexto em que mandaste o sticker (temas da mensagem, emojis, forma da frase): o teclado aprende com isto. */
    static void learnCtx(JSONObject s, JSONObject ctx, int day, double sign) throws JSONException {
        if (ctx == null) return;
        JSONObject cx = s.optJSONObject("cx");
        double k = 1;
        if (cx != null) k = Math.pow(0.5, Math.max(0, day - cx.optInt("d", day)) / 45.0);
        else cx = new JSONObject();
        if (sign > 0) {
            cx.put("f", mergeVec(cx.optJSONObject("f"), ctx.optJSONObject("f"), k, 8));
            cx.put("e", mergeVec(cx.optJSONObject("e"), ctx.optJSONObject("e"), k, 10));
            cx.put("s", mergeVec(cx.optJSONObject("s"), ctx.optJSONObject("s"), k, 8));
            cx.put("n", r2(Math.min(40, cx.optDouble("n", 0) * k + 1)));
        } else {
            // estava à frente e não o escolheste: os temas desta mensagem perdem um pouco neste sticker
            JSONObject f = cx.optJSONObject("f");
            JSONObject add = ctx.optJSONObject("f");
            if (f == null || add == null) return;
            java.util.Iterator<String> it = add.keys();
            while (it.hasNext()) { String x = it.next(); if (f.has(x)) { double v = f.optDouble(x, 0) - 0.35 * add.optDouble(x, 0); if (v <= 0.02) f.remove(x); else f.put(x, r2(v)); } }
        }
        cx.put("d", day);
        s.put("cx", cx);
    }

    public static void learn(Context c, String packId, String file, JSONArray words, JSONArray skipped, JSONObject ctx) {
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
                learnCtx(s, ctx, day, 1);
                if (words != null && words.length() > 0) {
                    JSONObject l = lrnOf(s, day);
                    java.util.HashSet<String> ws = new java.util.HashSet<String>();
                    java.util.HashMap<String, Double> inc = new java.util.HashMap<String, Double>();
                    for (int i = 0; i < words.length(); i++) {
                        // cada palavra pode vir com a sua força: ["palavra", 0.2…1.5] (o fim da mensagem e as expressões contam mais)
                        JSONArray pair = words.optJSONArray(i);
                        String w = (pair != null ? pair.optString(0, "") : words.optString(i, "")).trim().toLowerCase();
                        double add = pair != null ? Math.max(0.2, Math.min(1.5, pair.optDouble(1, 1))) : 1;
                        if (w.length() < 2 || w.length() > 40 || !ws.add(w)) continue;
                        inc.put(w, add);
                        JSONArray e = l.optJSONArray(w);
                        double wt = decayed(e, day) + add;
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
                                double wt = decayed(e, day) + (inc.containsKey(w) ? inc.get(w) : 1);
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
                        learnCtx(ss, ctx, day, -1);
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

    /**
     * O AMBIENTE em que usaste um sticker (brincar, amor, insultar…). weight 1 = a tua resposta à pergunta;
     * menos do que isso = a app aprendeu sozinha. As palavras da conversa (words = [["chave", força]…]) ensinam
     * o detetor de ambiente (data.vibeLrn), e perdem um pouco nos outros ambientes.
     */
    public static String learnVibe(Context c, String packId, String file, String vibe, JSONArray words, double weight) {
        synchronized (LOCK) {
            try {
                if (vibe == null || vibe.length() == 0 || vibe.length() > 20) return null;
                JSONObject data = load(c);
                JSONObject p = findPack(data, packId);
                JSONObject s = p == null ? null : findSticker(p, file);
                if (s == null) return null;
                int day = today();
                JSONObject vb = s.optJSONObject("vb");
                double k = vb == null ? 1 : Math.pow(0.5, Math.max(0, day - s.optInt("vbd", day)) / (HALF_LIFE_DAYS * 2));
                JSONObject nv = new JSONObject();
                if (vb != null) { java.util.Iterator<String> it = vb.keys(); while (it.hasNext()) { String x = it.next(); double v = vb.optDouble(x, 0) * k; if (v >= 0.05) nv.put(x, r2(v)); } }
                nv.put(vibe, r2(Math.min(30, nv.optDouble(vibe, 0) + weight)));
                s.put("vb", nv);
                s.put("vbd", day);
                if (weight >= 1) s.put("vbn", s.optInt("vbn", 0) + 1);
                if (words != null && words.length() > 0 && weight >= 1) {
                    JSONObject vl = data.optJSONObject("vibeLrn");
                    if (vl == null) { vl = new JSONObject(); data.put("vibeLrn", vl); }
                    JSONObject m = vl.optJSONObject(vibe);
                    if (m == null) { m = new JSONObject(); vl.put(vibe, m); }
                    java.util.HashSet<String> seen = new java.util.HashSet<String>();
                    for (int i = 0; i < words.length() && i < 20; i++) {
                        JSONArray pair = words.optJSONArray(i);
                        String w = pair == null ? words.optString(i, "") : pair.optString(0, "");
                        double add = pair == null ? 1 : Math.max(0.2, Math.min(1.5, pair.optDouble(1, 1)));
                        w = w.trim().toLowerCase();
                        if (w.length() < 2 || w.length() > 40 || !seen.add(w)) continue;
                        JSONArray e = m.optJSONArray(w);
                        m.put(w, new JSONArray().put(r2(Math.min(15, decayed(e, day) + add))).put(day).put((e == null ? 0 : e.optInt(2, 0)) + 1));
                        // nos outros ambientes esta palavra perde um pouco (assim as palavras de todos os dias não puxam para lado nenhum)
                        java.util.Iterator<String> vi = vl.keys();
                        while (vi.hasNext()) {
                            String ov = vi.next();
                            if (ov.equals(vibe)) continue;
                            JSONObject om = vl.optJSONObject(ov);
                            JSONArray oe = om == null ? null : om.optJSONArray(w);
                            if (oe == null) continue;
                            double wt = decayed(oe, day) - 0.3 * add;
                            if (wt <= 0.2) om.remove(w); else om.put(w, new JSONArray().put(r2(wt)).put(day).put(oe.optInt(2, 0)));
                        }
                    }
                    // no máximo 250 palavras por ambiente: saem as mais fracas
                    while (m.length() > 250) {
                        String min = null; double mv = Double.MAX_VALUE;
                        java.util.Iterator<String> it = m.keys();
                        while (it.hasNext()) { String kk = it.next(); double v = decayed(m.optJSONArray(kk), day); if (v < mv) { mv = v; min = kk; } }
                        m.remove(min);
                    }
                }
                save(c, data);
                return data.toString();
            } catch (JSONException e) { return null; }
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
                            s.remove("lrn"); s.remove("learn"); s.remove("cx"); s.remove("vb"); s.remove("vbd"); s.remove("vbn");
                            if (packId == null) { s.remove("uses"); s.remove("hrs"); s.remove("last"); }
                        }
                    }
                }
                if (packId == null && (word == null || word.length() == 0)) data.remove("vibeLrn");
                save(c, data);
                return data.toString();
            } catch (JSONException e) { return null; }
        }
    }

    /** Regista o que uma app aceita do teclado e como foi o último envio. */
    public static void logApp(Context c, String pkg, String mimes, String how) {
        synchronized (LOCK) {
            try {
                JSONObject data = load(c);
                JSONObject log = data.optJSONObject("appLog");
                if (log == null) { log = new JSONObject(); data.put("appLog", log); }
                JSONObject o = log.optJSONObject(pkg);
                if (o == null) o = new JSONObject();
                o.put("m", mimes); o.put("r", how); o.put("t", System.currentTimeMillis()); o.put("n", o.optInt("n", 0) + 1);
                log.put(pkg, o);
                if (log.length() > 40) {
                    String old = null; long ot = Long.MAX_VALUE;
                    java.util.Iterator<String> it = log.keys();
                    while (it.hasNext()) { String k = it.next(); long t = log.optJSONObject(k) != null ? log.optJSONObject(k).optLong("t") : 0; if (t < ot) { ot = t; old = k; } }
                    if (old != null) log.remove(old);
                }
                save(c, data);
            } catch (Exception ignored) {}
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
