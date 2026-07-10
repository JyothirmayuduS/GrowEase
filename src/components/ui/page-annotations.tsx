"use client";

import { MessageSquarePlus, StickyNote, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

export interface PageAnnotation {
  id: string;
  text: string;
  /** Optional row number (1-based) this note refers to. */
  row?: number;
  createdAt: string;
}

interface PageAnnotationsProps {
  /** Unique per view + file so notes survive refresh within the session. */
  storageKey: string;
  className?: string;
  /** Hint shown in empty state. */
  placeholder?: string;
}

function loadNotes(key: string): PageAnnotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PageAnnotation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(key: string, notes: PageAnnotation[]) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(notes));
  } catch {
    /* ignore */
  }
}

/**
 * Page-level annotations for Preview / Results — reviewer notes that are not CRM fields.
 * Persisted in sessionStorage for the current file + view.
 */
export function PageAnnotations({
  storageKey,
  className,
  placeholder = "Add a note for your team (e.g. “Row 4 phone looks wrong — confirm with agent”).",
}: PageAnnotationsProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PageAnnotation[]>([]);
  const [draft, setDraft] = useState("");
  const [rowRef, setRowRef] = useState("");

  useEffect(() => {
    setNotes(loadNotes(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: PageAnnotation[]) => {
      setNotes(next);
      saveNotes(storageKey, next);
    },
    [storageKey]
  );

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const rowNum = rowRef.trim() ? Number.parseInt(rowRef, 10) : undefined;
    const note: PageAnnotation = {
      id: crypto.randomUUID(),
      text,
      row: Number.isFinite(rowNum) && (rowNum as number) > 0 ? rowNum : undefined,
      createdAt: new Date().toISOString(),
    };
    persist([note, ...notes]);
    setDraft("");
    setRowRef("");
    setOpen(true);
  };

  const removeNote = (id: string) => {
    persist(notes.filter((n) => n.id !== id));
  };

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--ge-radius-md)] border px-3 py-1.5 text-[12px] font-semibold transition-colors",
          open || notes.length > 0
            ? "border-[var(--ge-accent)] bg-[var(--ge-accent-tint)] text-[var(--ge-accent)]"
            : "border-[var(--ge-border-strong)] bg-[var(--ge-card)] text-[var(--ge-text-secondary)] hover:text-[var(--ge-text)]"
        )}
      >
        <StickyNote className="h-3.5 w-3.5" aria-hidden />
        Notes
        {notes.length > 0 ? (
          <span className="rounded-full bg-[var(--ge-accent)] px-1.5 py-0.5 font-mono text-[10px] text-white">
            {notes.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Page annotations"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(100vw-2rem,340px)] rounded-[var(--ge-radius-xl)] border border-[var(--ge-border-strong)] bg-[var(--ge-card)] shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--ge-border)] px-3.5 py-2.5">
            <div>
              <p className="text-[13px] font-semibold text-[var(--ge-text)]">Page annotations</p>
              <p className="text-[11px] text-[var(--ge-text-muted)]">
                Session notes — not written to CRM
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-[var(--ge-text-muted)] hover:bg-[var(--ge-panel)] hover:text-[var(--ge-text)]"
              aria-label="Close notes"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 border-b border-[var(--ge-border)] px-3.5 py-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={placeholder}
              className="w-full resize-y rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2 text-[13px] text-[var(--ge-text)] outline-none placeholder:text-[var(--ge-text-muted)] focus:border-[var(--ge-accent)]"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--ge-text-muted)]">
                Row #
                <input
                  type="number"
                  min={1}
                  value={rowRef}
                  onChange={(e) => setRowRef(e.target.value)}
                  placeholder="opt."
                  className="w-16 rounded border border-[var(--ge-border)] bg-[var(--ge-card)] px-2 py-1 font-mono text-[12px] text-[var(--ge-text)] outline-none focus:border-[var(--ge-accent)]"
                />
              </label>
              <button
                type="button"
                onClick={addNote}
                disabled={!draft.trim()}
                className="ge-btn-primary ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] disabled:opacity-40"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                Add note
              </button>
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto p-2">
            {notes.length === 0 ? (
              <li className="px-2 py-6 text-center text-[12px] text-[var(--ge-text-muted)]">
                No annotations yet. Add a note above.
              </li>
            ) : (
              notes.map((note) => (
                <li
                  key={note.id}
                  className="group mb-1.5 rounded-[var(--ge-radius-md)] border border-[var(--ge-border)] bg-[var(--ge-panel)] px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ge-text-muted)]">
                      {note.row ? `Row ${note.row}` : "Page"} ·{" "}
                      {new Date(note.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNote(note.id)}
                      className="rounded p-0.5 text-[var(--ge-text-muted)] opacity-0 hover:text-[var(--ge-danger)] group-hover:opacity-100"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-snug text-[var(--ge-text)]">
                    {note.text}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
