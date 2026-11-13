package com.josejunior.sticktag;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.inputmethodservice.InputMethodService;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

/** O teclado de stickers: lê o que já escreveste e sugere stickers para enviar. */
public class KeyboardService extends InputMethodService {
    WebView web;
    FrameLayout box;
    final Handler ui = new Handler(Looper.getMainLooper());
    boolean pageReady = false;
    String pendingOpen = null;

    final Runnable textChanged = new Runnable() {
        @Override public void run() { js("onText", JSONObject.quote(currentText())); }
    };

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    int heightDp() {
        String h = Store.load(this).optString("kbHeight", "m");
        if (h.equals("s")) return 250;
        if (h.equals("l")) return 380;
        return 310;
    }

    @Override
    public View onCreateInputView() {
        if (web == null) {
            web = new WebView(this);
            web.setBackgroundColor(Color.parseColor("#0E1014"));
            WebSettings s = web.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setAllowFileAccess(false);
            s.setTextZoom(100);
            web.setOverScrollMode(View.OVER_SCROLL_NEVER);
            web.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, String url) { return Web.serve(KeyboardService.this, url); }
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) { return true; }
                @Override
                public void onPageFinished(WebView view, String url) {
                    pageReady = true;
                    if (pendingOpen != null) { js("onOpen", pendingOpen); pendingOpen = null; }
                }
            });
            web.addJavascriptInterface(new Bridge(), "KB");
            web.loadUrl(Web.HOST + "kb.html");
            box = new FrameLayout(this);
        }
        if (web.getParent() != null) ((ViewGroup) web.getParent()).removeView(web);
        box.removeAllViews();
        box.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(heightDp())));
        return box;
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        if (box != null && web != null) {
            ViewGroup.LayoutParams lp = web.getLayoutParams();
            if (lp != null && lp.height != dp(heightDp())) { lp.height = dp(heightDp()); web.setLayoutParams(lp); }
        }
        // pedido vindo da bolha: envia já e volta ao teclado anterior
        final String[] pend = Pending.take();
        if (pend != null) {
            ui.postDelayed(new Runnable() {
                @Override public void run() {
                    sendSticker(pend[0], pend[1]);
                    ui.postDelayed(new Runnable() { @Override public void run() { switchBack(); } }, 450);
                }
            }, 250);
        }
        try {
            JSONObject o = new JSONObject();
            o.put("text", currentText());
            o.put("app", info != null && info.packageName != null ? info.packageName : "");
            o.put("direct", chooseMime(info) != null);
            String payload = o.toString();
            if (pageReady) js("onOpen", payload); else pendingOpen = payload;
        } catch (Exception ignored) {}
    }

    @Override
    public void onUpdateSelection(int oldSelStart, int oldSelEnd, int newSelStart, int newSelEnd, int candidatesStart, int candidatesEnd) {
        super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd);
        ui.removeCallbacks(textChanged);
        ui.postDelayed(textChanged, 250);
    }

    @Override
    public boolean onEvaluateFullscreenMode() { return false; }

    void js(final String fn, final String arg) {
        ui.post(new Runnable() {
            @Override public void run() {
                if (web != null) web.evaluateJavascript("window.KBApp&&KBApp." + fn + "(" + arg + ")", null);
            }
        });
    }

    String currentText() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return "";
        CharSequence t = ic.getTextBeforeCursor(600, 0);
        return t == null ? "" : t.toString();
    }

    static String[] contentMimes(EditorInfo info) {
        if (info == null || Build.VERSION.SDK_INT < 25) return null;
        try { return (String[]) EditorInfo.class.getField("contentMimeTypes").get(info); } catch (Exception e) { return null; }
    }

    /** Que tipo de imagem a app aceita diretamente do teclado (null = não aceita). */
    static String chooseMime(EditorInfo info) {
        String[] m = contentMimes(info);
        if (m == null || m.length == 0) return null;
        for (String x : m) if ("image/webp.wasticker".equals(x)) return x;
        String[] prefs = {"image/webp", "image/png", "image/gif"};
        for (String p : prefs) for (String x : m) if (ClipDescription.compareMimeTypes(p, x)) return p;
        return null;
    }

    void sendSticker(String packId, String file) {
        String result;
        try {
            File f = new File(Store.root(this), "packs/" + packId + "/" + file);
            if (!f.exists()) { js("onSent", "{\"ok\":false,\"error\":\"ficheiro não encontrado\"}"); return; }
            EditorInfo info = getCurrentInputEditorInfo();
            InputConnection ic = getCurrentInputConnection();
            String mime = chooseMime(info);
            Uri uri = ShareProvider.uriFor(this, packId, file);
            String shareMime = "image/webp";
            if ("image/png".equals(mime) || "image/gif".equals(mime)) {
                // a app só aceita PNG: converte
                Bitmap b = BitmapFactory.decodeFile(f.getAbsolutePath());
                if (b != null) {
                    String name = file.replace(".webp", "") + ".png";
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    b.compress(Bitmap.CompressFormat.PNG, 100, out);
                    Store.writeFile(new File(ShareProvider.cacheDir(this), name), out.toByteArray());
                    uri = ShareProvider.cacheUri(this, name);
                    mime = "image/png";
                    shareMime = "image/png";
                }
            }
            boolean ok = false;
            if (mime != null && ic != null && Build.VERSION.SDK_INT >= 25) {
                try {
                    Class<?> cls = Class.forName("android.view.inputmethod.InputContentInfo");
                    Constructor<?> ctor = cls.getConstructor(Uri.class, ClipDescription.class, Uri.class);
                    Object content = ctor.newInstance(uri, new ClipDescription("sticker", new String[]{mime}), null);
                    Method m = InputConnection.class.getMethod("commitContent", cls, int.class, Bundle.class);
                    ok = (Boolean) m.invoke(ic, content, 1 /* INPUT_CONTENT_GRANT_READ_URI_PERMISSION */, null);
                } catch (Exception e) { ok = false; }
            }
            if (ok) {
                if (Store.load(this).optBoolean("kbDelete", true)) deleteAllBefore();
                result = "{\"ok\":true,\"mode\":\"direct\"}";
            } else {
                Intent it = new Intent(Intent.ACTION_SEND);
                it.setType(shareMime);
                it.putExtra(Intent.EXTRA_STREAM, uri);
                it.setClipData(ClipData.newRawUri("sticker", uri));
                it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                String pkg = info != null ? info.packageName : null;
                boolean started = false;
                if (pkg != null) {
                    try { Intent t = new Intent(it); t.setPackage(pkg); startActivity(t); started = true; } catch (Exception ignored) {}
                }
                if (!started) {
                    Intent ch = Intent.createChooser(it, "Enviar sticker");
                    ch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(ch);
                }
                result = "{\"ok\":true,\"mode\":\"share\"}";
            }
        } catch (Exception e) {
            result = "{\"ok\":false,\"error\":\"não consegui enviar\"}";
        }
        js("onSent", result);
    }

    void deleteAllBefore() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        CharSequence t = ic.getTextBeforeCursor(2000, 0);
        if (t != null && t.length() > 0) ic.deleteSurroundingText(t.length(), 0);
    }

    void switchBack() {
        try {
            if (Build.VERSION.SDK_INT >= 28) {
                Method m = InputMethodService.class.getMethod("switchToPreviousInputMethod");
                Object r = m.invoke(this);
                if (r instanceof Boolean && (Boolean) r) return;
            } else {
                InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                IBinder token = getWindow().getWindow().getAttributes().token;
                if (imm.switchToLastInputMethod(token)) return;
            }
        } catch (Exception ignored) {}
        showPicker();
    }

    void showPicker() {
        InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        imm.showInputMethodPicker();
    }

    final class Bridge {
        @JavascriptInterface public String getData() { return Store.load(KeyboardService.this).toString(); }
        @JavascriptInterface public String getText() { return currentText(); }

        @JavascriptInterface public void send(final String packId, final String file) {
            ui.post(new Runnable() { @Override public void run() { sendSticker(packId, file); } });
        }

        @JavascriptInterface public void back() {
            ui.post(new Runnable() { @Override public void run() { switchBack(); } });
        }

        @JavascriptInterface public void picker() {
            ui.post(new Runnable() { @Override public void run() { showPicker(); } });
        }

        @JavascriptInterface public void backspace() {
            ui.post(new Runnable() {
                @Override public void run() {
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.deleteSurroundingText(1, 0);
                }
            });
        }

        @JavascriptInterface public void clearText() {
            ui.post(new Runnable() { @Override public void run() { deleteAllBefore(); } });
        }

        @JavascriptInterface public void openApp() {
            ui.post(new Runnable() {
                @Override public void run() {
                    Intent it = new Intent(KeyboardService.this, MainActivity.class);
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(it);
                }
            });
        }

        @JavascriptInterface public String setFav(String packId, String file, boolean on) {
            String d = Store.setFlag(KeyboardService.this, packId, file, "fav", on);
            return d == null ? "{}" : d;
        }

        @JavascriptInterface public void learn(String packId, String file, String wordsJson) {
            try { Store.learn(KeyboardService.this, packId, file, new JSONArray(wordsJson)); } catch (Exception ignored) {}
        }

        @JavascriptInterface public String addWords(String packId, String file, String wordsJson) {
            try { String d = Store.addWords(KeyboardService.this, packId, file, new JSONArray(wordsJson)); return d == null ? "{}" : d; }
            catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface public void saveToGallery(final String packId, final String file) {
            new Thread(new Runnable() {
                @Override public void run() {
                    String e = Gallery.save(KeyboardService.this, packId, file);
                    js("onSaved", e == null ? "{\"ok\":true}" : "{\"ok\":false,\"error\":" + JSONObject.quote(e) + "}");
                }
            }).start();
        }

        @JavascriptInterface public void setOption(String key, boolean value) {
            synchronized (Store.LOCK) {
                try {
                    JSONObject d = Store.load(KeyboardService.this);
                    d.put(key, value);
                    Store.save(KeyboardService.this, d);
                } catch (Exception ignored) {}
            }
        }
    }
}
