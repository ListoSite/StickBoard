package com.josejunior.sticktag;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Cópia de segurança automática: um .zip numa pasta escolhida, a cada X dias,
 * guardando só as últimas cópias. Corre sozinha uma vez por dia (JobScheduler)
 * e também quando abres a app ou o teclado, se já estiver na hora.
 */
public class AutoBackup extends JobService {
    static final int JOB_ID = 4711;
    static final String PREFIX = "StickTag-copia-";
    static volatile boolean running = false;

    /** Configuração guardada em data.autoBackup = {uri, every (dias), keep, last (ms), lastError}. */
    static JSONObject cfg(Context c) {
        return Store.load(c).optJSONObject("autoBackup");
    }

    static boolean due(Context c) {
        JSONObject a = cfg(c);
        if (a == null || a.optString("uri").length() == 0 || !a.optBoolean("on", true)) return false;
        long every = Math.max(1, a.optInt("every", 7)) * 24L * 3600 * 1000;
        return System.currentTimeMillis() - a.optLong("last", 0) >= every - 3600 * 1000;
    }

    /** Faz a cópia se já estiver na hora (em segundo plano). */
    static void maybeRun(final Context c) {
        if (running || !due(c)) return;
        new Thread(new Runnable() { @Override public void run() { runNow(c.getApplicationContext()); } }).start();
    }

    /** Faz a cópia já. Devolve o resultado em JSON. */
    static synchronized String runNow(Context c) {
        running = true;
        try {
            JSONObject a = cfg(c);
            if (a == null || a.optString("uri").length() == 0) return "{\"ok\":false,\"error\":\"escolhe primeiro a pasta\"}";
            Uri tree = Uri.parse(a.optString("uri"));
            ContentResolver cr = c.getContentResolver();
            Uri dir = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            String name = PREFIX + new SimpleDateFormat("yyyy-MM-dd_HH-mm", Locale.ROOT).format(new Date()) + ".zip";
            Uri file;
            try { file = DocumentsContract.createDocument(cr, dir, "application/zip", name); }
            catch (Exception e) { file = null; }
            String res;
            if (file == null) res = "{\"ok\":false,\"error\":\"não consegui escrever na pasta (escolhe-a outra vez)\"}";
            else res = Backup.export(c, file);
            JSONObject r = new JSONObject(res);
            synchronized (Store.LOCK) {
                JSONObject d = Store.load(c);
                JSONObject ab = d.optJSONObject("autoBackup");
                if (ab != null) {
                    if (r.optBoolean("ok")) { ab.put("last", System.currentTimeMillis()); ab.remove("lastError"); ab.put("lastName", name); }
                    else ab.put("lastError", r.optString("error"));
                    Store.save(c, d);
                }
            }
            if (r.optBoolean("ok")) prune(cr, tree, Math.max(1, a.optInt("keep", 4)));
            return res;
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":\"não consegui criar a cópia\"}";
        } finally {
            running = false;
        }
    }

    /** Apaga as cópias antigas, ficando só com as últimas "keep". */
    static void prune(ContentResolver cr, Uri tree, int keep) {
        try {
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            Cursor cur = cr.query(children, new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null);
            if (cur == null) return;
            List<String[]> l = new ArrayList<String[]>();
            try {
                while (cur.moveToNext()) {
                    String n = cur.getString(1);
                    if (n != null && n.startsWith(PREFIX) && n.endsWith(".zip")) l.add(new String[]{n, cur.getString(0)});
                }
            } finally { cur.close(); }
            if (l.size() <= keep) return;
            Collections.sort(l, new java.util.Comparator<String[]>() { @Override public int compare(String[] a, String[] b) { return a[0].compareTo(b[0]); } });
            for (int i = 0; i < l.size() - keep; i++) {
                try { DocumentsContract.deleteDocument(cr, DocumentsContract.buildDocumentUriUsingTree(tree, l.get(i)[1])); } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
    }

    /** Liga (ou desliga) o trabalho diário do sistema. */
    static void schedule(Context c, boolean on) {
        try {
            JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js == null) return;
            if (!on) { js.cancel(JOB_ID); return; }
            JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(c, AutoBackup.class))
                    .setPeriodic(24L * 3600 * 1000)
                    .setPersisted(true)
                    .build();
            js.schedule(job);
        } catch (Exception ignored) {}
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        if (!due(this)) return false;
        new Thread(new Runnable() {
            @Override public void run() {
                runNow(getApplicationContext());
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) { return false; }
}
