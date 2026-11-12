package com.josejunior.sticktag;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Serve a interface (assets/www) e as imagens dos stickers às WebViews da app e do teclado. */
public final class Web {
    private Web() {}

    public static final String HOST = "https://app.local/";

    static final Map<String, String> MIME = new HashMap<String, String>();
    static {
        MIME.put("html", "text/html"); MIME.put("js", "application/javascript"); MIME.put("css", "text/css");
        MIME.put("json", "application/json"); MIME.put("png", "image/png"); MIME.put("webp", "image/webp");
        MIME.put("svg", "image/svg+xml");
    }

    static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    public static WebResourceResponse serve(Context c, String url) {
        if (!url.startsWith(HOST)) return null;
        String path = url.substring(HOST.length());
        int q = path.indexOf('?'); if (q >= 0) path = path.substring(0, q);
        int h = path.indexOf('#'); if (h >= 0) path = path.substring(0, h);
        path = Uri.decode(path);
        if (path.contains("..")) return notFound();
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            InputStream in;
            Map<String, String> headers = new HashMap<String, String>();
            if (path.startsWith("f/")) {
                File f = new File(Store.root(c), "packs/" + path.substring(2));
                if (!f.exists()) return notFound();
                in = new FileInputStream(f);
                headers.put("Cache-Control", "no-store");
            } else {
                in = c.getAssets().open("www/" + path);
            }
            return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, in);
        } catch (Exception e) {
            return notFound();
        }
    }
}
