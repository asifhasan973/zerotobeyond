import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bot,
  MessageCircle,
  Send,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { GameInfo } from "@exo/ui";
import "./spaceTutor.css";
type Message = { role: "user" | "model"; text: string };
export function TutorButton({ floating = false }: { floating?: boolean }) {
  return (
    <button
      type="button"
      className={floating ? "tutor-fallback" : "conversation-icon"}
      aria-label="Ask Orbit AI"
      title="Ask Orbit AI"
      onClick={() => window.dispatchEvent(new Event("open-space-tutor"))}
    >
      <MessageCircle size={20} />
      {floating && <span>Ask Orbit</span>}
    </button>
  );
}
export function SpaceTutor() {
  const [open, setOpen] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [failed, setFailed] = useState("");
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem("tutor-pinned") !== "false";
    } catch {
      return true;
    }
  });
  const [width, setWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("tutor-width")) || 320;
    } catch {
      return 320;
    }
  });
  const resize = (value: number) => {
    const next = Math.max(260, Math.min(innerWidth * 0.6, value));
    setWidth(next);
    try {
      localStorage.setItem("tutor-width", String(next));
    } catch {
      /* Optional preference. */
    }
  };
  useLayoutEffect(() => {
    document.body.classList.toggle("tutor-split-open", open && pinned);
    document.body.style.setProperty(
      "--tutor-width",
      `${Math.min(width, innerWidth * 0.6)}px`,
    );
    window.dispatchEvent(new Event("resize"));
    return () => {
      document.body.classList.remove("tutor-split-open");
      document.body.style.removeProperty("--tutor-width");
      window.dispatchEvent(new Event("resize"));
    };
  }, [open, pinned, width]);
  const end = useRef<HTMLDivElement>(null),
    controller = useRef<AbortController | null>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("open-space-tutor", show);
    return () => {
      window.removeEventListener("open-space-tutor", show);
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [messages, busy, error]);
  const ask = async (text: string, retry = false) => {
    const q = text.trim();
    if (!q || controller.current) return;
    setQuestion("");
    setError("");
    setFailed("");
    const complete: Message[] = [];
    for (let i = 0; i < messages.length - 1; i++)
      if (messages[i].role === "user" && messages[i + 1].role === "model") {
        complete.push(messages[i], messages[i + 1]);
        i++;
      }
    const history = complete.slice(-8);
    if (!retry)
      setMessages((previous) => [...previous, { role: "user", text: q }]);
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    const main = document.querySelector(
      'main#story-content, main, [role="main"]',
    );
    const timer = window.setTimeout(() => abort.abort("timeout"), 40000);
    const page = `Page: ${document.title}\n${main instanceof HTMLElement ? main.innerText.slice(0, 2400) : "Website exploration page."}`;
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, messages: history, page }),
        signal: abort.signal,
      });
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json"))
        throw Error("The tutor server is unavailable. Please try again later.");
      const data = await response.json();
      if (!response.ok || typeof data.text !== "string")
        throw Error(
          typeof data.error === "string" ? data.error : "Please try again.",
        );
      if (controller.current !== abort || abort.signal.aborted) return;
      setMessages((previous) => [
        ...previous,
        { role: "model", text: data.text },
      ]);
    } catch (e) {
      if (
        controller.current === abort &&
        (!abort.signal.aborted || abort.signal.reason === "timeout")
      ) {
        setFailed(q);
        setError(
          abort.signal.reason === "timeout"
            ? "The reply took too long. Please retry your question."
            : e instanceof Error
              ? e.message
              : "The connection failed. Please try again.",
        );
      }
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) {
        setBusy(false);
        controller.current = null;
        input.current?.focus();
      }
    }
  };
  const close = () => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setOpen(false);
  };
  return (
    <>
      <TutorButton floating />
      {open && (
        <GameInfo
          modal={false}
          title="Orbit · Your space tutor"
          className="game-info learning-drawer tutor-drawer"
          onClose={close}
          headerActions={
            <>
              <button
                className="conversation-icon"
                aria-label={pinned ? "Unpin tutor" : "Pin tutor"}
                title={pinned ? "Switch to overlay" : "Switch to split view"}
                aria-pressed={pinned}
                onClick={() => {
                  setPinned(!pinned);
                  try {
                    localStorage.setItem("tutor-pinned", String(!pinned));
                  } catch {
                    /* Optional preference. */
                  }
                }}
              >
                {pinned ? (
                  <PanelRightClose size={20} />
                ) : (
                  <PanelRightOpen size={20} />
                )}
              </button>
              <button
                className="conversation-icon"
                aria-label="Clear conversation"
                title="Clear conversation"
                onClick={() => {
                  controller.current?.abort();
                  controller.current = null;
                  setBusy(false);
                  setMessages([]);
                  setError("");
                  setFailed("");
                }}
              >
                <Trash2 size={18} />
              </button>
            </>
          }
          pages={[
            <div className="tutor-content" key="chat">
              <div
                className="tutor-resizer"
                role="separator"
                aria-label="Resize tutor"
                aria-orientation="vertical"
                aria-valuemin={260}
                aria-valuemax={Math.round(innerWidth * 0.6)}
                aria-valuenow={Math.round(width)}
                tabIndex={0}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  e.preventDefault();
                }}
                onPointerMove={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    resize(innerWidth - e.clientX);
                }}
                onPointerUp={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onKeyDown={(e) => {
                  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    resize(width + (e.key === "ArrowLeft" ? 20 : -20));
                  }
                }}
              />

              <p className="tutor-intro">
                <Bot size={20} />
                Ask about this page, space or science.
              </p>
              <small className="tutor-privacy">
                Your question and this page’s text are sent to Gemini. Please
                don’t share personal information.
              </small>
              <div
                className="tutor-messages"
                role="log"
                aria-label="Conversation with Orbit"
                aria-live="polite"
              >
                {messages.length === 0 && (
                  <div className="tutor-suggestions">
                    {[
                      "Explain this page simply",
                      "Why does the Moon have craters?",
                      "How do I start my Moon mission?",
                    ].map((text) => (
                      <button key={text} onClick={() => void ask(text)}>
                        {text}
                      </button>
                    ))}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`tutor-message is-${m.role}`}>
                    <strong>{m.role === "user" ? "You" : "Orbit"}</strong>
                    <p>
                      {m.text
                        .split(/(\*\*[^*]+\*\*)/g)
                        .map((part, index) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={index}>{part.slice(2, -2)}</strong>
                          ) : (
                            part
                          ),
                        )}
                    </p>
                  </div>
                ))}
                {busy && <p role="status">Orbit is thinking…</p>}
                {error && (
                  <p className="tutor-error" role="alert">
                    {error}
                    {failed && (
                      <button
                        className="tutor-retry"
                        disabled={busy}
                        onClick={() => void ask(failed, true)}
                      >
                        Retry question
                      </button>
                    )}
                  </p>
                )}
                <div ref={end} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(question);
                }}
              >
                <label className="tutor-input-label" htmlFor="tutor-question">
                  Your question
                </label>
                <div className="tutor-input-row">
                  <input
                    ref={input}
                    id="tutor-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={1500}
                    placeholder="What would you like to understand?"
                    autoComplete="off"
                    disabled={busy}
                  />
                  <button
                    type="submit"
                    aria-label="Send question"
                    disabled={busy || !question.trim()}
                  >
                    <Send size={19} />
                  </button>
                </div>
              </form>
              <small className="tutor-note">
                AI can make mistakes. Check important science in NASA Sources.
              </small>
            </div>,
          ]}
        />
      )}
    </>
  );
}
