package com.josejunior.sticktag;

/** Sticker escolhido na bolha, à espera que o teclado de stickers abra para o enviar. */
public final class Pending {
    private Pending() {}

    static String pack, file;
    static long time;

    static synchronized void set(String p, String f) { pack = p; file = f; time = System.currentTimeMillis(); }

    static synchronized void clear() { pack = null; file = null; time = 0; }

    /** Devolve {pack, file} se houver um pedido recente (menos de 6 s), e limpa-o. */
    static synchronized String[] take() {
        if (pack == null || System.currentTimeMillis() - time > 6000) { clear(); return null; }
        String[] r = {pack, file};
        clear();
        return r;
    }
}
