package com.josejunior.sticktag;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Parcelable;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class MainActivity extends Activity {
    static final String HOST = Web.HOST;
    static final int REQ_PICK = 11, REQ_WA = 12, REQ_EXPORT = 13;
    static final String WA = "com.whatsapp", WA_B = "com.whatsapp.w4b";

    WebView web;
    final Handler ui = new Handler(Looper.getMainLooper());
    final ExecutorService exec = Executors.newSingleThreadExecutor();
    String pickPack, waPack, exportText;
    final List<Uri> shared = java.util.Collections.synchronizedList(new ArrayList<Uri>());

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#0E1014"));
        w.setNavigationBarColor(Color.parseColor("#0E1014"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0E1014"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return Web.serve(MainActivity.this, url);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith(HOST)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        takeShared(getIntent());
        web.loadUrl(HOST + "index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (takeShared(intent)) js("onShared", String.valueOf(shared.size()));
    }

    boolean takeShared(Intent it) {
        if (it == null) return false;
        String a = it.getAction();
        boolean got = false;
        if (Intent.ACTION_SEND.equals(a)) {
            Parcelable p = it.getParcelableExtra(Intent.EXTRA_STREAM);
            if (p instanceof Uri) { shared.add((Uri) p); got = true; }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(a)) {
            ArrayList<Parcelable> l = it.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (l != null) for (Parcelable p : l) if (p instanceof Uri) { shared.add((Uri) p); got = true; }
        }
        return got;
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.App?App.back():false", new ValueCallback<String>() {
            @Override public void onReceiveValue(String v) {
                if (!"true".equals(v)) MainActivity.super.onBackPressed();
            }
        });
    }

    /** Chama uma função do lado da interface (JavaScript). */
    void js(final String fn, final String arg) {
        ui.post(new Runnable() {
            @Override public void run() {
                web.evaluateJavascript("window.App&&App." + fn + "(" + arg + ")", null);
            }
        });
    }

    static String err(String msg) {
        try { return new JSONObject().put("error", msg).toString(); } catch (JSONException e) { return "{}"; }
    }

    boolean installed(String pkg) {
        try {
            ApplicationInfo ai = getPackageManager().getApplicationInfo(pkg, 0);
            return ai != null && ai.enabled;
        } catch (PackageManager.NameNotFoundException e) { return false; }
    }

    /** -1 = não deu para saber, 0 = não adicionado, 1 = adicionado */
    int whitelisted(String pkg, String id) {
        if (!installed(pkg)) return -1;
        try {
            Uri u = new Uri.Builder().scheme("content").authority(pkg + ".provider.sticker_whitelist_check")
                    .appendPath("is_whitelisted").appendQueryParameter("authority", Store.authority(this))
                    .appendQueryParameter("identifier", id).build();
            Cursor c = getContentResolver().query(u, null, null, null, null);
            if (c == null) return -1;
            try {
                if (c.moveToFirst()) return c.getInt(c.getColumnIndexOrThrow("result")) == 1 ? 1 : 0;
            } finally { c.close(); }
        } catch (Exception ignored) {}
        return -1;
    }

    void importUris(final String packId, final List<Uri> uris) {
        exec.execute(new Runnable() {
            @Override public void run() {
                JSONArray added = new JSONArray(), errors = new JSONArray(), notes = new JSONArray();
                int done = 0;
                for (Uri u : uris) {
                    done++;
                    js("onImportProgress", done + "," + uris.size());
                    try {
                        JSONObject data = Store.load(MainActivity.this);
                        JSONObject p = Store.findPack(data, packId);
                        if (p == null) break;
                        if (p.optJSONArray("stickers").length() >= Store.maxStickers(p)) {
                            errors.put(new JSONObject().put("name", Importer.displayName(MainActivity.this, u))
                                    .put("error", Store.isKb(p) ? "o pack já está cheio (" + Store.maxStickers(p) + ")" : "o pack já tem 30 stickers (o máximo do WhatsApp)"));
                            continue;
                        }
                        Importer.Result r = Importer.importUri(MainActivity.this, u, packId, p.optBoolean("animated"), data.optBoolean("fill"));
                        if (r.error != null) {
                            errors.put(new JSONObject().put("name", r.name).put("error", r.error));
                            continue;
                        }
                        if (r.note != null) notes.put(r.name + ": " + r.note);
                        synchronized (Store.LOCK) {
                            data = Store.load(MainActivity.this);
                            p = Store.findPack(data, packId);
                            if (p == null) break;
                            JSONObject st = new JSONObject();
                            st.put("f", r.file);
                            st.put("emojis", r.emojis);
                            st.put("words", new JSONArray());
                            p.getJSONArray("stickers").put(st);
                            Store.sync(MainActivity.this, data, p);
                            Store.save(MainActivity.this, data);
                        }
                        added.put(r.file);
                    } catch (Exception e) {
                        try { errors.put(new JSONObject().put("name", "?").put("error", "erro inesperado")); } catch (JSONException ignored) {}
                    }
                }
                try {
                    JSONObject res = new JSONObject();
                    res.put("packId", packId); res.put("added", added); res.put("errors", errors); res.put("notes", notes);
                    js("onImported", res.toString());
                } catch (JSONException ignored) {}
            }
        });
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_PICK) {
            List<Uri> uris = new ArrayList<Uri>();
            if (res == RESULT_OK && data != null) {
                ClipData cd = data.getClipData();
                if (cd != null) for (int i = 0; i < cd.getItemCount(); i++) uris.add(cd.getItemAt(i).getUri());
                else if (data.getData() != null) uris.add(data.getData());
            }
            if (uris.isEmpty() || pickPack == null) { js("onImported", "{\"cancelled\":true}"); return; }
            importUris(pickPack, uris);
        } else if (req == REQ_WA) {
            JSONObject o = new JSONObject();
            try {
                o.put("packId", waPack);
                if (res == RESULT_OK) o.put("ok", true);
                else {
                    String ve = data != null ? data.getStringExtra("validation_error") : null;
                    if (ve != null) o.put("error", ve); else o.put("cancelled", true);
                }
            } catch (JSONException ignored) {}
            js("onWa", o.toString());
        } else if (req == REQ_EXPORT) {
            boolean ok = false;
            if (res == RESULT_OK && data != null && data.getData() != null && exportText != null) {
                try {
                    OutputStream os = getContentResolver().openOutputStream(data.getData());
                    ZipOutputStream z = new ZipOutputStream(os);
                    z.putNextEntry(new ZipEntry("dictionary.txt"));
                    z.write(exportText.getBytes(Webp.UTF8));
                    z.closeEntry();
                    z.close();
                    ok = true;
                } catch (Exception ignored) {}
            }
            js("onExported", ok ? "true" : "false");
        }
    }

    final class Bridge {
        @JavascriptInterface
        public String getData() { return Store.load(MainActivity.this).toString(); }

        @JavascriptInterface
        public String setOption(String key, boolean value) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    data.put(key, value);
                    if (key.equals("a11y")) {
                        JSONArray a = data.getJSONArray("packs");
                        for (int i = 0; i < a.length(); i++) Store.sync(MainActivity.this, data, a.getJSONObject(i));
                    }
                    Store.save(MainActivity.this, data);
                    return data.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        @JavascriptInterface
        public String createPack(String name, String publisher, boolean animated, String kind) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONArray a = data.getJSONArray("packs");
                    boolean kb = "kb".equals(kind);
                    int wa = 0;
                    for (int i = 0; i < a.length(); i++) if (!Store.isKb(a.getJSONObject(i))) wa++;
                    if (!kb && wa >= Store.MAX_PACKS) return err("O WhatsApp só aceita até 10 packs por app. Podes criar packs só para o teclado.");
                    JSONObject p = new JSONObject();
                    String id = "p" + Long.toString(System.currentTimeMillis(), 36);
                    p.put("id", id);
                    p.put("name", clip(name, "Os meus stickers"));
                    p.put("publisher", clip(publisher, "Eu"));
                    p.put("animated", animated);
                    p.put("kind", kb ? "kb" : "wa");
                    p.put("version", 1);
                    p.put("stickers", new JSONArray());
                    p.put("created", System.currentTimeMillis());
                    a.put(p);
                    Store.packDir(MainActivity.this, id);
                    Store.save(MainActivity.this, data);
                    return p.toString();
                } catch (JSONException e) { return err("erro a criar o pack"); }
            }
        }

        String clip(String s, String def) {
            s = s == null ? "" : s.trim();
            if (s.length() == 0) s = def;
            return s.length() > 128 ? s.substring(0, 128) : s;
        }

        @JavascriptInterface
        public String updatePack(String json) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject up = new JSONObject(json);
                    JSONObject data = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(data, up.getString("id"));
                    if (p == null) return err("pack não encontrado");
                    if (up.has("name")) p.put("name", clip(up.optString("name"), p.optString("name")));
                    if (up.has("publisher")) p.put("publisher", clip(up.optString("publisher"), p.optString("publisher")));
                    if (up.has("cover")) p.put("cover", up.optString("cover"));
                    JSONArray ups = up.optJSONArray("stickers");
                    if (ups != null) {
                        JSONArray old = p.getJSONArray("stickers");
                        JSONArray neu = new JSONArray();
                        List<String> seen = new ArrayList<String>();
                        for (int i = 0; i < ups.length(); i++) {
                            JSONObject u = ups.getJSONObject(i);
                            JSONObject s = Store.findSticker(p, u.optString("f"));
                            if (s == null || seen.contains(s.optString("f"))) continue;
                            seen.add(s.optString("f"));
                            JSONArray em = new JSONArray(), src = u.optJSONArray("emojis");
                            if (src != null) for (int k = 0; k < src.length() && em.length() < 3; k++) {
                                String e = src.optString(k, "").trim(); if (e.length() > 0) em.put(e);
                            }
                            JSONArray wd = new JSONArray(), ws = u.optJSONArray("words");
                            if (ws != null) for (int k = 0; k < ws.length(); k++) {
                                String e = ws.optString(k, "").trim(); if (e.length() > 0) wd.put(e);
                            }
                            s.put("emojis", em);
                            s.put("words", wd);
                            neu.put(s);
                        }
                        for (int i = 0; i < old.length(); i++) {
                            JSONObject s = old.getJSONObject(i);
                            if (!seen.contains(s.optString("f"))) neu.put(s);
                        }
                        p.put("stickers", neu);
                    }
                    Store.sync(MainActivity.this, data, p);
                    Store.save(MainActivity.this, data);
                    return p.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        @JavascriptInterface
        public String deleteSticker(String packId, String file) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(data, packId);
                    if (p == null) return err("pack não encontrado");
                    JSONArray a = p.getJSONArray("stickers"), n = new JSONArray();
                    for (int i = 0; i < a.length(); i++) if (!file.equals(a.getJSONObject(i).optString("f"))) n.put(a.get(i));
                    p.put("stickers", n);
                    new File(Store.packDir(MainActivity.this, packId), file).delete();
                    Store.sync(MainActivity.this, data, p);
                    Store.save(MainActivity.this, data);
                    return p.toString();
                } catch (JSONException e) { return err("erro a apagar"); }
            }
        }

        @JavascriptInterface
        public String moveSticker(String from, String file, String to) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONObject a = Store.findPack(data, from), b = Store.findPack(data, to);
                    if (a == null || b == null) return err("pack não encontrado");
                    if (a.optBoolean("animated") != b.optBoolean("animated")) return err("Não dá para misturar stickers animados com estáticos.");
                    if (b.getJSONArray("stickers").length() >= Store.maxStickers(b)) return err("Esse pack já está cheio.");
                    JSONObject s = Store.findSticker(a, file);
                    if (s == null) return err("sticker não encontrado");
                    File src = new File(Store.packDir(MainActivity.this, from), file);
                    File dst = new File(Store.packDir(MainActivity.this, to), file);
                    if (!src.renameTo(dst)) Store.writeFile(dst, Store.readFile(src));
                    src.delete();
                    JSONArray old = a.getJSONArray("stickers"), n = new JSONArray();
                    for (int i = 0; i < old.length(); i++) if (!file.equals(old.getJSONObject(i).optString("f"))) n.put(old.get(i));
                    a.put("stickers", n);
                    s.remove("exif");
                    b.getJSONArray("stickers").put(s);
                    Store.sync(MainActivity.this, data, a);
                    Store.sync(MainActivity.this, data, b);
                    Store.save(MainActivity.this, data);
                    return data.toString();
                } catch (Exception e) { return err("erro a mover"); }
            }
        }

        @JavascriptInterface
        public String deletePack(String packId) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONArray a = data.getJSONArray("packs"), n = new JSONArray();
                    for (int i = 0; i < a.length(); i++) if (!packId.equals(a.getJSONObject(i).optString("id"))) n.put(a.get(i));
                    data.put("packs", n);
                    Store.deleteDir(Store.packDir(MainActivity.this, packId));
                    Store.save(MainActivity.this, data);
                    return data.toString();
                } catch (JSONException e) { return err("erro a apagar"); }
            }
        }

        @JavascriptInterface
        public void pickImages(final String packId, final boolean fromWhatsApp) {
            ui.post(new Runnable() {
                @Override public void run() {
                    pickPack = packId;
                    Intent it = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("image/*");
                    it.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    if (fromWhatsApp && Build.VERSION.SDK_INT >= 26) {
                        it.putExtra("android.provider.extra.INITIAL_URI", Uri.parse(
                                "content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp%2FMedia%2FWhatsApp%20Stickers"));
                    }
                    try { startActivityForResult(it, REQ_PICK); }
                    catch (Exception e) { js("onImported", "{\"cancelled\":true}"); }
                }
            });
        }

        @JavascriptInterface
        public int sharedCount() { return shared.size(); }

        @JavascriptInterface
        public void importShared(String packId) {
            List<Uri> l;
            synchronized (shared) { l = new ArrayList<Uri>(shared); shared.clear(); }
            if (!l.isEmpty()) importUris(packId, l);
        }

        @JavascriptInterface
        public void clearShared() { shared.clear(); }

        @JavascriptInterface
        public String waStatus(String packId) {
            try {
                JSONObject o = new JSONObject();
                o.put("wa", installed(WA));
                o.put("w4b", installed(WA_B));
                o.put("addedWa", whitelisted(WA, packId));
                o.put("addedW4b", whitelisted(WA_B, packId));
                return o.toString();
            } catch (JSONException e) { return "{}"; }
        }

        @JavascriptInterface
        public String addToWhatsApp(final String packId) {
            JSONObject data = Store.load(MainActivity.this);
            final JSONObject p = Store.findPack(data, packId);
            if (p == null) return err("Pack não encontrado.");
            if (Store.isKb(p)) return err("Este pack é só para o teclado.");
            JSONArray a = p.optJSONArray("stickers");
            int n = a == null ? 0 : a.length();
            if (n < 3) return err("O WhatsApp pede pelo menos 3 stickers por pack (tens " + n + ").");
            if (n > 30) return err("O máximo são 30 stickers por pack.");
            int noEmoji = 0;
            for (int i = 0; i < n; i++) {
                JSONArray e = a.optJSONObject(i).optJSONArray("emojis");
                if (e == null || e.length() == 0) noEmoji++;
            }
            if (noEmoji > 0) return err(noEmoji == 1 ? "Há 1 sticker sem emoji. Cada sticker precisa de 1 a 3 emojis."
                    : "Há " + noEmoji + " stickers sem emoji. Cada sticker precisa de 1 a 3 emojis.");
            if (!new File(Store.packDir(MainActivity.this, packId), "tray.png").exists()) return err("Falta o ícone do pack. Escolhe uma capa.");
            final boolean hasWa = installed(WA), hasB = installed(WA_B);
            if (!hasWa && !hasB) return err("O WhatsApp não está instalado neste telemóvel.");
            ui.post(new Runnable() {
                @Override public void run() {
                    waPack = packId;
                    Intent it = new Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK");
                    it.putExtra("sticker_pack_id", packId);
                    it.putExtra("sticker_pack_authority", Store.authority(MainActivity.this));
                    it.putExtra("sticker_pack_name", p.optString("name"));
                    try {
                        if (hasWa && hasB) startActivityForResult(Intent.createChooser(it, "Adicionar a…"), REQ_WA);
                        else { it.setPackage(hasWa ? WA : WA_B); startActivityForResult(it, REQ_WA); }
                    } catch (Exception e) {
                        js("onWa", "{\"packId\":" + JSONObject.quote(packId) + ",\"error\":\"Não consegui abrir o WhatsApp.\"}");
                    }
                }
            });
            return "{\"ok\":true}";
        }

        @JavascriptInterface
        public void openWhatsApp() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = getPackageManager().getLaunchIntentForPackage(WA);
                    if (it == null) it = getPackageManager().getLaunchIntentForPackage(WA_B);
                    if (it != null) startActivity(it);
                }
            });
        }

        @JavascriptInterface
        public void exportZip(final String text, final String fileName) {
            ui.post(new Runnable() {
                @Override public void run() {
                    exportText = text;
                    Intent it = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("application/zip");
                    it.putExtra(Intent.EXTRA_TITLE, fileName);
                    try { startActivityForResult(it, REQ_EXPORT); } catch (Exception e) { js("onExported", "false"); }
                }
            });
        }

        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("StickTag", text));
        }

        @JavascriptInterface
        public void toast(final String msg) {
            ui.post(new Runnable() {
                @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show(); }
            });
        }

        @JavascriptInterface
        public String setText(String key, String value) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    data.put(key, value);
                    Store.save(MainActivity.this, data);
                    return data.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        @JavascriptInterface
        public String setEmojiWords(String emoji, String wordsJson) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONObject ew = data.optJSONObject("emojiWords");
                    if (ew == null) { ew = new JSONObject(); data.put("emojiWords", ew); }
                    if (wordsJson == null || wordsJson.length() == 0) ew.remove(emoji);
                    else ew.put(emoji, new JSONArray(wordsJson));
                    Store.save(MainActivity.this, data);
                    return data.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        @JavascriptInterface
        public String keyboardStatus() {
            try {
                android.view.inputmethod.InputMethodManager imm = (android.view.inputmethod.InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                boolean enabled = false;
                for (android.view.inputmethod.InputMethodInfo i : imm.getEnabledInputMethodList())
                    if (i.getPackageName().equals(getPackageName())) enabled = true;
                return new JSONObject().put("enabled", enabled).toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public void openKeyboardSettings() {
            ui.post(new Runnable() {
                @Override public void run() {
                    try { startActivity(new Intent(android.provider.Settings.ACTION_INPUT_METHOD_SETTINGS)); } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void showKeyboardPicker() {
            ui.post(new Runnable() {
                @Override public void run() {
                    android.view.inputmethod.InputMethodManager imm = (android.view.inputmethod.InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    imm.showInputMethodPicker();
                }
            });
        }

        @JavascriptInterface
        public String appVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
        }
    }
}
