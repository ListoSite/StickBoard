package com.josejunior.sticktag;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Lógica pura (sem Android) para perceber as mensagens novas de uma conversa
 * e se uma resposta corresponde às respostas esperadas.
 */
public final class ChatDiff {
    private ChatDiff() {}

    /** Uma linha da conversa: dir 1 = recebida, -1 = enviada por mim, 0 = aviso/data. */
    public static final class Row {
        public final int dir; public final String sig, text, alt;
        public Row(int dir, String sig, String text) { this(dir, sig, text, ""); }
        public Row(int dir, String sig, String text, String alt) { this.dir = dir; this.sig = sig; this.text = text; this.alt = alt == null ? "" : alt; }
        /** Texto para comparar com as respostas (o da mensagem e, se não houver, a descrição). */
        public String readable() { return text.trim().length() > 0 ? text : alt; }
        boolean same(Row o) { return o != null && dir == o.dir && sig.equals(o.sig); }
        @Override public String toString() { return (dir > 0 ? "IN " : dir < 0 ? "OUT " : "-- ") + sig; }
    }

    static final Pattern TIME = Pattern.compile("^\\s*\\d{1,2}[:.h]\\d{2}(\\s*[ap]\\.?\\s*m\\.?)?\\s*$", Pattern.CASE_INSENSITIVE);

    public static boolean isTime(String s) { return s != null && TIME.matcher(s).matches(); }

    /**
     * Linhas que apareceram depois do fim da conversa guardada (base).
     * Devolve null se não der para saber (a conversa andou para cima, por exemplo).
     */
    public static List<Row> newRows(List<Row> base, List<Row> cur) {
        if (base == null || cur == null || base.isEmpty() || cur.isEmpty()) return null;
        int t = Math.min(3, base.size());
        List<Row> tail = base.subList(base.size() - t, base.size());
        // 1.º: as últimas linhas da base aparecem inteiras
        for (int j = cur.size() - 1; j >= t - 1; j--) {
            boolean ok = true;
            for (int k = 0; k < t; k++) if (!cur.get(j - t + 1 + k).same(tail.get(k))) { ok = false; break; }
            if (ok) return new ArrayList<Row>(cur.subList(j + 1, cur.size()));
        }
        // 2.º: só uma parte aparece no topo (o resto saiu do ecrã)
        for (int j = Math.min(t - 2, cur.size() - 1); j >= 0; j--) {
            boolean ok = true;
            for (int k = 0; k <= j; k++) if (!cur.get(k).same(tail.get(t - 1 - j + k))) { ok = false; break; }
            if (ok) return new ArrayList<Row>(cur.subList(j + 1, cur.size()));
        }
        return null;
    }

    public static String norm(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        n = n.replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
        return n;
    }

    /** A mensagem corresponde a alguma das respostas (separadas por vírgulas)? */
    public static boolean matches(String msg, String answers) {
        if (msg == null || answers == null) return false;
        String m = " " + norm(msg) + " ";
        String raw = msg.replace("\uFE0F", "");
        for (String a : answers.split("[,;\\n]")) {
            String x = norm(a);
            if (x.length() == 0) {
                // só emojis (ex.: ✊): procura-os tal e qual
                String e = a.trim().replace("\uFE0F", "");
                if (e.length() > 0 && raw.contains(e)) return true;
                continue;
            }
            if (m.contains(" " + x + " ")) return true;
        }
        return false;
    }
}
