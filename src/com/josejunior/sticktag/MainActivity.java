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
    static final int REQ_PICK = 11, REQ_WA = 12, REQ_EXPORT = 13, REQ_BACKUP = 14, REQ_RESTORE = 15, REQ_CREATE = 16, REQ_FOLDER = 17, REQ_ANIM = 18, REQ_BKDIR = 19;
    static final String WA = "com.whatsapp", WA_B = "com.whatsapp.w4b";

    WebView web;
    final Handler ui = new Handler(Looper.getMainLooper());
    final ExecutorService exec = Executors.newSingleThreadExecutor();
    String pickPack, waPack, exportText;
    boolean pickHidden = false;
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
    protected void onResume() {
        super.onResume();
        AutoBackup.maybeRun(this);
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

    static boolean contains(JSONArray a, String v) {
        for (int i = 0; i < a.length(); i++) if (v.equals(a.optString(i))) return true;
        return false;
    }

    /** Troca as referências a um sticker apagado pelas do que ficou, nos especiais. */
    static void relinkSpecials(JSONObject data, String op, String of, String np, String nf) throws JSONException {
        JSONArray sp = data.optJSONArray("specials");
        if (sp != null) for (int i = 0; i < sp.length(); i++) relink(sp.get(i), op, of, np, nf);
        JSONObject eco = data.optJSONObject("eco");
        if (eco != null) relink(eco, op, of, np, nf);
    }

    static void relink(Object o, String op, String of, String np, String nf) throws JSONException {
        if (o instanceof JSONObject) {
            JSONObject j = (JSONObject) o;
            if (op.equals(j.optString("p", null)) && of.equals(j.optString("f", null))) { j.put("p", np); j.put("f", nf); }
            JSONArray ks = j.names();
            for (int i = 0; ks != null && i < ks.length(); i++) relink(j.get(ks.getString(i)), op, of, np, nf);
        } else if (o instanceof JSONArray) {
            JSONArray a = (JSONArray) o;
            for (int i = 0; i < a.length(); i++) relink(a.get(i), op, of, np, nf);
        }
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

    void importUris(final String packId, final List<Uri> uris) { importUris(packId, uris, false); }

    /** hidden = stickers que só existem dentro de um especial (não aparecem no pack nem nas sugestões). */
    void importUris(final String packId, final List<Uri> uris, final boolean hidden) {
        exec.execute(new Runnable() {
            @Override public void run() {
                JSONArray added = new JSONArray(), errors = new JSONArray(), notes = new JSONArray(), okUris = new JSONArray();
                List<Dupes.Item> app = null;
                java.util.HashMap<String, String> hashes = new java.util.HashMap<String, String>();
                // os novos stickers guardam-se aos lotes (bem mais rápido com centenas de ficheiros)
                List<JSONObject> pending = new ArrayList<JSONObject>();
                JSONObject d0 = Store.load(MainActivity.this);
                JSONObject p0 = Store.findPack(d0, packId);
                if (p0 == null) { js("onImported", "{\"cancelled\":true}"); return; }
                int count = Store.visibleCount(p0), max = Store.maxStickers(p0);
                boolean anim = p0.optBoolean("animated"), fill = d0.optBoolean("fill"), mixed = Store.isKb(p0) || hidden;
                boolean kbPack = Store.isKb(p0);
                long lastFlush = System.currentTimeMillis();
                int done = 0;
                for (Uri u : uris) {
                    done++;
                    js("onImportProgress", done + "," + uris.size());
                    try {
                        if (!hidden && count >= max) {
                            errors.put(new JSONObject().put("name", Importer.displayName(MainActivity.this, u))
                                    .put("error", kbPack ? "o pack já está cheio (" + max + ")" : "o pack já tem 30 stickers (o máximo do WhatsApp)"));
                            continue;
                        }
                        Importer.Result r = Importer.importUri(MainActivity.this, u, packId, anim, fill, mixed);
                        if (r.error != null) {
                            errors.put(new JSONObject().put("name", r.name).put("error", r.error));
                            continue;
                        }
                        if (r.note != null) notes.put(r.name + ": " + r.note);
                        JSONObject st = new JSONObject();
                        st.put("f", r.file);
                        st.put("emojis", r.emojis);
                        st.put("words", new JSONArray());
                        if (r.animated) st.put("anim", true);
                        st.put("src", Importer.srcKey(MainActivity.this, u));
                        if (hidden) st.put("hidden", true);
                        pending.add(st);
                        if (!hidden) count++;
                        added.put(r.file);
                        okUris.put(u.toString());
                        if (pending.size() >= 25 || System.currentTimeMillis() - lastFlush > 4000) {
                            flushStickers(packId, pending); lastFlush = System.currentTimeMillis();
                        }
                        if (hidden) continue;
                        // já tinhas um igual?
                        try {
                            if (app == null) app = Dupes.appItems(MainActivity.this, null);
                            String hs = Dupes.hashFile(new File(Store.packDir(MainActivity.this, packId), r.file));
                            if (hs != null) hashes.put(packId + "/" + r.file, hs);
                            Dupes.Item twin = hs == null ? null : Dupes.sameAs(app, hs, packId, r.file);
                            if (twin != null && notes.length() < 50) {
                                JSONObject tp = Store.findPack(d0, twin.pack);
                                notes.put(r.name + ": parece igual a um sticker que já tens" + (tp != null ? " (pack «" + tp.optString("name") + "»)" : "") + ". Vê em Packs › 👯 Repetidos.");
                            }
                            if (hs != null) { Dupes.Item me = new Dupes.Item(); me.pack = packId; me.file = r.file; me.h = Dupes.parse(hs); app.add(me); }
                        } catch (Exception ignored) {}
                    } catch (Exception e) {
                        try { errors.put(new JSONObject().put("name", "?").put("error", "erro inesperado")); } catch (JSONException ignored) {}
                    }
                }
                flushStickers(packId, pending);
                Dupes.rememberAll(MainActivity.this, hashes);
                try {
                    JSONObject res = new JSONObject();
                    res.put("packId", packId); res.put("added", added); res.put("errors", errors); res.put("notes", notes);
                    res.put("uris", okUris);
                    if (hidden) res.put("hidden", true);
                    js("onImported", res.toString());
                } catch (JSONException ignored) {}
            }
        });
    }

    /** Junta de uma vez os stickers que estão à espera ao pack (um só load/sync/save). */
    void flushStickers(String packId, List<JSONObject> pending) {
        if (pending.isEmpty()) return;
        synchronized (Store.LOCK) {
            try {
                JSONObject data = Store.load(this);
                JSONObject p = Store.findPack(data, packId);
                if (p != null) {
                    JSONArray a = p.getJSONArray("stickers");
                    for (JSONObject st : pending) a.put(st);
                    Store.sync(this, data, p);
                    Store.save(this, data);
                }
            } catch (JSONException ignored) {}
        }
        pending.clear();
    }

    /** Junta os ficheiros a packs novos, criados conforme for preciso. */
    void autoImport(String urisJson, String kind, String baseName) {
        boolean kb = !"wa".equals(kind);
        int added = 0, dup = 0, fail = 0, created = 0;
        String stop = null;
        JSONArray a;
        try { a = new JSONArray(urisJson); } catch (JSONException e) { a = new JSONArray(); }
        java.util.HashSet<String> have = new java.util.HashSet<String>();
        JSONArray inApp = new JSONArray(); // ficheiros da pasta que ficaram (ou já estavam) na app
        JSONObject d0 = Store.load(this);
        JSONArray ps0 = d0.optJSONArray("packs");
        if (ps0 != null) for (int i = 0; i < ps0.length(); i++) {
            JSONArray st = ps0.optJSONObject(i).optJSONArray("stickers");
            if (st != null) for (int k = 0; k < st.length(); k++) { String s = st.optJSONObject(k).optString("src", ""); if (s.length() > 0) have.add(s); }
        }
        boolean fill = d0.optBoolean("fill");
        String curStatic = null, curAnim = null;
        // contagens e lotes por pack, para guardar de 25 em 25 (e não a cada ficheiro)
        java.util.HashMap<String, Integer> counts = new java.util.HashMap<String, Integer>();
        java.util.HashMap<String, List<JSONObject>> pend = new java.util.HashMap<String, List<JSONObject>>();
        java.util.HashMap<String, String> hashes = new java.util.HashMap<String, String>();
        js("onImportProgress", "0," + a.length());
        List<Dupes.Item> app = Dupes.appItems(this, null);
        int sincePending = 0;
        for (int i = 0; i < a.length(); i++) {
            js("onImportProgress", (i + 1) + "," + a.length());
            try {
                Uri u = Uri.parse(a.getString(i));
                String src = Importer.srcKey(this, u);
                if (have.contains(src)) { dup++; inApp.put(u.toString()); continue; }
                InputStream in = getContentResolver().openInputStream(u);
                byte[] b = Store.readAll(in, 30 * 1024 * 1024);
                in.close();
                // igual (pela imagem) a um que já tens ou que acabou de entrar? não repete
                String hs = Dupes.hashBytes(b);
                if (hs != null && Dupes.sameAs(app, hs, "", "") != null) { dup++; have.add(src); inApp.put(u.toString()); continue; }
                Webp.Info info = Webp.info(b);
                boolean anim = info != null && info.animated && info.frames > 1;
                String want = kb || !anim ? curStatic : curAnim;
                int wc = want == null ? 0 : (counts.containsKey(want) ? counts.get(want) : 0);
                String target = want;
                boolean targetAnim;
                if (want == null || wc >= (kb ? Store.maxStickers(new JSONObject().put("kind", "kb")) : Store.MAX_STICKERS)) {
                    // pack novo
                    for (String id : new ArrayList<String>(pend.keySet())) flushStickers(id, pend.get(id));
                    synchronized (Store.LOCK) {
                        JSONObject d = Store.load(this);
                        JSONArray ps = d.getJSONArray("packs");
                        int wa = 0;
                        for (int k = 0; k < ps.length(); k++) if (!Store.isKb(ps.getJSONObject(k))) wa++;
                        if (!kb && wa >= Store.MAX_PACKS) { stop = "o WhatsApp só aceita 10 packs: o resto ficou de fora"; break; }
                        created++;
                        JSONObject p = new JSONObject();
                        String id = "p" + Long.toString(System.currentTimeMillis(), 36) + created;
                        p.put("id", id);
                        p.put("name", (baseName == null || baseName.length() == 0 ? "Importados" : baseName) + (kb ? "" : anim ? " (animados)" : "") + " " + created);
                        p.put("publisher", d.optString("lastPublisher", "Eu"));
                        p.put("animated", !kb && anim);
                        p.put("kind", kb ? "kb" : "wa");
                        p.put("version", 1);
                        p.put("stickers", new JSONArray());
                        p.put("created", System.currentTimeMillis());
                        ps.put(p);
                        Store.packDir(this, id);
                        Store.save(this, d);
                        target = id;
                        counts.put(id, 0);
                        if (kb || !anim) curStatic = id; else curAnim = id;
                    }
                }
                targetAnim = !kb && anim;
                Importer.Result r = Importer.importBytes(this, b, Importer.displayName(this, u), target, targetAnim, fill, kb);
                if (r.error != null) { fail++; continue; }
                JSONObject st = new JSONObject();
                st.put("f", r.file);
                st.put("emojis", r.emojis);
                st.put("words", new JSONArray());
                if (r.animated) st.put("anim", true);
                st.put("src", src);
                if (!pend.containsKey(target)) pend.put(target, new ArrayList<JSONObject>());
                pend.get(target).add(st);
                counts.put(target, (counts.containsKey(target) ? counts.get(target) : 0) + 1);
                if (++sincePending >= 25) { for (String id : new ArrayList<String>(pend.keySet())) flushStickers(id, pend.get(id)); sincePending = 0; }
                if (hs != null) {
                    String nh = Dupes.hashFile(new File(Store.packDir(this, target), r.file));
                    if (nh != null) hashes.put(target + "/" + r.file, nh);
                    Dupes.Item me = new Dupes.Item(); me.pack = target; me.file = r.file; me.h = Dupes.parse(nh != null ? nh : hs); app.add(me);
                }
                have.add(src);
                inApp.put(u.toString());
                added++;
            } catch (Exception e) { fail++; }
        }
        for (String id : new ArrayList<String>(pend.keySet())) flushStickers(id, pend.get(id));
        Dupes.rememberAll(this, hashes);
        try {
            JSONObject res = new JSONObject().put("auto", true).put("added", added).put("dup", dup).put("fail", fail).put("created", created).put("uris", inApp);
            if (stop != null) res.put("stop", stop);
            js("onAutoImported", res.toString());
        } catch (JSONException ignored) {}
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
            if (uris.isEmpty() || pickPack == null) { js("onImported", pickHidden ? "{\"cancelled\":true,\"hidden\":true}" : "{\"cancelled\":true}"); return; }
            importUris(pickPack, uris, pickHidden);
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
        } else if (req == REQ_BKDIR) {
            Uri tree = res == RESULT_OK && data != null ? data.getData() : null;
            if (tree == null) { js("onAutoBackup", "{\"cancelled\":true}"); return; }
            try { getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) {}
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(this);
                    JSONObject ab = d.optJSONObject("autoBackup");
                    if (ab == null) { ab = new JSONObject(); ab.put("every", 7); ab.put("keep", 4); }
                    ab.put("uri", tree.toString()); ab.put("on", true); ab.put("folder", Folders.name(this, tree)); ab.put("last", 0);
                    d.put("autoBackup", ab);
                    Store.save(this, d);
                } catch (JSONException ignored) {}
            }
            AutoBackup.schedule(this, true);
            exec.execute(new Runnable() { @Override public void run() { js("onAutoBackup", AutoBackup.runNow(MainActivity.this)); } });
        } else if (req == REQ_BACKUP || req == REQ_RESTORE) {
            final Uri u = (res == RESULT_OK && data != null) ? data.getData() : null;
            final boolean isRestore = req == REQ_RESTORE;
            if (u == null) { js("onBackup", "{\"cancelled\":true}"); return; }
            exec.execute(new Runnable() {
                @Override public void run() {
                    String r = isRestore ? Backup.restore(MainActivity.this, u) : Backup.export(MainActivity.this, u, new Dupes.Progress() { @Override public void on(int d, int t) { js("onBulkProgress", "{\"label\":\"A criar a cópia\",\"done\":" + d + ",\"total\":-1}"); } });
                    try { js("onBackup", new JSONObject(r).put("restore", isRestore).toString()); } catch (JSONException e) { js("onBackup", r); }
                }
            });
        } else if (req == REQ_FOLDER) {
            Uri tree = (res == RESULT_OK && data != null) ? data.getData() : null;
            if (tree == null) { js("onFolderAdded", "null"); return; }
            try {
                getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception e) {
                try { getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) {}
            }
            try {
                JSONObject f = new JSONObject().put("uri", tree.toString()).put("name", Folders.name(this, tree));
                synchronized (Store.LOCK) {
                    JSONObject d = Store.load(this);
                    JSONArray fs = d.optJSONArray("folders");
                    if (fs == null) { fs = new JSONArray(); d.put("folders", fs); }
                    boolean has = false;
                    for (int i = 0; i < fs.length(); i++) if (tree.toString().equals(fs.getJSONObject(i).optString("uri"))) has = true;
                    if (!has) fs.put(f);
                    Store.save(this, d);
                }
                js("onFolderAdded", f.toString());
            } catch (JSONException e) { js("onFolderAdded", "null"); }
        } else if (req == REQ_ANIM) {
            final Uri u = (res == RESULT_OK && data != null) ? data.getData() : null;
            if (u == null) { js("onAnimPicked", "null"); return; }
            exec.execute(new Runnable() {
                @Override public void run() {
                    try {
                        String mime = getContentResolver().getType(u);
                        if (mime == null) mime = "video/mp4";
                        String ext = mime.contains("gif") ? "gif" : mime.contains("webp") ? "webp" : mime.contains("webm") ? "webm" : mime.contains("quicktime") ? "mov" : mime.contains("3gp") ? "3gp" : "mp4";
                        File dir = new File(getCacheDir(), "create");
                        Store.deleteDir(dir);
                        dir.mkdirs();
                        String name = "in" + System.currentTimeMillis() + "." + ext;
                        InputStream in = getContentResolver().openInputStream(u);
                        java.io.FileOutputStream out = new java.io.FileOutputStream(new File(dir, name));
                        byte[] buf = new byte[65536]; int r; long total = 0;
                        while ((r = in.read(buf)) > 0) { out.write(buf, 0, r); total += r; if (total > 150L * 1024 * 1024) break; }
                        in.close(); out.close();
                        js("onAnimPicked", new JSONObject().put("url", "c/" + name).put("mime", mime).toString());
                    } catch (Exception e) { js("onAnimPicked", "null"); }
                }
            });
        } else if (req == REQ_CREATE) {
            final Uri u = (res == RESULT_OK && data != null) ? data.getData() : null;
            if (u == null) { js("onCreatePicked", "null"); return; }
            exec.execute(new Runnable() {
                @Override public void run() {
                    try {
                        InputStream in = getContentResolver().openInputStream(u);
                        byte[] b = Store.readAll(in, 30 * 1024 * 1024);
                        in.close();
                        android.graphics.Bitmap bm = Importer.decode(b);
                        if (bm == null) { js("onCreatePicked", "null"); return; }
                        int max = 1280, w = bm.getWidth(), h = bm.getHeight();
                        if (Math.max(w, h) > max) {
                            float s = max / (float) Math.max(w, h);
                            android.graphics.Bitmap sc = android.graphics.Bitmap.createScaledBitmap(bm, Math.round(w * s), Math.round(h * s), true);
                            bm.recycle(); bm = sc;
                        }
                        java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream();
                        bm.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, o);
                        bm.recycle();
                        String url = "data:image/png;base64," + android.util.Base64.encodeToString(o.toByteArray(), android.util.Base64.NO_WRAP);
                        js("onCreatePicked", JSONObject.quote(url));
                    } catch (Exception e) { js("onCreatePicked", "null"); }
                }
            });
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
                            if (u.optBoolean("fav")) s.put("fav", true); else s.remove("fav");
                            if (u.has("learn")) { JSONObject l = u.optJSONObject("learn"); if (l == null || l.length() == 0) s.remove("learn"); else s.put("learn", l); }
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
                    if (!Store.isKb(b)) {
                        boolean stAnim = Store.findSticker(a, file) != null && (Store.findSticker(a, file).optBoolean("anim") || a.optBoolean("animated"));
                        if (stAnim != b.optBoolean("animated")) return err("Os packs do WhatsApp não podem misturar animados com estáticos.");
                    }
                    if (Store.visibleCount(b) >= Store.maxStickers(b)) return err("Esse pack já está cheio.");
                    JSONObject s = Store.findSticker(a, file);
                    if (s == null) return err("sticker não encontrado");
                    File src = new File(Store.packDir(MainActivity.this, from), file);
                    File dst = new File(Store.packDir(MainActivity.this, to), file);
                    if (!src.renameTo(dst)) Store.writeFile(dst, Store.readFile(src));
                    src.delete();
                    JSONArray old = a.getJSONArray("stickers"), n = new JSONArray();
                    for (int i = 0; i < old.length(); i++) if (!file.equals(old.getJSONObject(i).optString("f"))) n.put(old.get(i));
                    a.put("stickers", n);
                    Store.forceExif(s);
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
                    pickHidden = false;
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

        /** Escolher imagens que ficam escondidas (só para usar em especiais). */
        @JavascriptInterface
        public void pickImagesHidden(final String packId) {
            ui.post(new Runnable() {
                @Override public void run() {
                    pickPack = packId;
                    pickHidden = true;
                    Intent it = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("image/*");
                    it.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    try { startActivityForResult(it, REQ_PICK); }
                    catch (Exception e) { js("onImported", "{\"cancelled\":true,\"hidden\":true}"); }
                }
            });
        }

        @JavascriptInterface
        public void importDocsHidden(String packId, String urisJson) {
            List<Uri> l = new ArrayList<Uri>();
            try {
                JSONArray a = new JSONArray(urisJson);
                for (int i = 0; i < a.length(); i++) { Uri u = Uri.parse(a.getString(i)); if (Folders.allowed(MainActivity.this, u)) l.add(u); }
            } catch (JSONException ignored) {}
            if (l.isEmpty()) { js("onImported", "{\"cancelled\":true,\"hidden\":true}"); return; }
            importUris(packId, l, true);
        }

        /** Emojis e palavras de um sticker de uma vez (usado no criador). */
        @JavascriptInterface
        public String setStickerTags(String packId, String file, String emojisJson, String wordsJson) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(d, packId);
                    JSONObject st = p == null ? null : Store.findSticker(p, file);
                    if (st == null) return err("sticker não encontrado");
                    JSONArray em = new JSONArray(emojisJson), e2 = new JSONArray();
                    for (int i = 0; i < em.length() && e2.length() < 3; i++) if (em.optString(i).trim().length() > 0) e2.put(em.optString(i).trim());
                    st.put("emojis", e2);
                    if (wordsJson != null) st.put("words", new JSONArray(wordsJson));
                    Store.sync(MainActivity.this, d, p);
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
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
        public String bubbleStatus() {
            try {
                String en = android.provider.Settings.Secure.getString(getContentResolver(), "enabled_accessibility_services");
                String me = new android.content.ComponentName(MainActivity.this, BubbleService.class).flattenToString();
                String meShort = new android.content.ComponentName(MainActivity.this, BubbleService.class).flattenToShortString();
                boolean on = en != null && (en.contains(me) || en.contains(meShort));
                return new JSONObject().put("enabled", on).put("sdk", Build.VERSION.SDK_INT).toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public void openAccessibilitySettings() {
            ui.post(new Runnable() {
                @Override public void run() {
                    try { startActivity(new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS)); } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void openAppInfo() {
            ui.post(new Runnable() {
                @Override public void run() {
                    try {
                        Intent it = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        it.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(it);
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void pickFolder() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    it.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    if (Build.VERSION.SDK_INT >= 26) it.putExtra("android.provider.extra.INITIAL_URI", Uri.parse(
                            "content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp%2FMedia%2FWhatsApp%20Stickers"));
                    try { startActivityForResult(it, REQ_FOLDER); } catch (Exception e) { js("onFolderAdded", "null"); }
                }
            });
        }

        /** Procura stickers repetidos em todos os packs (em segundo plano). */
        @JavascriptInterface
        public void findDupes() {
            exec.execute(new Runnable() {
                @Override public void run() {
                    List<Dupes.Item> items = Dupes.appItems(MainActivity.this, new Dupes.Progress() {
                        @Override public void on(int d, int t) { js("onDupesProgress", d + "," + t); }
                    });
                    try { js("onDupes", new JSONObject().put("groups", Dupes.groups(items, null, new Dupes.Progress() { @Override public void on(int d, int t) { js("onBulkProgress", "{\"label\":\"A comparar\",\"done\":" + d + ",\"total\":" + t + "}"); } })).put("total", items.size()).toString()); }
                    catch (JSONException e) { js("onDupes", "{\"groups\":[]}"); }
                }
            });
        }

        /** Repetidos dentro de uma pasta do telemóvel e em relação aos stickers da app. */
        @JavascriptInterface
        public void findFolderDupes(final String filesJson) {
            exec.execute(new Runnable() {
                @Override public void run() {
                    List<Dupes.Item> items = new ArrayList<Dupes.Item>();
                    java.util.HashSet<Dupes.Item> docs = new java.util.HashSet<Dupes.Item>();
                    try {
                        JSONArray a = new JSONArray(filesJson);
                        JSONObject cache = Dupes.loadCache(MainActivity.this);
                        boolean changed = false;
                        for (int i = 0; i < a.length(); i++) {
                            JSONObject o = a.getJSONObject(i);
                            String uri = o.getString("uri");
                            String key = "doc|" + uri + "|" + o.optLong("size") + "|" + o.optLong("time");
                            String hs = cache.optString(key, null);
                            if (hs == null) {
                                Uri u = Uri.parse(uri);
                                if (!Folders.allowed(MainActivity.this, u)) continue;
                                hs = Dupes.hashUri(MainActivity.this, u);
                                if (hs != null) { cache.put(key, hs); changed = true; }
                            }
                            if ((i + 1) % 8 == 0 || i == a.length() - 1) js("onDupesProgress", (i + 1) + "," + a.length());
                            if (hs == null) continue;
                            Dupes.Item it = new Dupes.Item(); it.uri = uri; it.h = Dupes.parse(hs);
                            items.add(it); docs.add(it);
                        }
                        if (changed) Dupes.saveCache(MainActivity.this, cache);
                    } catch (JSONException ignored) {}
                    items.addAll(Dupes.appItems(MainActivity.this, null));
                    try { js("onDupes", new JSONObject().put("folder", true).put("groups", Dupes.groups(items, docs, new Dupes.Progress() { @Override public void on(int d, int t) { js("onBulkProgress", "{\"label\":\"A comparar\",\"done\":" + d + ",\"total\":" + t + "}"); } })).put("total", docs.size()).toString()); }
                    catch (JSONException e) { js("onDupes", "{\"groups\":[]}"); }
                }
            });
        }

        /**
         * Fica com um sticker e apaga os repetidos, juntando-lhe os emojis, as palavras e o que aprendeu.
         * Os especiais que usavam os apagados passam a usar o que fica.
         */
        @JavascriptInterface
        public String mergeStickers(String keepPack, String keepFile, String othersJson) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONObject kp = Store.findPack(data, keepPack);
                    JSONObject keep = kp == null ? null : Store.findSticker(kp, keepFile);
                    if (keep == null) return err("sticker não encontrado");
                    JSONArray others = new JSONArray(othersJson);
                    java.util.HashSet<String> touched = new java.util.HashSet<String>();
                    touched.add(keepPack);
                    JSONArray em = keep.optJSONArray("emojis"); if (em == null) { em = new JSONArray(); keep.put("emojis", em); }
                    JSONArray wd = keep.optJSONArray("words"); if (wd == null) { wd = new JSONArray(); keep.put("words", wd); }
                    for (int i = 0; i < others.length(); i++) {
                        JSONObject o = others.getJSONObject(i);
                        String op = o.optString("p"), of = o.optString("f");
                        if (op.equals(keepPack) && of.equals(keepFile)) continue;
                        JSONObject p = Store.findPack(data, op);
                        JSONObject s = p == null ? null : Store.findSticker(p, of);
                        if (s == null) continue;
                        JSONArray e2 = s.optJSONArray("emojis");
                        for (int k = 0; e2 != null && k < e2.length() && em.length() < 3; k++) if (!contains(em, e2.optString(k))) em.put(e2.optString(k));
                        JSONArray w2 = s.optJSONArray("words");
                        for (int k = 0; w2 != null && k < w2.length(); k++) if (!contains(wd, w2.optString(k))) wd.put(w2.optString(k));
                        if (s.optBoolean("fav")) keep.put("fav", true);
                        JSONObject l2 = s.optJSONObject("learn");
                        if (l2 != null) {
                            JSONObject l = keep.optJSONObject("learn"); if (l == null) { l = new JSONObject(); keep.put("learn", l); }
                            JSONArray ks = l2.names();
                            for (int k = 0; ks != null && k < ks.length(); k++) { String w = ks.optString(k); l.put(w, l.optInt(w, 0) + l2.optInt(w, 0)); }
                        }
                        if (!keep.has("secretName") && s.has("secretName")) { keep.put("secretName", s.optString("secretName")); keep.put("secretPub", s.optString("secretPub")); }
                        // tira do pack e apaga o ficheiro
                        JSONArray a = p.getJSONArray("stickers"), n = new JSONArray();
                        for (int k = 0; k < a.length(); k++) if (!of.equals(a.getJSONObject(k).optString("f"))) n.put(a.get(k));
                        p.put("stickers", n);
                        new File(Store.packDir(MainActivity.this, op), of).delete();
                        touched.add(op);
                        relinkSpecials(data, op, of, keepPack, keepFile);
                    }
                    Store.forceExif(keep);
                    for (String id : touched) { JSONObject p = Store.findPack(data, id); if (p != null) Store.sync(MainActivity.this, data, p); }
                    Store.save(MainActivity.this, data);
                    return data.toString();
                } catch (JSONException e) { return err("erro a juntar"); }
            }
        }

        /** O que o motor dos especiais viu ultimamente (para perceber falhas). */
        @JavascriptInterface
        public String specialLog() { return Specials.logJson(); }

        /** Marca (ou desmarca) um pack inteiro, ex.: +18. */
        @JavascriptInterface
        public String setPackFlag(String packId, String key, boolean value) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(d, packId);
                    if (p == null) return err("pack não encontrado");
                    if (value) p.put(key, true); else p.remove(key);
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        /** Marca (ou desmarca) um sticker, ex.: +18. */
        @JavascriptInterface
        public String setStickerFlag(String packId, String file, String key, boolean value) {
            String d = Store.setFlag(MainActivity.this, packId, file, key, value);
            return d == null ? err("sticker não encontrado") : d;
        }

        /** Troca a imagem de um sticker animado (ex.: depois de o suavizar), mantendo as tags. */
        @JavascriptInterface
        public String replaceSticker(String packId, String file, String dataUrl) {
            try {
                byte[] b = android.util.Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), android.util.Base64.DEFAULT);
                Webp.Info wi = Webp.info(b);
                if (wi == null || !wi.animated || wi.frames < 2) return err("não é um sticker animado");
                if (wi.totalMs > 10000) return err("a animação passa dos 10 segundos");
                if (wi.minFrameMs > 0 && wi.minFrameMs < 8) return err("a animação tem frames demasiado rápidos");
                if (b.length > Store.ANIM_LIMIT) return err("ficou maior do que 500 KB");
                synchronized (Store.LOCK) {
                    JSONObject data = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(data, packId);
                    JSONObject st = p == null ? null : Store.findSticker(p, file);
                    if (st == null) return err("sticker não encontrado");
                    Store.writeFile(new File(Store.packDir(MainActivity.this, packId), file), b);
                    Store.forceExif(st);
                    st.put("anim", true);
                    p.put("version", p.optInt("version", 0) + 1);
                    if (file.equals(p.optString("trayFrom"))) p.remove("trayFrom");
                    Store.sync(MainActivity.this, data, p);
                    Store.save(MainActivity.this, data);
                    JSONObject cache = Dupes.loadCache(MainActivity.this);
                    cache.remove(packId + "/" + file);
                    Dupes.saveCache(MainActivity.this, cache);
                    return data.toString();
                }
            } catch (Exception e) { return err("não consegui guardar"); }
        }

        /* ---------- operações grandes em segundo plano, com progresso ---------- */

        /** Lista uma pasta sem bloquear o ecrã (com milhares de ficheiros pode demorar). */
        @JavascriptInterface
        public void listFolderAsync(final String uri) {
            new Thread(new Runnable() {
                @Override public void run() {
                    Uri tree = Uri.parse(uri);
                    String r = !Folders.hasAccess(MainActivity.this, tree)
                            ? "{\"ok\":false,\"error\":\"o acesso a esta pasta expirou: escolhe-a outra vez\"}"
                            : Folders.list(MainActivity.this, tree);
                    js("onFolderList", r);
                }
            }).start();
        }

        void progress(String label, int done, int total) {
            try { js("onBulkProgress", new JSONObject().put("label", label).put("done", done).put("total", total).toString()); } catch (JSONException ignored) {}
        }

        void bulkDone(JSONObject r) { js("onBulkDone", r.toString()); }

        /** Apaga muitos ficheiros de uma pasta, a mostrar o progresso. */
        @JavascriptInterface
        public void deleteDocsAsync(final String urisJson) {
            new Thread(new Runnable() {
                @Override public void run() {
                    int n = 0, t = 0;
                    try {
                        JSONArray a = new JSONArray(urisJson);
                        t = a.length();
                        long last = 0;
                        for (int i = 0; i < a.length(); i++) {
                            Uri u = Uri.parse(a.getString(i));
                            if (Folders.allowed(MainActivity.this, u) && Folders.delete(MainActivity.this, u)) n++;
                            if (System.currentTimeMillis() - last > 150 || i == a.length() - 1) { progress("A apagar", i + 1, t); last = System.currentTimeMillis(); }
                        }
                    } catch (JSONException ignored) {}
                    try { bulkDone(new JSONObject().put("kind", "deleteDocs").put("n", n).put("total", t)); } catch (JSONException ignored) {}
                }
            }).start();
        }

        /** Apaga muitos stickers de um pack de uma vez (um só save). */
        @JavascriptInterface
        public void deleteStickersAsync(final String packId, final String filesJson) {
            exec.execute(new Runnable() {
                @Override public void run() {
                    int n = 0, t = 0;
                    synchronized (Store.LOCK) {
                        try {
                            JSONArray fs = new JSONArray(filesJson);
                            t = fs.length();
                            java.util.HashSet<String> del = new java.util.HashSet<String>();
                            for (int i = 0; i < fs.length(); i++) del.add(fs.getString(i));
                            JSONObject data = Store.load(MainActivity.this);
                            JSONObject p = Store.findPack(data, packId);
                            if (p != null) {
                                JSONArray a = p.getJSONArray("stickers"), keep = new JSONArray();
                                File dir = Store.packDir(MainActivity.this, packId);
                                long last = 0;
                                for (int i = 0; i < a.length(); i++) {
                                    JSONObject st = a.getJSONObject(i);
                                    if (del.contains(st.optString("f"))) {
                                        new File(dir, st.optString("f")).delete(); n++;
                                        if (System.currentTimeMillis() - last > 150) { progress("A apagar", n, t); last = System.currentTimeMillis(); }
                                    } else keep.put(st);
                                }
                                p.put("stickers", keep);
                                progress("A guardar", t, t);
                                Store.sync(MainActivity.this, data, p);
                                Store.save(MainActivity.this, data);
                            }
                        } catch (JSONException ignored) {}
                    }
                    try { bulkDone(new JSONObject().put("kind", "deleteStickers").put("n", n).put("total", t)); } catch (JSONException ignored) {}
                }
            });
        }

        /** Move muitos stickers para outro pack de uma vez. */
        @JavascriptInterface
        public void moveStickersAsync(final String from, final String filesJson, final String to) {
            exec.execute(new Runnable() {
                @Override public void run() {
                    int n = 0, t = 0;
                    String error = null;
                    synchronized (Store.LOCK) {
                        try {
                            JSONArray fs = new JSONArray(filesJson);
                            t = fs.length();
                            JSONObject data = Store.load(MainActivity.this);
                            JSONObject a = Store.findPack(data, from), b = Store.findPack(data, to);
                            if (a == null || b == null) error = "pack não encontrado";
                            else {
                                java.util.HashSet<String> mv = new java.util.HashSet<String>();
                                for (int i = 0; i < fs.length(); i++) mv.add(fs.getString(i));
                                JSONArray old = a.getJSONArray("stickers"), keep = new JSONArray();
                                int room = Store.maxStickers(b) - Store.visibleCount(b);
                                long last = 0;
                                for (int i = 0; i < old.length(); i++) {
                                    JSONObject s = old.getJSONObject(i);
                                    String f = s.optString("f");
                                    boolean go = mv.contains(f);
                                    if (go && !Store.isKb(b)) {
                                        boolean stAnim = s.optBoolean("anim") || a.optBoolean("animated");
                                        if (stAnim != b.optBoolean("animated")) { go = false; error = "Os packs do WhatsApp não podem misturar animados com estáticos."; }
                                    }
                                    if (go && !s.optBoolean("hidden") && room <= 0) { go = false; error = "O pack de destino ficou cheio."; }
                                    if (!go) { keep.put(s); continue; }
                                    File src = new File(Store.packDir(MainActivity.this, from), f);
                                    File dst = new File(Store.packDir(MainActivity.this, to), f);
                                    if (!src.renameTo(dst)) { Store.writeFile(dst, Store.readFile(src)); src.delete(); }
                                    Store.forceExif(s);
                                    b.getJSONArray("stickers").put(s);
                                    if (!s.optBoolean("hidden")) room--;
                                    n++;
                                    relinkSpecials(data, from, f, to, f);
                                    if (System.currentTimeMillis() - last > 150) { progress("A mover", n, t); last = System.currentTimeMillis(); }
                                }
                                a.put("stickers", keep);
                                progress("A guardar", t, t);
                                Store.sync(MainActivity.this, data, a);
                                Store.sync(MainActivity.this, data, b);
                                Store.save(MainActivity.this, data);
                            }
                        } catch (Exception e) { error = "erro a mover"; }
                    }
                    try {
                        JSONObject r = new JSONObject().put("kind", "moveStickers").put("n", n).put("total", t);
                        if (error != null) r.put("error", error);
                        bulkDone(r);
                    } catch (JSONException ignored) {}
                }
            });
        }

        /** Apaga um pack inteiro (pode ter milhares de ficheiros). */
        @JavascriptInterface
        public void deletePackAsync(final String packId) {
            exec.execute(new Runnable() {
                @Override public void run() {
                    progress("A apagar o pack", 0, 1);
                    deletePack(packId);
                    try { bulkDone(new JSONObject().put("kind", "deletePack").put("n", 1)); } catch (JSONException ignored) {}
                }
            });
        }

        /** Cópia automática: escolher a pasta. */
        @JavascriptInterface
        public void pickBackupFolder() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                    try { startActivityForResult(it, REQ_BKDIR); } catch (Exception e) { js("onAutoBackup", "{\"cancelled\":true}"); }
                }
            });
        }

        /** Cópia automática: ligar/desligar, de quantos em quantos dias e quantas guardar. */
        @JavascriptInterface
        public String setAutoBackup(boolean on, int every, int keep) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONObject ab = d.optJSONObject("autoBackup");
                    if (ab == null) ab = new JSONObject();
                    ab.put("on", on); ab.put("every", Math.max(1, every)); ab.put("keep", Math.max(1, keep));
                    d.put("autoBackup", ab);
                    Store.save(MainActivity.this, d);
                    AutoBackup.schedule(MainActivity.this, on && ab.optString("uri").length() > 0);
                    return d.toString();
                } catch (JSONException e) { return err("erro"); }
            }
        }

        @JavascriptInterface
        public void backupNow() {
            exec.execute(new Runnable() { @Override public void run() { js("onAutoBackup", AutoBackup.runNow(MainActivity.this)); } });
        }

        /** Secções de um pack (ordem e nomes). */
        @JavascriptInterface
        public String setSections(String packId, String sectionsJson) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(d, packId);
                    if (p == null) return err("pack não encontrado");
                    JSONArray sec = new JSONArray(sectionsJson);
                    p.put("sections", sec);
                    // os stickers de secções que deixaram de existir ficam sem secção
                    java.util.HashSet<String> ok = new java.util.HashSet<String>();
                    for (int i = 0; i < sec.length(); i++) ok.add(sec.optString(i));
                    JSONArray a = p.getJSONArray("stickers");
                    for (int i = 0; i < a.length(); i++) { JSONObject st = a.getJSONObject(i); if (st.has("section") && !ok.contains(st.optString("section"))) st.remove("section"); }
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro"); }
            }
        }

        /** Põe vários stickers numa secção ("" = sem secção). */
        @JavascriptInterface
        public String setStickerSection(String packId, String filesJson, String section) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(d, packId);
                    if (p == null) return err("pack não encontrado");
                    JSONArray f = new JSONArray(filesJson);
                    for (int i = 0; i < f.length(); i++) {
                        JSONObject st = Store.findSticker(p, f.optString(i));
                        if (st == null) continue;
                        if (section == null || section.length() == 0) st.remove("section"); else st.put("section", section);
                    }
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro"); }
            }
        }

        /** Guarda o Eco (respostas automáticas a palavras). */
        @JavascriptInterface
        public String setEco(String json) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    d.put("eco", new JSONObject(json));
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        /** Guarda a lista de stickers especiais. */
        @JavascriptInterface
        public String setSpecials(String json) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    d.put("specials", new JSONArray(json));
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        /** Mensagem escondida de um sticker (aparece a quem tocar nele no WhatsApp). */
        @JavascriptInterface
        public String setSecret(String packId, String file, String name, String pub) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONObject p = Store.findPack(d, packId);
                    JSONObject st = p == null ? null : Store.findSticker(p, file);
                    if (st == null) return err("sticker não encontrado");
                    name = name == null ? "" : name.trim(); pub = pub == null ? "" : pub.trim();
                    if (name.length() > 120) name = name.substring(0, 120);
                    if (pub.length() > 120) pub = pub.substring(0, 120);
                    if (name.length() == 0 && pub.length() == 0) { st.remove("secretName"); st.remove("secretPub"); }
                    else { st.put("secretName", name.length() > 0 ? name : "🤫"); st.put("secretPub", pub); }
                    Store.sync(MainActivity.this, d, p);
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro a guardar"); }
            }
        }

        @JavascriptInterface
        public String listFolder(String uri) {
            Uri tree = Uri.parse(uri);
            if (!Folders.hasAccess(MainActivity.this, tree)) return "{\"ok\":false,\"error\":\"o acesso a esta pasta expirou: escolhe-a outra vez\"}";
            return Folders.list(MainActivity.this, tree);
        }

        @JavascriptInterface
        public String removeFolder(String uri) {
            try { getContentResolver().releasePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) {}
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(MainActivity.this);
                    JSONArray fs = d.optJSONArray("folders"), n = new JSONArray();
                    if (fs != null) for (int i = 0; i < fs.length(); i++) if (!uri.equals(fs.getJSONObject(i).optString("uri"))) n.put(fs.get(i));
                    d.put("folders", n);
                    Store.save(MainActivity.this, d);
                    return d.toString();
                } catch (JSONException e) { return err("erro"); }
            }
        }

        /** Apaga de vez ficheiros da pasta. Devolve quantos foram apagados. */
        @JavascriptInterface
        public int deleteDocs(String urisJson) {
            int n = 0;
            try {
                JSONArray a = new JSONArray(urisJson);
                for (int i = 0; i < a.length(); i++) {
                    Uri u = Uri.parse(a.getString(i));
                    if (Folders.allowed(MainActivity.this, u) && Folders.delete(MainActivity.this, u)) n++;
                }
            } catch (JSONException ignored) {}
            return n;
        }

        @JavascriptInterface
        public void importDocs(String packId, String urisJson) {
            List<Uri> l = new ArrayList<Uri>();
            try {
                JSONArray a = new JSONArray(urisJson);
                for (int i = 0; i < a.length(); i++) l.add(Uri.parse(a.getString(i)));
            } catch (JSONException ignored) {}
            if (!l.isEmpty()) importUris(packId, l);
        }

        /** Importa vários ficheiros e cria os packs sozinho (sem repetidos). */
        @JavascriptInterface
        public void importAuto(final String urisJson, final String kind, final String baseName) {
            exec.execute(new Runnable() {
                @Override public void run() { autoImport(urisJson, kind, baseName); }
            });
        }

        @JavascriptInterface
        public String saveToGallery(String packId, String file) {
            String e = Gallery.save(MainActivity.this, packId, file);
            return e == null ? "{\"ok\":true}" : err(e);
        }

        @JavascriptInterface
        public void exportBackup() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("application/zip");
                    it.putExtra(Intent.EXTRA_TITLE, "StickTag-copia-" + new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date()) + ".zip");
                    try { startActivityForResult(it, REQ_BACKUP); } catch (Exception e) { js("onBackup", "{\"cancelled\":true}"); }
                }
            });
        }

        @JavascriptInterface
        public void importBackup() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("*/*");
                    it.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/zip", "application/x-zip-compressed", "application/octet-stream"});
                    try { startActivityForResult(it, REQ_RESTORE); } catch (Exception e) { js("onBackup", "{\"cancelled\":true}"); }
                }
            });
        }

        @JavascriptInterface
        public void pickMediaForAnim() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(Intent.ACTION_GET_CONTENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("*/*");
                    it.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"video/*", "image/gif", "image/webp"});
                    try { startActivityForResult(it, REQ_ANIM); } catch (Exception e) { js("onAnimPicked", "null"); }
                }
            });
        }

        @JavascriptInterface
        public void pickForCreate() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(Intent.ACTION_GET_CONTENT);
                    it.addCategory(Intent.CATEGORY_OPENABLE);
                    it.setType("image/*");
                    try { startActivityForResult(it, REQ_CREATE); } catch (Exception e) { js("onCreatePicked", "null"); }
                }
            });
        }

        /** Recebe o sticker criado no editor (PNG em base64) e junta-o ao pack. */
        @JavascriptInterface
        public String saveCreated(String packId, String dataUrl, String wordsJson) {
            try {
                String b64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
                byte[] png = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
                JSONObject data = Store.load(MainActivity.this);
                JSONObject p = Store.findPack(data, packId);
                if (p == null) return err("pack não encontrado");
                if (Store.visibleCount(p) >= Store.maxStickers(p)) return err("O pack já está cheio.");
                Webp.Info wi = Webp.info(png);
                boolean isAnim = wi != null && wi.animated && wi.frames > 1;
                if (!Store.isKb(p) && p.optBoolean("animated") != isAnim)
                    return err(isAnim ? "Este pack do WhatsApp é de estáticos: guarda o animado num pack animado ou “Só teclado”." : "Este pack é só de animados.");
                Importer.Result r = Importer.importBytes(MainActivity.this, png, isAnim ? "criado.webp" : "criado.png", packId, p.optBoolean("animated"), data.optBoolean("fill"), Store.isKb(p));
                if (r.error != null) return err(r.error);
                synchronized (Store.LOCK) {
                    data = Store.load(MainActivity.this);
                    p = Store.findPack(data, packId);
                    JSONObject st = new JSONObject();
                    st.put("f", r.file);
                    st.put("emojis", new JSONArray());
                    JSONArray w = new JSONArray();
                    try { if (wordsJson != null && wordsJson.length() > 0) w = new JSONArray(wordsJson); } catch (JSONException ignored) {}
                    st.put("words", w);
                    if (r.animated) st.put("anim", true);
                    p.getJSONArray("stickers").put(st);
                    Store.sync(MainActivity.this, data, p);
                    Store.save(MainActivity.this, data);
                    return new JSONObject().put("ok", true).put("file", r.file).put("data", data).toString();
                }
            } catch (Exception e) { return err("não consegui guardar o sticker"); }
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
