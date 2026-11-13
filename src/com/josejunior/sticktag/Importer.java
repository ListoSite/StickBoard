package com.josejunior.sticktag;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;

/** Converte imagens em stickers válidos para o WhatsApp (WebP 512x512). */
public final class Importer {
    private Importer() {}

    public static final class Result {
        public String file;           // nome do ficheiro guardado
        public JSONArray emojis = new JSONArray();  // emojis que já vinham no sticker
        public String error;          // motivo, se falhou
        public String note;           // aviso (ex.: animado convertido em estático)
        public String name;           // nome original
        public boolean animated;      // sticker animado
    }

    static int seq = 0;

    static synchronized String newName() {
        seq = (seq + 1) % 1000;
        return "s" + Long.toString(System.currentTimeMillis(), 36) + seq + ".webp";
    }

    public static Result importUri(Context c, Uri uri, String packId, boolean animatedPack, boolean fill) {
        return importUri(c, uri, packId, animatedPack, fill, false);
    }

    /** mixed = pack só do teclado: aceita estáticos e animados juntos. */
    public static Result importUri(Context c, Uri uri, String packId, boolean animatedPack, boolean fill, boolean mixed) {
        String name = displayName(c, uri);
        byte[] b;
        try {
            InputStream in = c.getContentResolver().openInputStream(uri);
            if (in == null) { Result r = new Result(); r.name = name; r.error = "não consegui abrir o ficheiro"; return r; }
            try { b = Store.readAll(in, 30 * 1024 * 1024); } finally { in.close(); }
        } catch (Exception e) {
            Result r = new Result(); r.name = name;
            r.error = "não consegui ler o ficheiro";
            return r;
        }
        return importBytes(c, b, name, packId, animatedPack, fill, mixed);
    }

    public static Result importBytes(Context c, byte[] b, String name, String packId, boolean animatedPack, boolean fill, boolean mixed) {
        Result r = new Result();
        r.name = name;
        Webp.Info info = Webp.info(b);
        // emojis que já vinham no sticker (metadados de stickers do WhatsApp)
        if (info != null) {
            try {
                String js = Webp.readExifJson(b);
                if (js != null) {
                    JSONArray e = new JSONObject(js).optJSONArray("emojis");
                    if (e != null) for (int i = 0; i < e.length() && r.emojis.length() < 3; i++) {
                        String s = e.optString(i, "").trim();
                        if (s.length() > 0) r.emojis.put(s);
                    }
                }
            } catch (Exception ignored) {}
        }
        byte[] out;
        if (mixed && info != null && info.animated && info.frames > 1 && b.length <= Store.ANIM_LIMIT) {
            // animado num pack do teclado: fica como está
            out = Webp.withExif(b, null);
            r.animated = true;
            if (info.width != 512 || info.height != 512) r.note = "animado com " + info.width + "×" + info.height + " (o WhatsApp prefere 512×512)";
        } else if (animatedPack) {
            if (info == null || !info.animated || info.frames < 2) {
                r.error = "não é um sticker animado (este pack só aceita WebP animados)";
                return r;
            }
            if (info.width != 512 || info.height != 512) {
                r.error = "sticker animado tem de ter 512×512 (tem " + info.width + "×" + info.height + ")";
                return r;
            }
            r.animated = true;
            if (info.totalMs > 10000) { r.error = "a animação passa dos 10 segundos"; return r; }
            if (info.minFrameMs > 0 && info.minFrameMs < 8) { r.error = "a animação tem frames demasiado rápidos"; return r; }
            out = Webp.withExif(b, null);
            if (out.length > Store.ANIM_LIMIT) { r.error = "passa dos 500 KB permitidos para animados"; return r; }
        } else {
            if (info != null && !info.animated && info.width == 512 && info.height == 512 && b.length <= 99000) {
                out = Webp.withExif(b, null);
            } else {
                Bitmap src = decode(b);
                if (src == null) {
                    r.error = info != null && info.animated
                            ? "sticker animado: põe-no num pack animado"
                            : "formato de imagem não suportado";
                    return r;
                }
                if (info != null && info.animated) r.note = "animado convertido em estático (1.º frame)";
                out = encode(src, fill);
                src.recycle();
                if (out == null) { r.error = "não consegui converter a imagem"; return r; }
            }
        }
        try {
            String fname = newName();
            Store.writeFile(new File(Store.packDir(c, packId), fname), out);
            r.file = fname;
        } catch (Exception e) {
            r.error = "não consegui guardar";
        }
        return r;
    }

    static Bitmap decode(byte[] b) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(b, 0, b.length, o);
        if (o.outWidth <= 0 || o.outHeight <= 0) return null;
        int sample = 1;
        while (o.outWidth / (sample * 2) >= 512 && o.outHeight / (sample * 2) >= 512) sample *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = sample;
        o2.inPreferredConfig = Bitmap.Config.ARGB_8888;
        try { return BitmapFactory.decodeByteArray(b, 0, b.length, o2); } catch (OutOfMemoryError e) { return null; }
    }

    /** Desenha a imagem num quadrado 512x512 (com transparência à volta ou a preencher) e comprime até caber em 100 KB. */
    static byte[] encode(Bitmap src, boolean fill) {
        Bitmap dst = Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(dst);
        float w = src.getWidth(), h = src.getHeight();
        float s = fill ? Math.max(512f / w, 512f / h) : Math.min(512f / w, 512f / h);
        float dw = w * s, dh = h * s;
        RectF rect = new RectF((512 - dw) / 2f, (512 - dh) / 2f, (512 + dw) / 2f, (512 + dh) / 2f);
        cv.drawBitmap(src, null, rect, new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG));
        byte[] best = null;
        int[] qs = {92, 85, 78, 70, 60, 50, 40, 30, 20};
        for (int q : qs) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            dst.compress(Bitmap.CompressFormat.WEBP, q, out);
            best = out.toByteArray();
            if (best.length <= 98000) break;
        }
        dst.recycle();
        if (best == null || best.length > 99000) return null;
        return best;
    }

    /** Identifica o ficheiro de origem (nome|tamanho) para não importar repetidos. */
    static String srcKey(Context c, Uri uri) {
        String n = null; long size = -1;
        try {
            android.database.Cursor cur = c.getContentResolver().query(uri, new String[]{"_display_name", "_size"}, null, null, null);
            if (cur != null) {
                try { if (cur.moveToFirst()) { n = cur.getString(0); size = cur.isNull(1) ? -1 : cur.getLong(1); } } finally { cur.close(); }
            }
        } catch (Exception ignored) {}
        return (n == null ? uri.getLastPathSegment() : n) + "|" + size;
    }

    static String displayName(Context c, Uri uri) {
        String n = uri.getLastPathSegment();
        try {
            android.database.Cursor cur = c.getContentResolver().query(uri, new String[]{"_display_name"}, null, null, null);
            if (cur != null) {
                try { if (cur.moveToFirst() && cur.getString(0) != null) n = cur.getString(0); } finally { cur.close(); }
            }
        } catch (Exception ignored) {}
        return n == null ? "imagem" : n;
    }
}
