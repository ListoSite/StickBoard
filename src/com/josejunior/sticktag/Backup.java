package com.josejunior.sticktag;

import android.content.Context;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Iterator;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/** Cópia de segurança de todos os packs num ficheiro .zip, e restauro. */
public final class Backup {
    private Backup() {}

    public static String export(Context c, Uri dest) { return export(c, dest, null); }

    public static String export(Context c, Uri dest, Dupes.Progress pr) {
        try {
            JSONObject data = Store.load(c);
            OutputStream os = c.getContentResolver().openOutputStream(dest);
            ZipOutputStream z = new ZipOutputStream(os);
            z.putNextEntry(new ZipEntry("sticktag.json"));
            z.write(data.toString().getBytes(Webp.UTF8));
            z.closeEntry();
            JSONArray packs = data.optJSONArray("packs");
            int n = 0;
            byte[] buf = new byte[16384];
            if (packs != null) for (int i = 0; i < packs.length(); i++) {
                JSONObject p = packs.getJSONObject(i);
                File dir = Store.packDir(c, p.optString("id"));
                File[] files = dir.listFiles();
                if (files == null) continue;
                for (File f : files) {
                    if (pr != null && n % 20 == 0) pr.on(n, -1);
                    z.putNextEntry(new ZipEntry("packs/" + p.optString("id") + "/" + f.getName()));
                    FileInputStream in = new FileInputStream(f);
                    int r;
                    while ((r = in.read(buf)) > 0) z.write(buf, 0, r);
                    in.close();
                    z.closeEntry();
                    n++;
                }
            }
            z.close();
            return new JSONObject().put("ok", true).put("files", n).toString();
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":\"não consegui criar a cópia\"}";
        }
    }

    static boolean safe(String s) {
        return s != null && s.length() > 0 && !s.contains("..") && !s.contains("/") && !s.contains("\\");
    }

    public static String restore(Context c, Uri src) {
        File tmp = new File(c.getCacheDir(), "restore");
        Store.deleteDir(tmp);
        tmp.mkdirs();
        try {
            InputStream in = c.getContentResolver().openInputStream(src);
            ZipInputStream z = new ZipInputStream(in);
            ZipEntry e;
            byte[] json = null;
            byte[] buf = new byte[16384];
            while ((e = z.getNextEntry()) != null) {
                String name = e.getName();
                if (e.isDirectory()) continue;
                if (name.equals("sticktag.json")) { json = Store.readAll(z, 20 * 1024 * 1024); continue; }
                String[] parts = name.split("/");
                if (parts.length != 3 || !parts[0].equals("packs") || !safe(parts[1]) || !safe(parts[2])) continue;
                File d = new File(tmp, parts[1]);
                d.mkdirs();
                java.io.FileOutputStream out = new java.io.FileOutputStream(new File(d, parts[2]));
                int r;
                while ((r = z.read(buf)) > 0) out.write(buf, 0, r);
                out.close();
            }
            z.close();
            if (json == null) return "{\"ok\":false,\"error\":\"este ficheiro não é uma cópia do StickTag\"}";
            JSONObject bk = new JSONObject(new String(json, Webp.UTF8));
            JSONArray bpacks = bk.optJSONArray("packs");
            int restored = 0;
            synchronized (Store.LOCK) {
                JSONObject data = Store.load(c);
                JSONArray cur = data.getJSONArray("packs");
                if (bpacks != null) for (int i = 0; i < bpacks.length(); i++) {
                    JSONObject p = bpacks.getJSONObject(i);
                    String id = p.optString("id");
                    if (!safe(id)) continue;
                    File from = new File(tmp, id);
                    // substitui o pack com o mesmo id, se existir
                    JSONArray n = new JSONArray();
                    for (int k = 0; k < cur.length(); k++) if (!id.equals(cur.getJSONObject(k).optString("id"))) n.put(cur.get(k));
                    cur = n;
                    File dir = Store.packDir(c, id);
                    Store.deleteDir(dir);
                    dir = Store.packDir(c, id);
                    File[] fs = from.listFiles();
                    if (fs != null) for (File f : fs) {
                        if (!f.renameTo(new File(dir, f.getName()))) Store.writeFile(new File(dir, f.getName()), Store.readFile(f));
                    }
                    JSONArray st = p.optJSONArray("stickers");
                    if (st != null) for (int k = 0; k < st.length(); k++) Store.forceExif(st.getJSONObject(k));
                    p.remove("trayFrom");
                    cur.put(p);
                    restored++;
                }
                data.put("packs", cur);
                JSONObject bew = bk.optJSONObject("emojiWords");
                if (bew != null) {
                    JSONObject ew = data.optJSONObject("emojiWords");
                    if (ew == null) { ew = new JSONObject(); data.put("emojiWords", ew); }
                    Iterator<String> it = bew.keys();
                    while (it.hasNext()) { String k = it.next(); ew.put(k, bew.get(k)); }
                }
                for (int i = 0; i < cur.length(); i++) Store.sync(c, data, cur.getJSONObject(i));
                Store.save(c, data);
            }
            Store.deleteDir(tmp);
            return new JSONObject().put("ok", true).put("packs", restored).toString();
        } catch (Exception ex) {
            Store.deleteDir(tmp);
            return "{\"ok\":false,\"error\":\"não consegui ler a cópia\"}";
        }
    }
}
