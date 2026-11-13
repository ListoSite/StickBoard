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

    Set<String> allowedApps() {
        Set<String> s = new HashSet<String>();
        JSONObject d = Store.load(this);
        String j = d.optString("bubbleApps", "");
        try {
            if (j.length() > 0) { JSONArray a = new JSONArray(j); for (int i = 0; i < a.length(); i++) s.add(a.getString(i)); return s; }
        } catch (Exception ignored) {}
        for (String x : DEFAULT_APPS) s.add(x);
        return s;
    }

    boolean enabledByUser() { return Store.load(this).optBoolean("bubbleOn", true); }

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
        if (type == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return;
        if (type == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED || type == AccessibilityEvent.TYPE_VIEW_FOCUSED
                || type == AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED) {
            if (!allowedApps().contains(pkg)) return;
            app = pkg;
            if (e.isPassword()) { text = ""; } else {
                String t = readText(e);
                if (t != null) text = t;
            }
            if (shown) js("onText", JSONObject.quote(text));
            checkKeyboard();
        } else if (type == AccessibilityEvent.TYPE_WINDOWS_CHANGED || type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg.length() > 0 && !pkg.equals("com.android.systemui")) {
                // mudou de app
                if (!allowedApps().contains(pkg) && !isImePackage(pkg)) app = "";
                else if (allowedApps().contains(pkg)) app = pkg;
            }
            checkKeyboard();
        }
    }

    boolean isImePackage(String pkg) {
        String cur = Settings.Secure.getString(getContentResolver(), "default_input_method");
        return cur != null && cur.startsWith(pkg + "/");
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

    /** Verifica se o teclado está à vista e decide se mostra a bolha. */
    void checkKeyboard() {
        boolean ime = false;
        try {
            List<AccessibilityWindowInfo> ws = getWindows();
            for (AccessibilityWindowInfo w : ws) {
                if (w.getType() == AccessibilityWindowInfo.TYPE_INPUT_METHOD) { ime = true; w.getBoundsInScreen(imeRect); }
            }
        } catch (Exception ignored) {}
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
            @Override public void onPageFinished(WebView v, String url) { pageReady = true; js("onText", JSONObject.quote(text)); js("onSpecial", Specials.state()); }
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
        js("onText", JSONObject.quote(text));
    }

    void hide() {
        if (!shown) return;
        try { wm.removeView(web); } catch (Exception ignored) {}
        shown = false; expanded = false;
    }

    void positionPanel() {
        if (!shown || lp == null) return;
        int sw = getResources().getDisplayMetrics().widthPixels;
        int h = dp(244);
        int top = imeRect.top > 0 ? imeRect.top : getResources().getDisplayMetrics().heightPixels / 2;
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

        @JavascriptInterface public void hideNow() {
            ui.post(new Runnable() { @Override public void run() { hide(); } });
        }
    }
}
