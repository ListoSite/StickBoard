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
    static KeyboardService inst;
    boolean inputOn = false;
    /** O motor dos especiais deixou este teclado aberto entre envios seguidos. */
    boolean engineHolding = false;
    /** Altura do ecrã "A enviar…" (a do teclado anterior); 0 = teclado normal. */
    int busyH = 0;
    String busyLabel = null;
    WebView web;
    FrameLayout box;
    final Handler ui = new Handler(Looper.getMainLooper());
    boolean pageReady = false;
    String pendingOpen = null;

    final Runnable textChanged = new Runnable() {
        @Override public void run() { js("onText", JSONObject.quote(currentText())); }
    };

    @Override public void onCreate() { super.onCreate(); inst = this; AutoBackup.maybeRun(this); }

    @Override public void onDestroy() { if (inst == this) inst = null; super.onDestroy(); }

    @Override
    public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        inputOn = true;
        handlePending();
    }

    @Override
    public void onFinishInput() { super.onFinishInput(); inputOn = false; }

    boolean isCurrentIme() {
        String cur = android.provider.Settings.Secure.getString(getContentResolver(), "default_input_method");
        android.content.ComponentName me = new android.content.ComponentName(this, KeyboardService.class);
        return cur != null && (cur.equals(me.flattenToShortString()) || cur.equals(me.flattenToString()));
    }

    /** Dá para enviar já, sem trocar de teclado? */
    boolean canDirect(String pkg) {
        EditorInfo info = getCurrentInputEditorInfo();
        return inputOn && isCurrentIme() && getCurrentInputConnection() != null && info != null
                && pkg != null && pkg.equals(info.packageName) && chooseMime(info) != null;
    }

    /** Pedido da bolha ou do motor dos especiais: envia e (se veio da bolha) volta ao teclado anterior. */
    void handlePending() {
        final Pending.Req r = Pending.take();
        if (r == null) return;
        // ecrã "A enviar…" com a altura do teclado anterior, para a conversa não saltar
        busyH = r.height; busyLabel = r.label == null ? "A enviar…" : r.label;
        applyHeight();
        js("onBusy", JSONObject.quote(busyLabel));
        ui.postDelayed(new Runnable() {
            @Override public void run() {
                if (r.engine) { runBatch(r.items, true, r.gen); return; }
                if (r.special != null) sendSpecialFirst(r.special);
                else if (!r.items.isEmpty()) sendSticker(r.items.get(0).pack, r.items.get(0).file, false);
                ui.postDelayed(new Runnable() { @Override public void run() { switchBack(); } }, 450);
            }
        }, 250);
    }

    /** Envia uma série de stickers com as esperas pedidas (motor dos especiais). */
    void runBatch(final java.util.List<Pending.Item> items, final boolean back, final int gen) {
        final boolean[] failed = {false};
        long t = 0;
        for (int i = 0; i < items.size(); i++) {
            final Pending.Item it = items.get(i);
            final boolean last = i == items.size() - 1;
            t += it.gap;
            ui.postDelayed(new Runnable() {
                @Override public void run() {
                    if (failed[0]) return;
                    if (Specials.run == null || Specials.run.gen != gen) { failed[0] = true; if (back) switchBack(); return; }
                    int m = sendSticker(it.pack, it.file, true);
                    if (m != 1) {
                        failed[0] = true;
                        Specials.batchDone(gen, false);
                        if (back) ui.postDelayed(new Runnable() { @Override public void run() { switchBack(); } }, 300);
                        return;
                    }
                    if (last) {
                        Specials.batchDone(gen, true);
                        if (!back) return;
                        // se o próximo sticker vem já a seguir, fica aberto (sem piscar)
                        Specials.Run run = Specials.run;
                        if (run != null && run.gen == gen && run.busy && run.nextGap <= 8000) { engineHolding = true; return; }
                        engineHolding = false;
                        ui.postDelayed(new Runnable() { @Override public void run() { switchBack(); } }, 450);
                    }
                }
            }, t);
        }
    }

    /** Envia o 1.º sticker de um especial e põe-no a correr. */
    void sendSpecialFirst(String id) {
        JSONObject d = Specials.find(this, id);
        JSONObject f = d == null ? null : d.optJSONObject("first");
        if (f == null) { js("onSent", "{\"ok\":false,\"error\":\"especial não encontrado\"}"); return; }
        int m = sendSticker(f.optString("p"), f.optString("f"), false, id);
        if (m == 2) android.widget.Toast.makeText(this, "⚡ Os especiais só funcionam em apps que aceitam stickers do teclado (ex.: WhatsApp)", android.widget.Toast.LENGTH_LONG).show();
    }

    int targetHeight() { return busyH > 0 ? busyH : dp(heightDp()); }

    void applyHeight() {
        if (web == null) return;
        ViewGroup.LayoutParams lp = web.getLayoutParams();
        int h = targetHeight();
        if (lp != null && lp.height != h) { lp.height = h; web.setLayoutParams(lp); }
    }

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
        box.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, targetHeight()));
        return box;
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        // pedido vindo da bolha: envia já e volta ao teclado anterior
        handlePending();
        applyHeight();
        try {
            JSONObject o = new JSONObject();
            o.put("text", currentText());
            o.put("app", info != null && info.packageName != null ? info.packageName : "");
            o.put("direct", chooseMime(info) != null);
            if (busyLabel != null) o.put("busy", busyLabel);
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

    /** Envia um sticker. Devolve 1 = enviado direto, 2 = pela partilha, 0 = falhou. engine = enviado pelo motor dos especiais. */
    int sendSticker(String packId, String file, boolean engine) { return sendSticker(packId, file, engine, null); }

    /** special = id do especial a começar; null = começa sozinho se este sticker for o 1.º de algum especial. */
    int sendSticker(String packId, String file, boolean engine, String special) {
        String result;
        int mode = 0;
        try {
            File f = new File(Store.root(this), "packs/" + packId + "/" + file);
            if (!f.exists()) { if (!engine) js("onSent", "{\"ok\":false,\"error\":\"ficheiro não encontrado\"}"); return 0; }
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
            if (engine) return ok ? 1 : 0;
            if (ok) {
                if (Store.load(this).optBoolean("kbDelete", true)) deleteAllBefore();
                result = "{\"ok\":true,\"mode\":\"direct\"}";
                mode = 1;
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
                mode = 2;
            }
            Specials.onUserSent();
            if (mode == 1) {
                String sp = special != null ? special : Specials.findByFirst(this, packId, file);
                if (sp != null) Specials.start(this, sp, info != null ? info.packageName : "");
            }
        } catch (Exception e) {
            result = "{\"ok\":false,\"error\":\"não consegui enviar\"}";
            if (engine) return 0;
        }
        js("onSent", result);
        return mode;
    }

    void deleteAllBefore() {
        InputConnection ic = getCurrentInputConnection();
        if (ic == null) return;
        CharSequence t = ic.getTextBeforeCursor(2000, 0);
        if (t != null && t.length() > 0) ic.deleteSurroundingText(t.length(), 0);
    }

    void switchBack() {
        engineHolding = false;
        busyH = 0; busyLabel = null;
        js("onBusy", "null");
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
            ui.post(new Runnable() { @Override public void run() { sendSticker(packId, file, false); } });
        }

        @JavascriptInterface public void sendSpecial(final String id) {
            ui.post(new Runnable() { @Override public void run() { sendSpecialFirst(id); } });
        }

        @JavascriptInterface public void cancelSpecial() {
            ui.post(new Runnable() { @Override public void run() { Specials.cancel("cancelaste"); } });
        }

        @JavascriptInterface public String specialState() { return Specials.state(); }

        /** Toque no ecrã "A enviar…": cancela o especial e volta ao teclado anterior. */
        @JavascriptInterface public void busyTap() {
            ui.post(new Runnable() { @Override public void run() { if (Specials.run != null) Specials.cancel("cancelaste"); switchBack(); } });
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
