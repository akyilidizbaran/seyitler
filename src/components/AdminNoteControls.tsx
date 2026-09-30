"use client";

import { useState, useTransition } from "react";
import { resolveAdminNote } from "@/lib/actions";

/** Sadece admin görünümünde: cevap yaz ve notu kapat / yeniden aç. */
export function AdminNoteControls({ id, status, reply }: { id: number; status: "open" | "done" | "wontfix"; reply: string | null }) {
  const [text, setText] = useState(reply ?? "");
  const [pending, start] = useTransition();
  const run = (next: "open" | "done" | "wontfix") => () => start(() => resolveAdminNote(id, next, text));

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Cevabın (isteğe bağlı, notu yazan kişi görür)"
        className="input"
        aria-label="Admin cevabı"
      />
      <div className="flex flex-wrap gap-2">
        {status === "open" ? (
          <>
            <button type="button" className="btn-primary" disabled={pending} onClick={run("done")}>
              ✓ Yapıldı
            </button>
            <button type="button" className="btn-ghost" disabled={pending} onClick={run("wontfix")}>
              Yapılmayacak
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-ghost" disabled={pending} onClick={run(status)}>
              Cevabı kaydet
            </button>
            <button type="button" className="btn-ghost" disabled={pending} onClick={run("open")}>
              Yeniden aç
            </button>
          </>
        )}
      </div>
    </div>
  );
}
