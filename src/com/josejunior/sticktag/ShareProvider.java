package com.josejunior.sticktag;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.List;

/**
 * Entrega os ficheiros dos stickers às outras apps quando o teclado envia um sticker
 * (acesso só com autorização temporária dada pelo teclado).
 */
public class ShareProvider extends ContentProvider {

    public static String authority(android.content.Context c) { return c.getPackageName() + ".share"; }

    public static Uri uriFor(android.content.Context c, String packId, String file) {
        return new Uri.Builder().scheme("content").authority(authority(c)).appendPath(packId).appendPath(file).build();
    }

    public static Uri cacheUri(android.content.Context c, String name) {
        return new Uri.Builder().scheme("content").authority(authority(c)).appendPath("_c").appendPath(name).build();
    }

    public static File cacheDir(android.content.Context c) {
        File d = new File(c.getCacheDir(), "share");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    @Override public boolean onCreate() { return true; }

    File resolve(Uri uri) {
        List<String> seg = uri.getPathSegments();
        if (seg.size() != 2) return null;
        String a = seg.get(0), b = seg.get(1);
        if (a.contains("..") || b.contains("..") || a.contains("/") || b.contains("/")) return null;
        File f = a.equals("_c") ? new File(cacheDir(getContext()), b) : new File(Store.root(getContext()), "packs/" + a + "/" + b);
        return f.exists() ? f : null;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = resolve(uri);
        if (f == null) throw new FileNotFoundException(uri.toString());
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) {
        String p = uri.getLastPathSegment();
        if (p == null) return null;
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".gif")) return "image/gif";
        return "image/webp";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File f = resolve(uri);
        if (projection == null) projection = new String[]{"_display_name", "_size"};
        MatrixCursor c = new MatrixCursor(projection);
        if (f == null) return c;
        Object[] row = new Object[projection.length];
        for (int i = 0; i < projection.length; i++) {
            if ("_display_name".equals(projection[i])) row[i] = f.getName();
            else if ("_size".equals(projection[i])) row[i] = f.length();
        }
        c.addRow(row);
        return c;
    }

    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
