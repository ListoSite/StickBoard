package com.josejunior.sticktag;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.UriMatcher;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.List;

/** O "ponto de contacto" que o WhatsApp lê para ir buscar os packs, os emojis e as imagens. */
public class StickerProvider extends ContentProvider {
    private static final int METADATA = 1, METADATA_ONE = 2, STICKERS = 3, ASSET = 4;
    private UriMatcher matcher;
    private String authority;

    @Override
    public boolean onCreate() {
        authority = Store.authority(getContext());
        matcher = new UriMatcher(UriMatcher.NO_MATCH);
        matcher.addURI(authority, "metadata", METADATA);
        matcher.addURI(authority, "metadata/*", METADATA_ONE);
        matcher.addURI(authority, "stickers/*", STICKERS);
        matcher.addURI(authority, "stickers_asset/*/*", ASSET);
        return true;
    }

    static final String[] PACK_COLS = {
            "sticker_pack_identifier", "sticker_pack_name", "sticker_pack_publisher", "sticker_pack_icon",
            "android_play_store_link", "ios_app_download_link", "sticker_pack_publisher_email",
            "sticker_pack_publisher_website", "sticker_pack_privacy_policy_website",
            "sticker_pack_license_agreement_website", "image_data_version", "whatsapp_will_not_cache_stickers",
            "animated_sticker_pack"};

    private void addPackRow(MatrixCursor c, JSONObject p) {
        c.addRow(new Object[]{p.optString("id"), p.optString("name"), p.optString("publisher"), p.optString("tray", "tray.png"),
                "", "", "", "", "", "", String.valueOf(p.optInt("version", 1)), 0, p.optBoolean("animated") ? 1 : 0});
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        int code = matcher.match(uri);
        JSONObject data = Store.load(getContext());
        if (code == METADATA || code == METADATA_ONE) {
            MatrixCursor c = new MatrixCursor(PACK_COLS);
            JSONArray a = data.optJSONArray("packs");
            String only = code == METADATA_ONE ? uri.getLastPathSegment() : null;
            if (a != null) for (int i = 0; i < a.length(); i++) {
                JSONObject p = a.optJSONObject(i);
                if (p == null || Store.isKb(p)) continue;
                if (only != null && !only.equals(p.optString("id"))) continue;
                addPackRow(c, p);
            }
            c.setNotificationUri(getContext().getContentResolver(), uri);
            return c;
        } else if (code == STICKERS) {
            MatrixCursor c = new MatrixCursor(new String[]{"sticker_file_name", "sticker_emoji", "sticker_accessibility_text"});
            JSONObject p = Store.findPack(data, uri.getLastPathSegment());
            if (p != null && !Store.isKb(p)) {
                JSONArray a = p.optJSONArray("stickers");
                // stickers sem emoji ficam de fora (o WhatsApp exige 1 a 3), desde que sobrem pelo menos 3
                int tagged = 0;
                if (a != null) for (int i = 0; i < a.length(); i++) {
                    if (a.optJSONObject(i).optBoolean("hidden")) continue;
                    JSONArray e = a.optJSONObject(i).optJSONArray("emojis");
                    if (e != null && e.length() > 0) tagged++;
                }
                boolean onlyTagged = tagged >= 3;
                if (a != null) for (int i = 0; i < a.length(); i++) {
                    JSONObject s = a.optJSONObject(i);
                    if (s.optBoolean("hidden")) continue; // só existem dentro de um especial
                    String em = Store.joinArr(s.optJSONArray("emojis"), ",");
                    if (onlyTagged && em.length() == 0) continue;
                    c.addRow(new Object[]{s.optString("f"), em, Store.a11yText(data, p, s)});
                }
            }
            c.setNotificationUri(getContext().getContentResolver(), uri);
            return c;
        }
        throw new IllegalArgumentException("URI desconhecido: " + uri);
    }

    private File resolve(Uri uri) {
        if (matcher.match(uri) != ASSET) return null;
        List<String> seg = uri.getPathSegments();
        if (seg.size() != 3) return null;
        String id = seg.get(1), name = seg.get(2);
        JSONObject p = Store.findPack(Store.load(getContext()), id);
        if (p == null) return null;
        if (!name.equals(p.optString("tray", "tray.png")) && Store.findSticker(p, name) == null) return null;
        File f = new File(Store.packDir(getContext(), id), name);
        return f.exists() ? f : null;
    }

    @Override
    public AssetFileDescriptor openAssetFile(Uri uri, String mode) throws FileNotFoundException {
        File f = resolve(uri);
        if (f == null) throw new FileNotFoundException(uri.toString());
        return new AssetFileDescriptor(ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY), 0, AssetFileDescriptor.UNKNOWN_LENGTH);
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = resolve(uri);
        if (f == null) throw new FileNotFoundException(uri.toString());
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) {
        switch (matcher.match(uri)) {
            case METADATA: return "vnd.android.cursor.dir/vnd." + authority + ".metadata";
            case METADATA_ONE: return "vnd.android.cursor.item/vnd." + authority + ".metadata";
            case STICKERS: return "vnd.android.cursor.dir/vnd." + authority + ".stickers";
            case ASSET: return uri.getLastPathSegment().endsWith(".png") ? "image/png" : "image/webp";
            default: throw new IllegalArgumentException("URI desconhecido: " + uri);
        }
    }

    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String s, String[] a) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { throw new UnsupportedOperationException(); }
}
