import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ReactNode } from "react";

export interface GameInfoProps {
  title: string;
  pages: ReactNode[];
  onClose(): void;
  className?: string;
  modal?: boolean;
  headerActions?: ReactNode;
}

/** Modal right drawer: focus is contained and returned to the original help button. */
export function GameInfo({
  title,
  pages,
  onClose,
  className = "game-info learning-drawer",
  modal = true,
  headerActions,
}: GameInfoProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [page, setPage] = useState(0);
  const current = Math.min(page, Math.max(0, pages.length - 1));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = dialog.current;
    if (modal) el?.showModal();
    else el?.show();
    window.dispatchEvent(new Event("game-help-open"));
    return () => {
      el?.close();
      window.dispatchEvent(new Event("game-help-close"));
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [modal]);

  useEffect(() => {
    if (modal) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog:modal")) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [modal, onClose]);

  return createPortal(
    <dialog
      ref={dialog}
      className={className}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            onClose();
          }
        }
      }}
    >
      <header>
        <h2 id={headingId}>{title}</h2>
        {headerActions ? (
          <div className="game-info-header-actions">{headerActions}</div>
        ) : null}
        <button
          className="conversation-icon"
          aria-label="Close information"
          autoFocus
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <section className="game-info-page">{pages[current]}</section>
      {pages.length > 1 ? (
        <nav aria-label="Information pages">
          <button
            className="game-info-page-button"
            aria-label="Previous information page"
            disabled={!current}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <span>
            {current + 1} / {pages.length}
          </span>
          <button
            className="game-info-page-button"
            aria-label="Next information page"
            disabled={current === pages.length - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </nav>
      ) : null}
    </dialog>,
    document.body,
  );
}
