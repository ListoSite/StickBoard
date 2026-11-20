package com.josejunior.sticktag;

import org.json.JSONObject;

/**
 * O ambiente da conversa: as últimas mensagens que a bolha leu (só em memória, nunca guardadas)
 * e a pergunta «em que situação usaste este sticker?» que fica à espera de resposta.
 */
final class Vibe {
    private Vibe() {}

    /* ---- as últimas mensagens da conversa aberta: [{"d":1 recebida / -1 minha, "t":"texto"}] ---- */
    static volatile String chatJson = "[]";
    static volatile String chatKey = "";
    static volatile long chatAt = 0;

    /** As mensagens da conversa (vazio se forem antigas ou de outra conversa/app). */
    static String chat(String pkg) {
        if (System.currentTimeMillis() - chatAt > 30 * 60 * 1000L) return "[]";
        if (pkg != null && pkg.length() > 0 && chatKey.length() > 0 && !chatKey.startsWith(pkg + "|")) return "[]";
        return chatJson;
    }

    /** Guarda as mensagens lidas; devolve true se mudaram. */
    static boolean setChat(String key, String json) {
        boolean changed = !json.equals(chatJson) || !key.equals(chatKey);
        chatJson = json; chatKey = key; chatAt = System.currentTimeMillis();
        return changed;
    }

    /* ---- a pergunta à espera: {"p","f","guess","words":[…]} ---- */
    static volatile String askJson = null;
    static volatile long askAt = 0;
    static final long ASK_MS = 15 * 60 * 1000L;

    static void ask(String json) {
        try { new JSONObject(json); } catch (Exception e) { return; }
        askJson = json; askAt = System.currentTimeMillis();
        notifyViews();
    }

    static String get() {
        String a = askJson;
        if (a != null && System.currentTimeMillis() - askAt > ASK_MS) { askJson = null; a = null; }
        return a == null ? "" : a;
    }

    static void clear() { askJson = null; notifyViews(); }

    /** A bolha fica amarela (ou volta ao normal). */
    static void notifyViews() {
        BubbleService b = BubbleService.inst;
        if (b != null) b.js("onAsk", JSONObject.quote(get()));
        KeyboardService k = KeyboardService.inst;
        if (k != null) k.js("onAsk", JSONObject.quote(get()));
    }
}
