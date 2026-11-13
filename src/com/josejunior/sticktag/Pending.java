package com.josejunior.sticktag;

import java.util.ArrayList;
import java.util.List;

/**
 * Pedido de envio à espera que o teclado de stickers abra:
 * um sticker da bolha, o primeiro sticker de um especial, ou um lote enviado pelo motor dos especiais.
 */
public final class Pending {
    private Pending() {}

    /** Um envio: pack, ficheiro e quanto esperar antes dele (ms). */
    static final class Item {
        final String pack, file; final long gap;
        Item(String p, String f, long g) { pack = p; file = f; gap = g; }
    }

    static final class Req {
        List<Item> items = new ArrayList<Item>();
        String special;   // id do especial a começar depois do 1.º envio
        boolean engine;   // enviado pelo motor (não cancela nada, sem partilha)
        int gen;          // geração do motor (para ignorar respostas antigas)
    }

    static Req req;
    static long time;

    static synchronized void set(String p, String f) {
        Req r = new Req(); r.items.add(new Item(p, f, 0)); req = r; time = System.currentTimeMillis();
    }

    static synchronized void setSpecial(String id, String p, String f) {
        Req r = new Req(); r.items.add(new Item(p, f, 0)); r.special = id; req = r; time = System.currentTimeMillis();
    }

    static synchronized void setBatch(List<Item> items, int gen) {
        Req r = new Req(); r.items.addAll(items); r.engine = true; r.gen = gen; req = r; time = System.currentTimeMillis();
    }

    static synchronized void clear() { req = null; time = 0; }

    /** Devolve o pedido se for recente (menos de 6 s) e limpa-o. */
    static synchronized Req take() {
        if (req == null || System.currentTimeMillis() - time > 6000) { clear(); return null; }
        Req r = req;
        clear();
        return r;
    }
}
