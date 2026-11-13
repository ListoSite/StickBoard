package com.josejunior.sticktag;

import android.content.ContentResolver;
import android.content.Context;
import android.content.UriPermission;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

/** Pastas do telemóvel escolhidas pelo utilizador: listar imagens, apagar, importar. */
public final class Folders {
    private Folders() {}

    static boolean isImage(String mime, String name) {
        String n = name == null ? "" : name.toLowerCase();
        if (mime != null && mime.startsWith("image/")) return true;
        return n.endsWith(".webp") || n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".gif");
    }

    /** O acesso a esta pasta ainda é válido? */
    public static boolean hasAccess(Context c, Uri tree) {
        List<UriPermission> l = c.getContentResolver().getPersistedUriPermissions();
        for (UriPermission p : l) if (p.getUri().equals(tree) && p.isReadPermission()) return true;
        return false;
    }

    /** Um documento pertence a uma pasta com acesso dado? (para mostrar as imagens na app) */
    public static boolean allowed(Context c, Uri doc) {
        if (!"com.android.externalstorage.documents".equals(doc.getAuthority()) && !doc.toString().contains("/tree/")) return false;
        List<UriPermission> l = c.getContentResolver().getPersistedUriPermissions();
        String d = doc.toString();
        for (UriPermission p : l) {
            String t = p.getUri().toString();
            if (d.startsWith(t)) return true;
        }
        return false;
    }

    public static String list(Context c, Uri tree) {
        JSONArray out = new JSONArray();
        try {
            ContentResolver cr = c.getContentResolver();
            String treeId = DocumentsContract.getTreeDocumentId(tree);
            Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, treeId);
            Cursor cur = cr.query(children, new String[]{
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.COLUMN_SIZE,
                    DocumentsContract.Document.COLUMN_LAST_MODIFIED}, null, null, null);
            if (cur != null) {
                try {
                    while (cur.moveToNext()) {
                        String id = cur.getString(0), name = cur.getString(1), mime = cur.getString(2);
                        if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime) || !isImage(mime, name)) continue;
                        JSONObject o = new JSONObject();
                        o.put("uri", DocumentsContract.buildDocumentUriUsingTree(tree, id).toString());
                        o.put("name", name);
                        o.put("size", cur.isNull(3) ? 0 : cur.getLong(3));
                        o.put("time", cur.isNull(4) ? 0 : cur.getLong(4));
                        o.put("mime", mime == null ? "" : mime);
                        out.put(o);
                    }
                } finally { cur.close(); }
            }
            return new JSONObject().put("ok", true).put("files", out).toString();
        } catch (SecurityException e) {
            return "{\"ok\":false,\"error\":\"o acesso a esta pasta expirou: escolhe-a outra vez\"}";
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":\"não consegui ler a pasta\"}";
        }
    }

    public static boolean delete(Context c, Uri doc) {
        try { return DocumentsContract.deleteDocument(c.getContentResolver(), doc); }
        catch (Exception e) { return false; }
    }

    public static String name(Context c, Uri tree) {
        try {
            String id = DocumentsContract.getTreeDocumentId(tree);
            int i = id.lastIndexOf('/');
            String n = i >= 0 ? id.substring(i + 1) : id.substring(id.indexOf(':') + 1);
            return n.length() == 0 ? "Pasta" : n;
        } catch (Exception e) { return "Pasta"; }
    }
}
