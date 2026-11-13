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

    /* registo para perceber o que o motor viu (aparece na app, separador Especiais) */
    static final java.util.LinkedList<String> LOG = new java.util.LinkedList<String>();

    static void log(String m) {
        synchronized (LOG) {
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.ROOT);
            LOG.addFirst(f.format(new java.util.Date()) + "  " + m);
            while (LOG.size() > 60) LOG.removeLast();
        }
    }

    static String logJson() {
        JSONArray a = new JSONArray();
        synchronized (LOG) { for (String x : LOG) a.put(x); }
        return a.toString();
    }

    static String rowStr(ChatDiff.Row x) {
        String t = x.readable();
        if (t.length() > 60) t = t.substring(0, 60) + "…";
        return (x.dir > 0 ? "recebida" : x.dir < 0 ? "minha" : "aviso") + " «" + t + "»";
    }

    static final class Run {
        int gen; String id, name, type, pkg, chat;
        long nextGap;
        int waitGen, qIndex, score, nudged;
        String then;
        ChatDiff.Row late;
        boolean focused;
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

    /** O especial que começa com este sticker (o 1.º da lista), ou null. */
    static String findByFirst(Context c, String pack, String file) {
        JSONArray a = Store.load(c).optJSONArray("specials");
        if (a != null) for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            JSONObject f = o == null ? null : o.optJSONObject("first");
            if (f != null && pack.equals(f.optString("p")) && file.equals(f.optString("f")) && !"secret".equals(o.optString("type"))) return o.optString("id");
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

    /** Tipos que esperam pela resposta da outra pessoa. */
    static boolean waitsReply(String t) {
        return t.equals("reply") || t.equals("choice") || t.equals("quiz") || t.equals("game") || t.equals("nudge");
    }

    static final Random RND = new Random();

    static Pending.Item pick(JSONArray a, long gap) {
        List<Pending.Item> l = items(a, gap, gap);
        if (l.isEmpty()) return null;
        Pending.Item x = l.get(RND.nextInt(l.size()));
        return new Pending.Item(x.pack, x.file, gap);
    }

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
        if (waitsReply(r.type) && b == null) {
            toast("⚡ Para o StickTag ler a resposta, liga a bolha (StickTag › Teclado)");
            return;
        }
        run = r;
        log("▶ «" + r.name + "» (" + r.type + ") em " + r.pkg + (r.chat != null ? " · conversa «" + r.chat + "»" : "") + (b == null ? " · bolha desligada" : ""));
        if (r.type.equals("seq") || r.type.equals("typing")) {
            r.queue.addAll(items(d.optJSONArray("steps"), 2000, 2000));
        } else if (r.type.equals("random")) {
            Pending.Item x = pick(d.optJSONArray("pool"), Math.round(d.optDouble("delay", 2) * 1000));
            if (x != null) r.queue.add(x);
        } else {
            H.postDelayed(new Runnable() { @Override public void run() { scan(); } }, 300);
            beginWait(r, true);
        }
        notifyState();
        toast(r.waiting ? "⚡ «" + r.name + "» à espera da resposta…" : "⚡ «" + r.name + "» a correr…");
        pump();
    }

    /** Começa (ou volta) a esperar pela resposta, com os tempos de desistir, contagem e insistência. */
    static void beginWait(final Run r, boolean first) {
        r.waiting = true;
        final int wg = ++r.waitGen;
        final JSONObject d = r.def;
        long maxWait = Math.max(30, d.optInt("maxWait", 300)) * 1000L;
        if (r.type.equals("nudge")) {
            JSONArray nl = d.optJSONArray("nudges");
            int n = nl == null ? 0 : nl.length();
            maxWait = Math.max(maxWait, d.optInt("every", 60) * 1000L * (n + 1) + 60000);
        }
        H.postDelayed(new Runnable() {
            @Override public void run() {
                if (run != r || r.waitGen != wg || !r.waiting) return;
                log("■ sem resposta a tempo");
                end();
                toast("⚡ «" + r.name + "» terminou: não chegou resposta");
            }
        }, maxWait);
        JSONObject nr = d.optJSONObject("noReply");
        if (first && (r.type.equals("reply") || r.type.equals("choice")) && nr != null && nr.optInt("secs", 0) > 0
                && nr.optJSONArray("stickers") != null && nr.optJSONArray("stickers").length() > 0) {
            H.postDelayed(new Runnable() {
                @Override public void run() {
                    if (run != r || r.waitGen != wg || !r.waiting) return;
                    r.waiting = false;
                    log("💣 não respondeu a tempo: spam!");
                    r.queue.addAll(items(d.optJSONObject("noReply").optJSONArray("stickers"), 0, 700));
                    notifyState();
                    pump();
                }
            }, nr.optInt("secs") * 1000L);
        }
        if (r.type.equals("nudge")) {
            H.postDelayed(new Runnable() {
                @Override public void run() {
                    if (run != r || r.waitGen != wg || !r.waiting) return;
                    List<Pending.Item> l = items(d.optJSONArray("nudges"), 0, 0);
                    if (r.nudged >= l.size()) return; // já insistiu tudo: só espera
                    Pending.Item x = l.get(r.nudged++);
                    log("🔔 insistir " + r.nudged + "/" + l.size());
                    r.waiting = false;
                    r.queue.add(new Pending.Item(x.pack, x.file, 0));
                    r.then = "wait";
                    notifyState();
                    pump();
                }
            }, Math.max(15, d.optInt("every", 60)) * 1000L);
        }
    }

    static void end() {
        run = null;
        notifyState();
        releaseKeyboard();
    }

    /** Se o motor deixou o teclado de stickers aberto entre envios, volta ao teclado anterior. */
    static void releaseKeyboard() {
        final KeyboardService k = KeyboardService.inst;
        if (k != null && k.engineHolding) {
            k.engineHolding = false;
            H.postDelayed(new Runnable() { @Override public void run() { k.switchBack(); } }, 300);
        }
    }

    /** Pára o especial ativo. reason = null → sem aviso. */
    static void cancel(String reason) {
        if (run == null) return;
        String n = run.name;
        run = null;
        notifyState();
        releaseKeyboard();
        log("✕ cancelado" + (reason != null ? ": " + reason : ""));
        if (reason != null) toast("⚡ «" + n + "» cancelado: " + reason);
    }

    /** Enviaste um sticker normal pelo StickTag: o especial ativo pára. */
    static void onUserSent() { cancel("enviaste outro sticker"); }

    /* ---------- envio ---------- */

    static void pump() {
        final Run r = run;
        if (r == null || r.busy) return;
        if (r.queue.isEmpty()) {
            if ("wait".equals(r.then)) {
                r.then = null; beginWait(r, false); notifyState();
                if (r.late != null) { ChatDiff.Row l = r.late; r.late = null; onReply(l); }
                return;
            }
            if (!r.waiting) {
                String n = r.name;
                boolean eco = r.type.equals("eco");
                log("■ terminado");
                end();
                if (!eco) toast("⚡ «" + n + "» terminado ✓");
            }
            return;
        }
        Pending.Item head = r.queue.remove(0);
        final List<Pending.Item> batch = new ArrayList<Pending.Item>();
        batch.add(new Pending.Item(head.pack, head.file, 0));
        // os seguintes com pouca espera vão juntos (sem trocar de teclado entre eles)
        while (!r.queue.isEmpty() && r.queue.get(0).gap <= 1500) batch.add(r.queue.remove(0));
        r.busy = true;
        r.nextGap = head.gap;
        final int gen = r.gen;
        H.postDelayed(new Runnable() { @Override public void run() { dispatch(gen, batch); } }, head.gap);
    }

    static void dispatch(final int gen, final List<Pending.Item> batch) {
        final Run r = run;
        if (r == null || r.gen != gen) return;
        final BubbleService b = BubbleService.inst;
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
        boolean direct = k != null && k.canDirect(r.pkg);
        // teclado fechado: toca na caixa de texto para o abrir e tenta outra vez
        if (!direct && b != null && !r.focused && b.imeHeight() == 0) {
            r.focused = true;
            log("teclado fechado: a abrir a caixa de texto");
            b.focusEntry(r.pkg);
            H.postDelayed(new Runnable() { @Override public void run() { dispatch(gen, batch); } }, 900);
            return;
        }
        r.focused = false;
        log("➤ a enviar " + batch.size() + " sticker" + (batch.size() > 1 ? "s" : "") + (direct ? " (teclado aberto)" : " (pela bolha)"));
        if (direct) {
            k.runBatch(batch, k.engineHolding, gen);
        } else if (b != null) {
            Pending.setBatch(batch, gen, b.imeHeight(), "⚡ " + r.name);
            if (!b.switchToStickers()) { Pending.clear(); cancel("não consegui abrir o teclado de stickers"); return; }
            final long tt = total;
            H.postDelayed(new Runnable() {
                @Override public void run() {
                    if (run != null && run.gen == gen && run.busy) { Pending.clear(); cancel("o teclado de stickers não respondeu"); }
                }
            }, 6000 + tt);
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

    static boolean isWhatsApp(String pkg) { return pkg.equals("com.whatsapp") || pkg.equals("com.whatsapp.w4b"); }

    static void onA11y(BubbleService b, AccessibilityEvent e, String pkg) {
        if (ctx == null) ctx = b.getApplicationContext();
        Run r = run;
        if (r == null) {
            if (isWhatsApp(pkg) && ecoOn(b)) queueScan();
            return;
        }
        if (!pkg.equals(r.pkg)) return;
        int type = e.getEventType();
        if (type == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED && isEditable(e)) {
            String t = b.readText(e);
            if (t != null && t.trim().length() > 0 && System.currentTimeMillis() - r.started > 1500) { cancel("começaste a escrever"); return; }
        }
        queueScan();
    }

    static void queueScan() {
        if (scanQueued) return;
        scanQueued = true;
        H.postDelayed(new Runnable() { @Override public void run() { scanQueued = false; scan(); } }, 450);
    }

    /** Só conta o que escreves na caixa de texto (não outras partes do ecrã que mudam). */
    static boolean isEditable(AccessibilityEvent e) {
        try { AccessibilityNodeInfo n = e.getSource(); return n != null && n.isEditable(); } catch (Exception x) { return false; }
    }

    static void scan() {
        final Run r = run;
        BubbleService b = BubbleService.inst;
        if (b == null) return;
        if (r == null) { ecoScan(b); return; }
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
        if (r.base == null) { r.base = rows; log("conversa lida: " + rows.size() + " linhas, última " + rowStr(rows.get(rows.size() - 1))); return; }
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
        r.base = rows;
        for (ChatDiff.Row x : nw) {
            log("nova: " + rowStr(x) + (x.dir < 0 && ignoring ? " (enviada pelo StickTag)" : ""));
            if (x.dir < 0 && !ignoring) { cancel("respondeste na conversa"); return; }
            if (x.dir > 0 && r.waiting && onReply(x)) return;
            if (x.dir > 0 && !r.waiting && "wait".equals(r.then) && r.late == null) r.late = x; // respondeu enquanto o StickTag enviava
        }
    }

    /* ---------- Eco: responde sozinho quando a pessoa escreve certas palavras ---------- */

    static JSONObject ecoCfg;
    static long ecoMtime = -1;
    static final java.util.HashMap<String, List<ChatDiff.Row>> ECO_BASE = new java.util.HashMap<String, List<ChatDiff.Row>>();
    static final java.util.HashMap<String, Long> ECO_LAST = new java.util.HashMap<String, Long>();

    static JSONObject eco(Context c) {
        java.io.File f = new java.io.File(Store.root(c), "data.json");
        long m = f.lastModified();
        if (m != ecoMtime) { ecoMtime = m; ecoCfg = Store.load(c).optJSONObject("eco"); }
        return ecoCfg;
    }

    static boolean ecoOn(Context c) {
        JSONObject e = eco(c);
        return e != null && e.optBoolean("on") && e.optJSONArray("rules") != null && e.optJSONArray("rules").length() > 0;
    }

    static boolean chatAllowed(String filter, String chat) {
        if (filter == null || filter.trim().length() == 0) return true;
        String c = ChatDiff.norm(chat);
        for (String x : filter.split("[,;\\n]")) {
            String n = ChatDiff.norm(x);
            if (n.length() > 0 && c.contains(n)) return true;
        }
        return false;
    }

    static void ecoScan(BubbleService b) {
        if (!ecoOn(b)) return;
        AccessibilityNodeInfo root;
        try { root = b.getRootInActiveWindow(); } catch (Exception e) { return; }
        if (root == null || root.getPackageName() == null) return;
        String pkg = root.getPackageName().toString();
        if (!isWhatsApp(pkg)) return;
        String chat = chatTitle(root, pkg);
        if (chat == null) return;
        String key = pkg + "|" + chat;
        float dens = b.getResources().getDisplayMetrics().density;
        List<ChatDiff.Row> rows = snapshot(root, Math.round(24 * dens));
        if (rows.isEmpty()) return;
        List<ChatDiff.Row> base = ECO_BASE.get(key);
        if (ECO_BASE.size() > 60) ECO_BASE.clear();
        ECO_BASE.put(key, rows);
        if (base == null) return; // acabaste de abrir a conversa: o que já lá estava não conta
        List<ChatDiff.Row> nw = ChatDiff.newRows(base, rows);
        if (nw == null) return;
        JSONArray rules = eco(b).optJSONArray("rules");
        for (ChatDiff.Row x : nw) {
            if (x.dir <= 0) continue;
            for (int i = 0; rules != null && i < rules.length(); i++) {
                JSONObject rule = rules.optJSONObject(i);
                if (rule == null || rule.optBoolean("off")) continue;
                if (!chatAllowed(rule.optString("chats"), chat)) continue;
                if (!(ChatDiff.matches(x.text, rule.optString("words")) || ChatDiff.matches(x.alt, rule.optString("words")))) continue;
                String lk = key + "|" + rule.optString("id");
                Long last = ECO_LAST.get(lk);
                if (last != null && System.currentTimeMillis() - last < 20000) { log("Eco: «" + rule.optString("words") + "» ignorado (enviado há pouco)"); continue; }
                Pending.Item it = pick(sameMode(b, rule.optJSONArray("stickers")), 1200);
                if (it == null) continue;
                ECO_LAST.put(lk, System.currentTimeMillis());
                startEco(b, rule, it, pkg, chat, x);
                return;
            }
        }
    }

    /** Só os stickers do modo atual (normal ou +18): nunca manda um +18 no modo normal, nem ao contrário. */
    static JSONArray sameMode(Context c, JSONArray list) {
        JSONArray out = new JSONArray();
        if (list == null) return out;
        JSONObject data = Store.load(c);
        boolean on = data.optBoolean("adultMode");
        for (int i = 0; i < list.length(); i++) {
            JSONObject x = list.optJSONObject(i);
            if (x == null) continue;
            JSONObject p = Store.findPack(data, x.optString("p"));
            JSONObject st = p == null ? null : Store.findSticker(p, x.optString("f"));
            if (st == null) continue;
            boolean adult = p.optBoolean("adult") || st.optBoolean("adult");
            if (adult == on) out.put(x);
        }
        return out;
    }

    static void startEco(Context c, JSONObject rule, Pending.Item it, String pkg, String chat, ChatDiff.Row row) {
        ctx = c.getApplicationContext();
        Run r = new Run();
        r.gen = ++GEN; r.id = "eco"; r.def = rule; r.pkg = pkg; r.chat = chat;
        String w = rule.optString("words");
        if (w.length() > 24) w = w.substring(0, 24) + "…";
        r.name = "Eco «" + w + "»"; r.type = "eco";
        r.started = System.currentTimeMillis();
        r.ignoreOut = r.started + 3500;
        r.queue.add(it);
        run = r;
        log("🔁 Eco: " + rowStr(row) + " → sticker");
        notifyState();
        pump();
    }

    /** Chegou uma mensagem. Devolve true se o especial avançou. */
    static boolean onReply(ChatDiff.Row row) {
        Run r = run;
        if (r == null) return false;
        JSONObject d = r.def;
        long first = Math.round(d.optDouble("replyDelay", 1) * 1000);
        String txt = row.readable();
        if (r.type.equals("choice")) {
            JSONArray ops = d.optJSONArray("options");
            List<Pending.Item> got = null;
            if (ops != null) for (int i = 0; i < ops.length() && got == null; i++) {
                JSONObject o = ops.optJSONObject(i);
                if (o != null && (ChatDiff.matches(row.text, o.optString("answers")) || ChatDiff.matches(row.alt, o.optString("answers")))) {
                    got = items(o.optJSONArray("stickers"), first, 1500);
                    log("✓ corresponde à opção " + (i + 1) + " («" + o.optString("answers") + "»)");
                }
            }
            if (got == null || got.isEmpty()) {
                got = items(d.optJSONArray("other"), first, 1500);
                if (got.isEmpty()) { log("· não corresponde a nenhuma opção: continua à espera"); return false; }
                log("· outra resposta");
            }
            r.waiting = false;
            r.queue.addAll(got);
        } else if (r.type.equals("quiz")) {
            JSONArray qs = d.optJSONArray("questions");
            int n = qs == null ? 0 : qs.length();
            JSONObject q = qs == null ? null : qs.optJSONObject(r.qIndex);
            boolean ok = q != null && (ChatDiff.matches(row.text, q.optString("answers")) || ChatDiff.matches(row.alt, q.optString("answers")));
            if (ok) r.score++;
            log((ok ? "✓ certo" : "✗ errado") + " na pergunta " + (r.qIndex + 1) + " («" + txt + "») · " + r.score + "/" + n);
            r.waiting = false;
            Pending.Item fb = pick(d.optJSONArray(ok ? "right" : "wrong"), first);
            long gap = first;
            if (fb != null) { r.queue.add(fb); gap = Math.round(d.optDouble("qDelay", 2) * 1000); }
            r.qIndex++;
            if (r.qIndex < n) {
                JSONObject next = qs.optJSONObject(r.qIndex).optJSONObject("sticker");
                if (next != null) r.queue.add(new Pending.Item(next.optString("p"), next.optString("f"), gap));
                r.then = "wait";
            } else {
                String b = r.score == n ? "resAll" : r.score * 2 >= n ? "resHalf" : "resLow";
                log("🏁 resultado: " + r.score + "/" + n);
                List<Pending.Item> res = items(d.optJSONArray(b), gap, 1500);
                r.queue.addAll(res);
            }
        } else if (r.type.equals("game")) {
            JSONArray mv = d.optJSONArray("moves");
            int theirs = -1;
            for (int i = 0; mv != null && i < mv.length() && theirs < 0; i++) {
                JSONObject m = mv.optJSONObject(i);
                String ans = m.optString("answers") + "," + m.optString("name");
                if (ChatDiff.matches(row.text, ans) || ChatDiff.matches(row.alt, ans)) theirs = i;
            }
            if (theirs < 0) { log("· «" + txt + "» não é uma jogada: continua à espera"); return false; }
            int mine = RND.nextInt(mv.length());
            JSONObject my = mv.optJSONObject(mine), th = mv.optJSONObject(theirs);
            boolean iWin = beats(my, theirs), youWin = beats(th, mine);
            String res = iWin && !youWin ? "iwin" : youWin && !iWin ? "youwin" : "draw";
            log("🎮 a pessoa: " + th.optString("name") + " · eu: " + my.optString("name") + " → " + (res.equals("iwin") ? "ganho eu" : res.equals("youwin") ? "ganha a pessoa" : "empate"));
            r.waiting = false;
            JSONObject ms = my.optJSONObject("sticker");
            if (ms != null) r.queue.add(new Pending.Item(ms.optString("p"), ms.optString("f"), first));
            Pending.Item rs = pick(d.optJSONArray(res), 1500);
            if (rs != null) r.queue.add(rs);
        } else if (r.type.equals("nudge")) {
            r.waiting = false;
            log("✓ respondeu depois de " + r.nudged + " insistência" + (r.nudged == 1 ? "" : "s"));
            r.queue.addAll(items(d.optJSONArray("then"), first, 1500));
        } else {
            r.waiting = false;
            r.queue.addAll(items(d.optJSONArray("then"), first, 1500));
        }
        notifyState();
        pump();
        return true;
    }

    static boolean beats(JSONObject move, int other) {
        JSONArray b = move.optJSONArray("beats");
        for (int i = 0; b != null && i < b.length(); i++) if (b.optInt(i, -1) == other) return true;
        return false;
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
        List<int[]> dirs = new ArrayList<int[]>();
        boolean anyStatus = false;
        for (int i = 0; i < list.getChildCount(); i++) {
            AccessibilityNodeInfo row = list.getChild(i);
            if (row == null) continue;
            Rect u = new Rect();
            List<String> texts = new ArrayList<String>(), descs = new ArrayList<String>();
            boolean[] status = {false};
            collect(row, lb, u, texts, descs, status, 0, new int[]{0});
            if (u.isEmpty()) continue;
            int lg = u.left - lb.left, rg = lb.right - u.right;
            int dir = Math.abs(lg - rg) < minGap ? 0 : (lg < rg ? 1 : -1);
            if (status[0]) { dir = -1; anyStatus = true; }
            dirs.add(new int[]{dir, status[0] ? 1 : 0});
            StringBuilder sig = new StringBuilder(), txt = new StringBuilder();
            for (String s : texts) {
                if (sig.length() > 0) sig.append('¦');
                sig.append(s);
                if (!ChatDiff.isTime(s)) { if (txt.length() > 0) txt.append(' '); txt.append(s); }
            }
            String sg = sig.length() > 300 ? sig.substring(0, 300) : sig.toString();
            StringBuilder alt = new StringBuilder();
            for (String s : descs) { if (alt.length() > 0) alt.append(' '); alt.append(s); }
            out.add(new ChatDiff.Row(dir, sg, txt.toString(), alt.toString()));
            tops.add(new int[]{u.top, out.size() - 1});
        }
        // no WhatsApp as minhas mensagens têm o ícone de estado (✓✓): as outras (fora dos avisos) são recebidas
        if (anyStatus) for (int i = 0; i < out.size(); i++) {
            ChatDiff.Row x = out.get(i);
            if (dirs.get(i)[1] == 0 && x.dir < 0) out.set(i, new ChatDiff.Row(1, x.sig.length() > 0 ? x.sig : "", x.text, x.alt));
        }
        // por ordem de cima para baixo
        Collections.sort(tops, new Comparator<int[]>() { @Override public int compare(int[] a, int[] b) { return a[0] - b[0]; } });
        List<ChatDiff.Row> sorted = new ArrayList<ChatDiff.Row>();
        for (int[] t : tops) sorted.add(out.get(t[1]));
        return sorted;
    }

    static void collect(AccessibilityNodeInfo n, Rect lb, Rect u, List<String> texts, List<String> descs, boolean[] status, int depth, int[] count) {
        if (n == null || depth > 12 || count[0] > 150) return;
        count[0]++;
        if (!n.isVisibleToUser()) return;
        String vid = n.getViewIdResourceName();
        if (vid != null && vid.endsWith(":id/status")) status[0] = true;
        CharSequence cd = n.getContentDescription();
        if (cd != null && cd.toString().trim().length() > 0) descs.add(cd.toString().trim());
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
        for (int k = 0; k < n.getChildCount(); k++) collect(n.getChild(k), lb, u, texts, descs, status, depth + 1, count);
    }
}
