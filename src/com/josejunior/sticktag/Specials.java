package com.josejunior.sticktag;

import android.content.Context;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Motor dos stickers especiais: sequências com tempo, respostas automáticas,
 * perguntas com opções e envios ao calhas.
 * Envia através do teclado de stickers e lê a conversa através da bolha (acessibilidade).
 */
public final class Specials {
    private Specials() {}

    static final Handler H = new Handler(Looper.getMainLooper());
    static Context ctx;
    static Run run;
    static int GEN = 0;
    static boolean scanQueued = false;

    static final class Run {
        int gen; String id, name, type, pkg, chat;
        JSONObject def;
        boolean waiting, busy;
        long started, waitUntil, ignoreOut;
        List<ChatDiff.Row> base;
        final List<Pending.Item> queue = new ArrayList<Pending.Item>();
    }

    /* ---------- dados ---------- */

    static JSONObject find(Context c, String id) {
        JSONArray a = Store.load(c).optJSONArray("specials");
        if (a != null) for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && id.equals(o.optString("id"))) return o;
        }
        return null;
    }

    /** Lista de stickers {p,f,d} → envios. d = segundos de espera antes (senão usa o valor dado). */
    static List<Pending.Item> items(JSONArray a, long firstGap, long gap) {
        List<Pending.Item> l = new ArrayList<Pending.Item>();
        if (a == null) return l;
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null || o.optString("p").length() == 0) continue;
            long g = o.has("d") ? Math.round(o.optDouble("d", 2) * 1000) : (l.isEmpty() ? firstGap : gap);
            l.add(new Pending.Item(o.optString("p"), o.optString("f"), Math.max(0, g)));
        }
        return l;
    }

    static void toast(final String m) {
        if (ctx == null) return;
        H.post(new Runnable() { @Override public void run() { try { Toast.makeText(ctx, m, Toast.LENGTH_SHORT).show(); } catch (Exception ignored) {} } });
    }

    static String state() {
        try {
            if (run == null) return "null";
            JSONObject o = new JSONObject();
            o.put("id", run.id); o.put("name", run.name); o.put("type", run.type); o.put("waiting", run.waiting);
            return o.toString();
        } catch (Exception e) { return "null"; }
    }

    static void notifyState() {
        BubbleService b = BubbleService.inst;
        if (b != null) b.js("onSpecial", state());
    }

    /* ---------- começar / acabar ---------- */

    /** Chamado pelo teclado depois de enviar o 1.º sticker de um especial. */
    static void start(Context c, String id, String pkg) {
        ctx = c.getApplicationContext();
        cancel(null);
        JSONObject d = find(c, id);
        if (d == null) return;
        final Run r = new Run();
        r.gen = ++GEN; r.id = id; r.def = d; r.pkg = pkg == null ? "" : pkg;
        r.name = d.optString("name", "Especial"); r.type = d.optString("type", "seq");
        r.started = System.currentTimeMillis();
        r.ignoreOut = r.started + 3500;
        BubbleService b = BubbleService.inst;
        r.chat = b != null ? b.chatTitle(r.pkg) : null;
        run = r;
        if (r.type.equals("seq")) {
            r.queue.addAll(items(d.optJSONArray("steps"), 2000, 2000));
        } else if (r.type.equals("random")) {
            List<Pending.Item> pool = items(d.optJSONArray("pool"), 0, 0);
            if (!pool.isEmpty()) {
                Pending.Item x = pool.get(new Random().nextInt(pool.size()));
                r.queue.add(new Pending.Item(x.pack, x.file, Math.round(d.optDouble("delay", 2) * 1000)));
            }
        } else {
            if (b == null) {
                run = null;
                toast("⚡ Para o StickTag ler a resposta, liga a bolha (StickTag › Teclado)");
                return;
            }
            r.waiting = true;
            r.waitUntil = r.started + Math.max(30, d.optInt("maxWait", 300)) * 1000L;
            final int gen = r.gen;
            H.postDelayed(new Runnable() { @Override public void run() { scan(); } }, 300);
            JSONObject nr = d.optJSONObject("noReply");
            if (nr != null && nr.optInt("secs", 0) > 0 && nr.optJSONArray("stickers") != null && nr.optJSONArray("stickers").length() > 0) {
                H.postDelayed(new Runnable() {
                    @Override public void run() {
                        if (run == null || run.gen != gen || !run.waiting) return;
                        run.waiting = false;
                        run.queue.addAll(items(run.def.optJSONObject("noReply").optJSONArray("stickers"), 0, 700));
                        notifyState();
                        pump();
                    }
                }, nr.optInt("secs") * 1000L);
            }
            H.postDelayed(new Runnable() {
                @Override public void run() {
                    if (run == null || run.gen != gen || !run.waiting) return;
                    String n = run.name;
                    end();
                    toast("⚡ «" + n + "» terminou: não chegou resposta");
                }
            }, r.waitUntil - r.started);
        }
        notifyState();
        toast(r.waiting ? "⚡ «" + r.name + "» à espera da resposta…" : "⚡ «" + r.name + "» a correr…");
        pump();
    }

    static void end() {
        run = null;
        notifyState();
    }

    /** Pára o especial ativo. reason = null → sem aviso. */
    static void cancel(String reason) {
        if (run == null) return;
        String n = run.name;
        run = null;
        notifyState();
        if (reason != null) toast("⚡ «" + n + "» cancelado: " + reason);
    }

    /** Enviaste um sticker normal pelo StickTag: o especial ativo pára. */
    static void onUserSent() { cancel("enviaste outro sticker"); }

    /* ---------- envio ---------- */

    static void pump() {
        final Run r = run;
        if (r == null || r.busy) return;
        if (r.queue.isEmpty()) {
            if (!r.waiting) end();
            return;
        }
        Pending.Item head = r.queue.remove(0);
        final List<Pending.Item> batch = new ArrayList<Pending.Item>();
        batch.add(new Pending.Item(head.pack, head.file, 0));
        // os seguintes com pouca espera vão juntos (sem trocar de teclado entre eles)
        while (!r.queue.isEmpty() && r.queue.get(0).gap <= 1500) batch.add(r.queue.remove(0));
        r.busy = true;
        final int gen = r.gen;
        H.postDelayed(new Runnable() { @Override public void run() { dispatch(gen, batch); } }, head.gap);
    }

    static void dispatch(final int gen, List<Pending.Item> batch) {
        final Run r = run;
        if (r == null || r.gen != gen) return;
        BubbleService b = BubbleService.inst;
        if (b != null) {
            String cur = b.activePackage();
            if (cur != null && !cur.equals(r.pkg)) { cancel("saíste da conversa"); return; }
            String t = b.chatTitle(r.pkg);
            if (r.chat != null && (t == null || !t.equals(r.chat))) { cancel("saíste da conversa"); return; }
        }
        long total = 0;
        for (Pending.Item x : batch) total += x.gap;
        r.ignoreOut = System.currentTimeMillis() + 3500 + total;
        KeyboardService k = KeyboardService.inst;
        if (k != null && k.canDirect(r.pkg)) {
            k.runBatch(batch, false, gen);
        } else if (b != null) {
            Pending.setBatch(batch, gen);
            if (!b.switchToStickers()) { Pending.clear(); cancel("não consegui abrir o teclado de stickers"); return; }
            H.postDelayed(new Runnable() {
                @Override public void run() {
                    if (run != null && run.gen == gen && run.busy) { Pending.clear(); cancel("o teclado de stickers não respondeu"); }
                }
            }, 6000 + total);
        } else {
            cancel("o teclado de stickers fechou (liga a bolha para correr em segundo plano)");
        }
    }

    /** O teclado acabou de enviar um lote. */
    static void batchDone(int gen, boolean ok) {
        Run r = run;
        if (r == null || r.gen != gen) return;
        if (!ok) { cancel("não deu para enviar o sticker"); return; }
        r.busy = false;
        r.ignoreOut = System.currentTimeMillis() + 3500;
        pump();
    }

    /* ---------- ler a conversa ---------- */

    static void onA11y(BubbleService b, AccessibilityEvent e, String pkg) {
        Run r = run;
        if (r == null) return;
        if (ctx == null) ctx = b.getApplicationContext();
        if (!pkg.equals(r.pkg)) return;
        int type = e.getEventType();
        if (type == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            String t = b.readText(e);
            if (t != null && t.trim().length() > 0 && System.currentTimeMillis() - r.started > 1500) { cancel("começaste a escrever"); return; }
        }
        if (!scanQueued) {
            scanQueued = true;
            H.postDelayed(new Runnable() { @Override public void run() { scanQueued = false; scan(); } }, 450);
        }
    }

    static void scan() {
        final Run r = run;
        BubbleService b = BubbleService.inst;
        if (r == null || b == null) return;
        AccessibilityNodeInfo root;
        try { root = b.getRootInActiveWindow(); } catch (Exception e) { return; }
        if (root == null || root.getPackageName() == null || !r.pkg.equals(root.getPackageName().toString())) return;
        String t = chatTitle(root, r.pkg);
        if (r.chat == null && t != null) r.chat = t;
        if (r.chat != null) {
            if (t == null) return; // fora da conversa (ex.: lista de chats)
            if (!t.equals(r.chat)) { cancel("mudaste de conversa"); return; }
        }
        float dens = b.getResources().getDisplayMetrics().density;
        List<ChatDiff.Row> rows = snapshot(root, Math.round(24 * dens));
        if (rows.isEmpty()) return;
        if (r.base == null) { r.base = rows; return; }
        List<ChatDiff.Row> nw = ChatDiff.newRows(r.base, rows);
        if (nw == null) {
            // não deu para comparar: se a conversa ficou parada no fim, recomeça a partir daqui
            boolean known = false;
            ChatDiff.Row last = rows.get(rows.size() - 1);
            for (ChatDiff.Row x : r.base) if (x.same(last)) { known = true; break; }
            if (!known && System.currentTimeMillis() < r.ignoreOut) r.base = rows;
            return;
        }
        boolean ignoring = System.currentTimeMillis() < r.ignoreOut;
        for (ChatDiff.Row x : nw) {
            if (x.dir < 0 && !ignoring) { cancel("respondeste na conversa"); return; }
            if (x.dir > 0 && r.waiting) { r.base = rows; onReply(x); return; }
        }
        r.base = rows;
    }

    static void onReply(ChatDiff.Row row) {
        Run r = run;
        if (r == null) return;
        JSONObject d = r.def;
        long first = Math.round(d.optDouble("replyDelay", 1) * 1000);
        if (r.type.equals("choice")) {
            JSONArray ops = d.optJSONArray("options");
            List<Pending.Item> got = null;
            if (ops != null) for (int i = 0; i < ops.length() && got == null; i++) {
                JSONObject o = ops.optJSONObject(i);
                if (o != null && ChatDiff.matches(row.text, o.optString("answers"))) got = items(o.optJSONArray("stickers"), first, 1500);
            }
            if (got == null || got.isEmpty()) {
                got = items(d.optJSONArray("other"), first, 1500);
                if (got.isEmpty()) return; // resposta que não conta: continua à espera
            }
            r.waiting = false;
            r.queue.addAll(got);
        } else {
            r.waiting = false;
            r.queue.addAll(items(d.optJSONArray("then"), first, 1500));
        }
        notifyState();
        pump();
    }

    /** Nome da conversa aberta (só no WhatsApp; nas outras apps devolve null). */
    static String chatTitle(AccessibilityNodeInfo root, String pkg) {
        if (root == null || pkg == null) return null;
        try {
            List<AccessibilityNodeInfo> l = root.findAccessibilityNodeInfosByViewId(pkg + ":id/conversation_contact_name");
            if (l != null) for (AccessibilityNodeInfo n : l) {
                CharSequence t = n.getText();
                if (t != null && t.length() > 0) return t.toString();
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** Lê as linhas visíveis da conversa (a lista com scroll maior do ecrã). */
    static List<ChatDiff.Row> snapshot(AccessibilityNodeInfo root, int minGap) {
        List<ChatDiff.Row> out = new ArrayList<ChatDiff.Row>();
        AccessibilityNodeInfo list = null;
        long best = 0;
        List<AccessibilityNodeInfo> q = new ArrayList<AccessibilityNodeInfo>();
        q.add(root);
        Rect rb = new Rect();
        for (int i = 0; i < q.size() && i < 2500; i++) {
            AccessibilityNodeInfo n = q.get(i);
            if (n == null) continue;
            if (n.isScrollable()) {
                n.getBoundsInScreen(rb);
                long area = (long) rb.width() * rb.height();
                CharSequence cn = n.getClassName();
                if (cn != null && (cn.toString().contains("ListView") || cn.toString().contains("RecyclerView"))) area = area * 3 / 2;
                if (area > best) { best = area; list = n; }
            }
            for (int k = 0; k < n.getChildCount(); k++) q.add(n.getChild(k));
        }
        if (list == null) return out;
        Rect lb = new Rect();
        list.getBoundsInScreen(lb);
        final List<int[]> tops = new ArrayList<int[]>();
        for (int i = 0; i < list.getChildCount(); i++) {
            AccessibilityNodeInfo row = list.getChild(i);
            if (row == null) continue;
            Rect u = new Rect();
            List<String> texts = new ArrayList<String>();
            collect(row, lb, u, texts, 0, new int[]{0});
            if (u.isEmpty()) continue;
            int lg = u.left - lb.left, rg = lb.right - u.right;
            int dir = Math.abs(lg - rg) < minGap ? 0 : (lg < rg ? 1 : -1);
            StringBuilder sig = new StringBuilder(), txt = new StringBuilder();
            for (String s : texts) {
                if (sig.length() > 0) sig.append('¦');
                sig.append(s);
                if (!ChatDiff.isTime(s)) { if (txt.length() > 0) txt.append(' '); txt.append(s); }
            }
            String sg = sig.length() > 300 ? sig.substring(0, 300) : sig.toString();
            out.add(new ChatDiff.Row(dir, sg, txt.toString()));
            tops.add(new int[]{u.top, out.size() - 1});
        }
        // por ordem de cima para baixo
        Collections.sort(tops, new Comparator<int[]>() { @Override public int compare(int[] a, int[] b) { return a[0] - b[0]; } });
        List<ChatDiff.Row> sorted = new ArrayList<ChatDiff.Row>();
        for (int[] t : tops) sorted.add(out.get(t[1]));
        return sorted;
    }

    static void collect(AccessibilityNodeInfo n, Rect lb, Rect u, List<String> texts, int depth, int[] count) {
        if (n == null || depth > 12 || count[0] > 150) return;
        count[0]++;
        Rect b = new Rect();
        n.getBoundsInScreen(b);
        CharSequence t = n.getText();
        CharSequence cn = n.getClassName();
        boolean img = cn != null && cn.toString().contains("Image");
        boolean hasText = t != null && t.toString().trim().length() > 0;
        if ((hasText || img) && b.width() > 0 && b.height() > 0 && b.width() < lb.width() * 0.92) {
            if (u.isEmpty()) u.set(b); else u.union(b);
        }
        if (hasText) texts.add(t.toString().trim());
        for (int k = 0; k < n.getChildCount(); k++) collect(n.getChild(k), lb, u, texts, depth + 1, count);
    }
}
