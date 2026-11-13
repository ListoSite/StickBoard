package com.josejunior.sticktag;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.OutputStream;

/** Guarda um sticker na galeria (Imagens/StickTag), por exemplo para o adicionar no TikTok. */
public final class Gallery {
    private Gallery() {}

    /** Devolve null se correu bem, ou o motivo do erro. */
    public static String save(Context c, String packId, String file) {
        try {
            File f = new File(Store.root(c), "packs/" + packId + "/" + file);
            if (!f.exists()) return "ficheiro não encontrado";
            byte[] b = Store.readFile(f);
            Webp.Info info = Webp.info(b);
            boolean anim = info != null && info.animated;
            byte[] out;
            String mime, ext;
            if (anim) {
                out = Webp.withExif(b, null); mime = "image/webp"; ext = "webp";
            } else {
                Bitmap bm = BitmapFactory.decodeByteArray(b, 0, b.length);
                if (bm == null) return "não consegui ler o sticker";
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                bm.compress(Bitmap.CompressFormat.PNG, 100, o);
                bm.recycle();
                out = o.toByteArray(); mime = "image/png"; ext = "png";
            }
            String name = "StickTag_" + System.currentTimeMillis() + "." + ext;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = c.getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                v.put("relative_path", Environment.DIRECTORY_PICTURES + "/StickTag");
                v.put("is_pending", 1);
                Uri u = cr.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                if (u == null) return "a galeria recusou o ficheiro";
                OutputStream os = cr.openOutputStream(u);
                try { os.write(out); } finally { os.close(); }
                v.clear();
                v.put("is_pending", 0);
                cr.update(u, v, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "StickTag");
                if (!dir.exists() && !dir.mkdirs()) return "sem permissão para guardar (abre o StickTag e dá a permissão de armazenamento)";
                File dst = new File(dir, name);
                Store.writeFile(dst, out);
                MediaScannerConnection.scanFile(c, new String[]{dst.getAbsolutePath()}, new String[]{mime}, null);
            }
            return null;
        } catch (SecurityException e) {
            return "sem permissão para guardar na galeria";
        } catch (Exception e) {
            return "não consegui guardar";
        }
    }
}
