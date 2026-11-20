package com.josejunior.sticktag;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A bolha flutuante: aparece quando o teclado está aberto numa app escolhida,
 * lê a frase da caixa de texto e mostra os stickers que combinam.
 */
public class BubbleService extends AccessibilityService {
    static final String[] DEFAULT_APPS = {"com.whatsapp", "com.whatsapp.w4b", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill",
            "com.instagram.android", "org.telegram.messenger", "com.facebook.orca", "com.google.android.apps.messaging",
            "com.samsung.android.messaging", "com.discord", "com.snapchat.android"};

    static BubbleService inst;
    final Handler ui = new Handler(Looper.getMainLooper());
    WindowManager wm;
    WebView web;
    WindowManager.LayoutParams lp;
    boolean shown = false, expanded = false, pageReady = false;
    String text = "", app = "";
    int bx = -1, by = -1;
    Rect imeRect = new Rect();
    long lastCheck = 0;

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        inst = this;
        recheckSoon();
    }

    /** App que está à frente (null se não der para saber). */
    String activePackage() {
        try {
            AccessibilityNodeInfo r = getRootInActiveWindow();
            return r == null || r.getPackageName() == null ? null : r.getPackageName().toString();
        } catch (Exception e) { return null; }
    }

    /** Altura do teclado que está à vista agora (0 se estiver escondido). */
    int imeHeight() {
        try {
            for (AccessibilityWindowInfo w : getWindows()) {
                if (w.getType() != AccessibilityWindowInfo.TYPE_INPUT_METHOD) continue;
                Rect r = new Rect();
                w.getBoundsInScreen(r);
                int h = r.height();
                android.util.DisplayMetrics dm = new android.util.DisplayMetrics();
                wm.getDefaultDisplay().getRealMetrics(dm);
                if (r.bottom >= dm.heightPixels - 2) {
                    int id = getResources().getIdentifier("navigation_bar_height", "dimen", "android");
                    if (id > 0) h -= getResources().getDimensionPixelSize(id);
                }
                return h > dp(120) ? h : 0;
            }
        } catch (Exception ignored) {}
        return 0;
    }

    /** Toca na caixa de texto da conversa para o teclado abrir. */
    void focusEntry(String pkg) {
        try {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;
            AccessibilityNodeInfo t = null;
            List<AccessibilityNodeInfo> l = root.findAccessibilityNodeInfosByViewId(pkg + ":id/entry");
            if (l != null && !l.isEmpty()) t = l.get(0);
            if (t == null) {
                List<AccessibilityNodeInfo> q = new java.util.ArrayList<AccessibilityNodeInfo>();
                q.add(root);
                for (int i = 0; i < q.size() && i < 1500 && t == null; i++) {
                    AccessibilityNodeInfo n = q.get(i);
                    if (n == null) continue;
                    if (n.isEditable()) t = n;
                    for (int k = 0; k < n.getChildCount(); k++) q.add(n.getChild(k));
                }
            }
            if (t == null) return;
            t.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
            t.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        } catch (Exception ignored) {}
    }

    String chatTitle(String pkg) {
        try { return Specials.chatTitle(getRootInActiveWindow(), pkg); } catch (Exception e) { return null; }
    }

    /* as opções da bolha mudam pouco: guardamos em memória e só relemos quando o ficheiro muda */
    Set<String> appsCache = null;
    boolean onCache = true;
    long optsMtime = -1;

    void loadOpts() {
        long m = new java.io.File(Store.root(this), "data.json").lastModified();
        if (appsCache != null && m == optsMtime) return;
        optsMtime = m;
        appsCache = readAllowedApps();
        JSONObject d0 = Store.load(this);
        onCache = d0.optBoolean("bubbleOn", true);
        sizeCache = d0.optString("stkSize", "m");
    }
    String sizeCache = "m";

    /** Altura da caixa dos stickers, conforme o tamanho escolhido (Pequeno a Enorme). */
    int panelHeight() {
        loadOpts();
        if ("s".equals(sizeCache)) return dp(244);
        if ("l".equals(sizeCache)) return dp(340);
        if ("xl".equals(sizeCache)) return dp(330);
        return dp(290);
    }

    Set<String> allowedApps() { loadOpts(); return appsCache; }

    Set<String> readAllowedApps() {
        Set<String> s = new HashSet<String>();
        JSONObject d = Store.load(this);
        String j = d.optString("bubbleApps", "");
        try {
            if (j.length() > 0) { JSONArray a = new JSONArray(j); for (int i = 0; i < a.length(); i++) s.add(a.getString(i)); return s; }
        } catch (Exception ignored) {}
        for (String x : DEFAULT_APPS) s.add(x);
        return s;
    }

    boolean enabledByUser() { loadOpts(); return onCache; }

    /**
     * A app que está mesmo à frente (a janela que tem o teclado), lida na hora.
     * Assim a bolha volta sozinha depois de abrires as notificações ou de saíres e voltares.
     */
    String foregroundApp() {
        try {
            for (AccessibilityWindowInfo w : getWindows()) {
                if (w.getType() != AccessibilityWindowInfo.TYPE_APPLICATION) continue;
                if (!w.isFocused() && !w.isActive()) continue;
                AccessibilityNodeInfo r = w.getRoot();
                if (r != null && r.getPackageName() != null) return r.getPackageName().toString();
            }
        } catch (Exception ignored) {}
        try {
            AccessibilityNodeInfo r = getRootInActiveWindow();
            if (r != null && r.getPackageName() != null) return r.getPackageName().toString();
        } catch (Exception ignored) {}
        return null;
    }

    /** O texto da caixa onde estás a escrever (para a bolha não ficar com a frase antiga). */
    String focusedText() {
        try {
            AccessibilityNodeInfo r = getRootInActiveWindow();
            AccessibilityNodeInfo f = r == null ? null : r.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            if (f == null || !f.isEditable() || f.isPassword()) return null;
            if (Build.VERSION.SDK_INT >= 26) {
                try { if ((Boolean) AccessibilityNodeInfo.class.getMethod("isShowingHintText").invoke(f)) return ""; } catch (Exception ignored) {}
            }
            CharSequence t = f.getText();
            return t == null ? "" : t.toString();
        } catch (Exception e) { return null; }
    }

    final Runnable recheck = new Runnable() { @Override public void run() { checkKeyboard(); } };

    /** Volta a verificar daqui a pouco (o teclado e as janelas demoram a assentar). */
    void recheckSoon() {
        ui.removeCallbacks(recheck);
        ui.postDelayed(recheck, 350);
        ui.postDelayed(new Runnable() { @Override public void run() { checkKeyboard(); } }, 1200);
    }

    String myIme() { return new ComponentName(this, KeyboardService.class).flattenToShortString(); }

    boolean myImeActive() {
        String cur = Settings.Secure.getString(getContentResolver(), "default_input_method");
        if (cur == null) return false;
        return cur.equals(myIme()) || cur.equals(new ComponentName(this, KeyboardService.class).flattenToString());
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (e == null) return;
        int type = e.getEventType();
        CharSequence pkgCs = e.getPackageName();
        String pkg = pkgCs == null ? "" : pkgCs.toString();
        if (pkg.equals(getPackageName())) return;
        Specials.onA11y(this, e, pkg);
        if (type == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            // rede de segurança: se a bolha devia estar à vista e não está, volta a verificar (no máximo a cada 1,5 s)
            long now = System.currentTimeMillis();
            // a conversa mudou (chegou ou saiu uma mensagem): lê as últimas mensagens para perceber o ambiente
            if (allowedApps().contains(pkg)) queueChatRead();
            if (!shown && now - lastCheck > 1500 && allowedApps().contains(pkg)) { lastCheck = now; checkKeyboard(); }
            // a app apagou a caixa sem avisar (mandaste a mensagem)? vê a caixa de texto (no máximo a cada 0,4 s)
            if (text != null && text.trim().length() >= 3 && now - lastBoxCheck > 400 && allowedApps().contains(pkg)) {
                lastBoxCheck = now;
                String t = focusedBoxText();
                if (t != null && t.trim().length() == 0) {
                    sentText = text; sentApp = pkg; sentAt = now;
                    text = "";
                    if (shown) js("onText", JSONObject.quote(text) + "," + JSONObject.quote(keptFor(app)));
                }
            }
            return;
        }
        if (type == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED || type == AccessibilityEvent.TYPE_VIEW_FOCUSED
                || type == AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED) {
            if (!allowedApps().contains(pkg)) return;
            app = pkg;
            String before = text;
            if (e.isPassword()) { text = ""; } else {
                String t = readText(e);
                if (t != null) text = isHint(t) ? "" : t;
            }
            long now2 = System.currentTimeMillis();
            if (text.trim().length() == 0) {
                // a caixa ficou vazia de repente: mandaste a mensagem. No WhatsApp isto chega muitas vezes como
                // «o cursor mudou» (o texto é apagado pela app, não por ti), por isso valem os dois avisos.
                if (type != AccessibilityEvent.TYPE_VIEW_FOCUSED && before != null && before.trim().length() >= 3) { sentText = before; sentApp = pkg; sentAt = now2; }
            } else if (!text.equals(sentText)) typedAt = now2;
            if (shown) js("onText", JSONObject.quote(text) + "," + JSONObject.quote(keptFor(app)));
            checkKeyboard();
        } else if (type == AccessibilityEvent.TYPE_WINDOWS_CHANGED || type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg.length() > 0 && !pkg.equals("com.android.systemui")) {
                // mudou de app
                if (!allowedApps().contains(pkg) && !isImePackage(pkg)) app = "";
                else if (allowedApps().contains(pkg)) app = pkg;
            }
            checkKeyboard();
            recheckSoon();
        }
    }

    boolean isImePackage(String pkg) {
        String cur = Settings.Secure.getString(getContentResolver(), "default_input_method");
        return cur != null && cur.startsWith(pkg + "/");
    }

    /* ---------- a mensagem que acabaste de mandar ----------
       A caixa de texto ficou vazia de repente (mandaste a mensagem): guardamos o texto para o teclado de stickers
       e a bolha continuarem a sugerir os stickers dessa mensagem até voltares a escrever. */
    static volatile String sentText = "", sentApp = "";
    static volatile long sentAt = 0, typedAt = 0;
    static final long KEEP_MS = 15 * 60 * 1000L;
    /** A mensagem que mandaste há pouco nesta app (ou "" se entretanto escreveste outra coisa). */
    static String keptFor(String pkg) {
        String t = sentText;
        if (t == null || t.length() == 0) return "";
        if (System.currentTimeMillis() - sentAt > KEEP_MS) return "";
        if (typedAt > sentAt) return "";
        if (pkg != null && pkg.length() > 0 && sentApp.length() > 0 && !sentApp.equals(pkg)) return "";
        return t;
    }
    static void forgetKept() { sentText = ""; }
    /** Textos de ajuda da caixa vazia («Mensagem», «Type a message»…): não são texto escrito. */
    static boolean isHint(String t) {
        String x = t == null ? "" : t.trim().toLowerCase();
        if (x.length() == 0 || x.length() > 40) return false;
        String[] H = { "mensagem", "message", "escreve uma mensagem", "escreva uma mensagem", "digite uma mensagem", "digita uma mensagem",
            "type a message", "write a message", "bericht", "typ een bericht", "nachricht", "nachricht schreiben", "écrire un message", "ecrire un message",
            "mensaje", "escribe un mensaje", "messaggio", "scrivi un messaggio", "message…", "mensagem…", "message...", "send a message", "enviar mensagem" };
        for (String h : H) if (x.equals(h)) return true;
        return false;
    }

    long lastBoxCheck = 0;
    /** O texto da caixa onde se escreve (null se não der para ver; "" se estiver vazia ou só com o texto de ajuda). */
    String focusedBoxText() {
        try {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return null;
            AccessibilityNodeInfo f = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
            if (f == null || !f.isEditable()) return null;
            if (Build.VERSION.SDK_INT >= 26) {
                try { Method m = AccessibilityNodeInfo.class.getMethod("isShowingHintText"); if ((Boolean) m.invoke(f)) return ""; } catch (Exception ignored) {}
            }
            CharSequence t = f.getText();
            String x = t == null ? "" : t.toString();
            return isHint(x) ? "" : x;
        } catch (Exception e) { return null; }
    }

    String readText(AccessibilityEvent e) {
        try {
            AccessibilityNodeInfo src = e.getSource();
            if (src != null) {
                if (src.isPassword()) return "";
                if (Build.VERSION.SDK_INT >= 26) {
                    try {
                        Method m = AccessibilityNodeInfo.class.getMethod("isShowingHintText");
                        if ((Boolean) m.invoke(src)) return "";
                    } catch (Exception ignored) {}
                }
                CharSequence t = src.getText();
                if (src.isEditable()) return t == null ? "" : t.toString();
            }
        } catch (Exception ignored) {}
        if (e.getEventType() == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            List<CharSequence> l = e.getText();
            StringBuilder sb = new StringBuilder();
            for (CharSequence c : l) if (c != null) sb.append(c);
            return sb.toString();
        }
        return null;
    }

    /* ---------- o ambiente da conversa: as últimas mensagens dos dois lados ---------- */
    boolean chatQueued = false;
    long lastChatRead = 0;
    final Runnable chatRead = new Runnable() { @Override public void run() { chatQueued = false; readChat(); } };

    /** Lê a conversa daqui a pouco (no máximo ~1 vez por segundo) e só quando a bolha ou o teclado de stickers estão à vista. */
    void queueChatRead() {
        if (chatQueued) return;
        if (!shown && KeyboardService.inst == null) return;
        long wait = Math.max(350, 1000 - (System.currentTimeMillis() - lastChatRead));
        chatQueued = true;
        ui.postDelayed(chatRead, wait);
    }

    void readChat() {
        lastChatRead = System.currentTimeMillis();
        if (!shown && !myImeActive()) return;
        try {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null || root.getPackageName() == null) return;
            String pkg = root.getPackageName().toString();
            if (!allowedApps().contains(pkg)) return;
            String title = Specials.chatTitle(root, pkg);
            // no WhatsApp só dentro de uma conversa (na lista de conversas não há ambiente)
            if (Specials.isWhatsApp(pkg) && title == null) return;
            float dens = getResources().getDisplayMetrics().density;
            List<ChatDiff.Row> rows = Specials.snapshot(root, Math.round(24 * dens));
            JSONArray a = new JSONArray();
            int from = Math.max(0, rows.size() - 10);
            for (int i = from; i < rows.size(); i++) {
                ChatDiff.Row r = rows.get(i);
                if (r.dir == 0) continue;
                String t = r.text == null ? "" : r.text.trim();
                if (t.length() == 0) continue;
                if (t.length() > 300) t = t.substring(t.length() - 300);
                JSONObject o = new JSONObject();
                o.put("d", r.dir); o.put("t", t);
                a.put(o);
            }
            String key = pkg + "|" + (title == null ? "" : title);
            if (Vibe.setChat(key, a.toString())) {
                if (shown) js("onChat", Vibe.chatJson);
                KeyboardService k = KeyboardService.inst;
                if (k != null) k.js("onChat", Vibe.chatJson);
            }
        } catch (Exception ignored) {}
    }

    /** Verifica se o teclado está à vista e decide se mostra a bolha. */
    void checkKeyboard() {
        boolean ime = false;
        try {
            List<AccessibilityWindowInfo> ws = getWindows();
            for (AccessibilityWindowInfo w : ws) {
                if (w.getType() == AccessibilityWindowInfo.TYPE_INPUT_METHOD) { ime = true; w.getBoundsInScreen(imeRect); }
            }
        } catch (Exception ignored) {}
        if (ime) {
            // decide pela app que está mesmo à frente, e não só pelo último evento
            String fg = foregroundApp();
            if (fg != null && fg.equals(getPackageName())) app = ""; // estás dentro do StickTag
            else if (fg != null && !isImePackage(fg)) {
                if (allowedApps().contains(fg)) {
                    if (!fg.equals(app) || !shown) { String t = focusedText(); if (t != null) text = t; }
                    app = fg;
                } else app = "";
            }
        }
        boolean want = ime && app.length() > 0 && enabledByUser() && !myImeActive();
        if (want && !shown) show();
        else if (!want && shown) hide();
        else if (want && expanded) positionPanel();
    }

    WindowManager.LayoutParams baseParams() {
        int type = Build.VERSION.SDK_INT >= 22 ? 2032 /* TYPE_ACCESSIBILITY_OVERLAY */ : WindowManager.LayoutParams.TYPE_SYSTEM_ALERT;
        WindowManager.LayoutParams p = new WindowManager.LayoutParams(dp(56), dp(56), type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT);
        p.gravity = Gravity.TOP | Gravity.LEFT;
        return p;
    }

    void ensureWeb() {
        if (web != null) return;
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, String url) { return Web.serve(BubbleService.this, url); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) { return true; }
            @Override public void onPageFinished(WebView v, String url) { pageReady = true; js("onText", JSONObject.quote(text) + "," + JSONObject.quote(keptFor(app))); js("onSpecial", Specials.state()); js("onChat", Vibe.chat(app)); js("onAsk", JSONObject.quote(Vibe.get())); }
        });
        web.setOnTouchListener(new View.OnTouchListener() {
            @Override public boolean onTouch(View v, MotionEvent ev) {
                if (ev.getAction() == MotionEvent.ACTION_OUTSIDE && expanded) { setExpanded(false); return true; }
                return false;
            }
        });
        web.addJavascriptInterface(new Bridge(), "BB");
        web.loadUrl(Web.HOST + "bubble.html");
    }

    void show() {
        if (wm == null) return;
        ensureWeb();
        lp = baseParams();
        if (bx < 0) {
            JSONObject d = Store.load(this);
            int sw = getResources().getDisplayMetrics().widthPixels;
            bx = d.optInt("bubbleX", sw - dp(64));
            by = d.optInt("bubbleY", -1);
        }
        int top = imeRect.top > 0 ? imeRect.top : getResources().getDisplayMetrics().heightPixels / 2;
        lp.x = bx;
        lp.y = by >= 0 ? Math.min(by, top - dp(60)) : top - dp(68);
        try { wm.addView(web, lp); shown = true; expanded = false; } catch (Exception e) { shown = false; return; }
        js("setMode", "'bubble'");
        js("onText", JSONObject.quote(text) + "," + JSONObject.quote(keptFor(app)));
        js("onAsk", JSONObject.quote(Vibe.get()));
        ui.postDelayed(new Runnable() { @Override public void run() { readChat(); } }, 400);
    }

    void hide() {
        if (!shown) return;
        try { wm.removeView(web); } catch (Exception ignored) {}
        shown = false; expanded = false;
    }

    void positionPanel() {
        if (!shown || lp == null) return;
        int sw = getResources().getDisplayMetrics().widthPixels;
        int top = imeRect.top > 0 ? imeRect.top : getResources().getDisplayMetrics().heightPixels / 2;
        // nunca maior do que o espaço por cima do teclado
        int h = Math.max(dp(180), Math.min(panelHeight(), top - dp(40)));
        lp.width = sw - dp(12); lp.height = h; lp.x = dp(6); lp.y = Math.max(0, top - h - dp(4));
        try { wm.updateViewLayout(web, lp); } catch (Exception ignored) {}
    }

    void setExpanded(boolean on) {
        if (!shown) return;
        expanded = on;
        if (on) positionPanel();
        else {
            lp.width = dp(56); lp.height = dp(56); lp.x = bx;
            int top = imeRect.top > 0 ? imeRect.top : getResources().getDisplayMetrics().heightPixels / 2;
            lp.y = by >= 0 ? Math.min(by, top - dp(60)) : top - dp(68);
            try { wm.updateViewLayout(web, lp); } catch (Exception ignored) {}
        }
        js("setMode", on ? "'panel'" : "'bubble'");
    }

    void js(final String fn, final String arg) {
        ui.post(new Runnable() {
            @Override public void run() {
                if (web != null && pageReady) web.evaluateJavascript("window.BubbleApp&&BubbleApp." + fn + "(" + arg + ")", null);
            }
        });
    }

    /** Passa para o teclado de stickers (Android 11+). */
    boolean switchToStickers() {
        if (Build.VERSION.SDK_INT < 30) return false;
        try {
            Object ctl = AccessibilityService.class.getMethod("getSoftKeyboardController").invoke(this);
            Method m = ctl.getClass().getMethod("switchToInputMethod", String.class);
            Object r = m.invoke(ctl, myIme());
            return r instanceof Boolean && (Boolean) r;
        } catch (Exception e) { return false; }
    }

    @Override public void onInterrupt() {}

    @Override
    public void onDestroy() {
        if (inst == this) inst = null;
        hide();
        super.onDestroy();
    }

    final class Bridge {
        @JavascriptInterface public String getData() { return Store.load(BubbleService.this).toString(); }
        @JavascriptInterface public String getText() { return text; }

        @JavascriptInterface public void expand(final boolean on) {
            ui.post(new Runnable() { @Override public void run() { setExpanded(on); } });
        }

        @JavascriptInterface public void drag(final float dx, final float dy) {
            ui.post(new Runnable() {
                @Override public void run() {
                    if (!shown || expanded || lp == null) return;
                    float d = getResources().getDisplayMetrics().density;
                    lp.x = Math.max(0, lp.x + Math.round(dx * d));
                    lp.y = Math.max(0, lp.y + Math.round(dy * d));
                    bx = lp.x; by = lp.y;
                    try { wm.updateViewLayout(web, lp); } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface public void dragEnd() {
            synchronized (Store.LOCK) {
                try { JSONObject d = Store.load(BubbleService.this); d.put("bubbleX", bx); d.put("bubbleY", by); Store.save(BubbleService.this, d); } catch (Exception ignored) {}
            }
        }

        /** Envia: passa para o teclado de stickers, que envia e volta ao teclado anterior. */
        @JavascriptInterface public String send(final String packId, final String file) {
            Pending.set(packId, file, imeHeight());
            final boolean[] ok = {false};
            ui.post(new Runnable() {
                @Override public void run() {
                    boolean r = switchToStickers();
                    if (!r) { Pending.clear(); js("onSendFailed", Build.VERSION.SDK_INT < 30 ? "'old'" : "'disabled'"); }
                    else setExpanded(false);
                }
            });
            return "{\"ok\":true}";
        }

        /** Envia o 1.º sticker de um especial e põe o especial a correr. */
        @JavascriptInterface public void sendSpecial(final String id) {
            JSONObject d = Specials.find(BubbleService.this, id);
            JSONObject f = d == null ? null : d.optJSONObject("first");
            if (f == null) return;
            Pending.setSpecial(id, f.optString("p"), f.optString("f"), imeHeight(), "⚡ " + d.optString("name", "Especial"));
            ui.post(new Runnable() {
                @Override public void run() {
                    if (!switchToStickers()) { Pending.clear(); js("onSendFailed", Build.VERSION.SDK_INT < 30 ? "'old'" : "'disabled'"); }
                    else setExpanded(false);
                }
            });
        }

        @JavascriptInterface public void cancelSpecial() {
            ui.post(new Runnable() { @Override public void run() { Specials.cancel("cancelaste"); } });
        }

        @JavascriptInterface public String specialState() { return Specials.state(); }

        @JavascriptInterface public void setOption(String key, boolean value) {
            synchronized (Store.LOCK) {
                try { JSONObject d = Store.load(BubbleService.this); d.put(key, value); Store.save(BubbleService.this, d); } catch (Exception ignored) {}
            }
        }

        @JavascriptInterface public void openKeyboard() {
            ui.post(new Runnable() {
                @Override public void run() {
                    if (!switchToStickers()) js("onSendFailed", Build.VERSION.SDK_INT < 30 ? "'old'" : "'disabled'");
                    else setExpanded(false);
                }
            });
        }

        @JavascriptInterface public void learn(String packId, String file, String wordsJson) {
            try { Store.learn(BubbleService.this, packId, file, new JSONArray(wordsJson)); } catch (Exception ignored) {}
        }

        /** Aprender com o contexto todo: palavras (com força), os que estavam à frente e o tema/forma da mensagem. */
        @JavascriptInterface public void learn3(String packId, String file, String wordsJson, String skippedJson, String ctxJson) {
            try { Store.learn(BubbleService.this, packId, file, new JSONArray(wordsJson), skippedJson == null ? null : new JSONArray(skippedJson), ctxJson == null ? null : new org.json.JSONObject(ctxJson)); } catch (Exception ignored) {}
        }

        /** Ao mandar o próximo sticker: apagar o que está escrito? (só 1 palavra ou exatamente uma palavra do sticker) */
        /** O ✕ «limpar» das sugestões da mensagem enviada. */
        @JavascriptInterface public void forgetKept() { BubbleService.forgetKept(); }
        @JavascriptInterface public String getKept() { return BubbleService.keptFor(app); }

        @JavascriptInterface public void deleteHint(boolean del) { KeyboardService.deleteHint = del ? Boolean.TRUE : Boolean.FALSE; }

        @JavascriptInterface public void learn2(String packId, String file, String wordsJson, String skippedJson) {
            try { Store.learn(BubbleService.this, packId, file, new JSONArray(wordsJson), skippedJson == null ? null : new JSONArray(skippedJson)); } catch (Exception ignored) {}
        }

        /* ---- ambiente da conversa ---- */
        @JavascriptInterface public String getChat() { return Vibe.chat(app); }
        @JavascriptInterface public String getAsk() { return Vibe.get(); }
        @JavascriptInterface public void askVibe(String json) { Vibe.ask(json); }
        @JavascriptInterface public void skipAsk() { Vibe.clear(); }
        /** A tua resposta (weight 1) ou o que a app aprendeu sozinha (menos de 1). */
        @JavascriptInterface public String learnVibe(String packId, String file, String vibe, String wordsJson, double weight) {
            JSONArray w = null;
            try { w = wordsJson == null ? null : new JSONArray(wordsJson); } catch (Exception ignored) {}
            String r = Store.learnVibe(BubbleService.this, packId, file, vibe, w, weight);
            if (weight >= 1) Vibe.clear();
            return r == null ? "" : r;
        }

        @JavascriptInterface public void hideNow() {
            ui.post(new Runnable() { @Override public void run() { hide(); } });
        }
    }
}
