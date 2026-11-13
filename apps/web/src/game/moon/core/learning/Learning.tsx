import { usePlayerGender } from "@/game/moon/narrative/hooks/playerCharacterContext";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  BookOpen,
  Info,
  Lightbulb,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { GameInfo } from "@exo/ui";
import {
  browserNarrationEnvironment,
  NarrationController,
} from "@/game/moon/narrative/voice/narration";
import { GLOSSARY, type LearningTerm } from "./glossary";
import {
  getContextualTerms,
  matchLearningTerms,
  type KeywordScene,
} from "./keywordContext";
import { KeywordCard } from "./KeywordCard";
import { KEYWORD_MEDIA } from "./keywordMedia";
import "@/shared/shell/gamePolish.css";
import "./keywords.css";

type KeywordView = LearningTerm | "context";
const LearningContext = createContext<{
  open(term: KeywordView): void;
  registerText(id: string, text: string): () => void;
  hasKeywords: boolean;
} | null>(null);

export function LearningProvider({
  children,
  stepId,
  text,
  objective,
  activity,
}: { children: ReactNode } & KeywordScene) {
  const [fixed, setFixed] = useState(true);
  const [view, setView] = useState<KeywordView | null>(null);
  const [prose, setProse] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<{
    term: LearningTerm;
    scene: string;
  } | null>(null);
  const gender = usePlayerGender();
  const [voice] = useState(
    () => new NarrationController(browserNarrationEnvironment()),
  );
  const content = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const stopMedia = useCallback(() => setPlaying(null), []);
  const stop = useCallback(() => {
    voice.stop();
    stopMedia();
  }, [voice, stopMedia]);
  const sceneKey = `${stepId ?? ""}:${activity ?? ""}:${text ?? ""}`;
  useEffect(() => () => voice.stop(), [voice, sceneKey]);
  const open = useCallback(
    (value: KeywordView) => {
      if (!document.querySelector("dialog.keyword-drawer[open]")) {
        opener.current = document.activeElement as HTMLElement | null;
      }
      stop();
      setView(value);
    },
    [stop],
  );
  const registerText = useCallback((id: string, value: string) => {
    setProse((previous) => ({ ...previous, [id]: value }));
    return () =>
      setProse((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
  }, []);
  const relevant = getContextualTerms({
    stepId,
    objective,
    activity,
    text: [text, ...Object.values(prose)].filter(Boolean).join(" "),
  }).filter((term) => Boolean(KEYWORD_MEDIA[term]?.length));
  const hasKeywords = relevant.length > 0;
  useEffect(() => {
    document.body.classList.toggle("keyword-scene-available", hasKeywords);
    return () => document.body.classList.remove("keyword-scene-available");
  }, [hasKeywords]);
  const context = useMemo(
    () => ({ open, registerText, hasKeywords }),
    [open, registerText, hasKeywords],
  );
  useLayoutEffect(() => {
    document.body.classList.toggle(
      "keyword-split-open",
      Boolean(view && fixed),
    );
    window.dispatchEvent(new Event("resize"));
    return () => {
      document.body.classList.remove("keyword-split-open");
      window.dispatchEvent(new Event("resize"));
    };
  }, [view, fixed]);
  const terms = relevant;
  useEffect(() => {
    if (view && view !== "context")
      content.current?.querySelector<HTMLElement>("h3")?.focus();
  }, [view]);
  const close = () => {
    stop();
    setView(null);
    requestAnimationFrame(() => {
      const previous = opener.current;
      const target =
        previous?.isConnected && previous.getClientRects().length
          ? previous
          : document.querySelector<HTMLElement>(
              '.conversation-header [aria-label="Open space keywords"], .mobile-game-tools [aria-label="Pause menu"]',
            );
      target?.focus({ preventScroll: true });
    });
  };

  return (
    <LearningContext.Provider value={context}>
      {children}
      {view ? (
        <GameInfo
          modal={false}
          title="Space keywords"
          className="game-info learning-drawer keyword-drawer"
          onClose={close}
          headerActions={
            <button
              className="conversation-icon"
              aria-label={fixed ? "Switch to overlay" : "Switch to split view"}
              title={fixed ? "Switch to overlay" : "Switch to split view"}
              aria-pressed={fixed}
              onClick={() => setFixed((value) => !value)}
            >
              {fixed ? (
                <PanelRightClose size={20} />
              ) : (
                <PanelRightOpen size={20} />
              )}
            </button>
          }
          pages={[
            <div className="keyword-browser" ref={content} key="keywords">
              {!terms.length ? (
                <p>No pictures or videos for this page yet.</p>
              ) : null}
              <div className="keyword-card-list">
                {terms.map((term) => (
                  <KeywordCard
                    key={term}
                    term={term}
                    playing={
                      playing?.term === term && playing.scene === sceneKey
                    }
                    onStop={stopMedia}
                    onPlay={() => {
                      voice.stop();
                      setPlaying({ term, scene: sceneKey });
                    }}
                    onRead={() => {
                      stopMedia();
                      voice.speak(
                        `${GLOSSARY[term].name}. ${GLOSSARY[term].text}`,
                        "commander",
                        undefined,
                        gender,
                      );
                    }}
                  />
                ))}
              </div>
            </div>,
          ]}
        />
      ) : null}
    </LearningContext.Provider>
  );
}

/** Do not put an information button inside another interactive control. */
export function Term({
  term,
  children,
}: {
  term: LearningTerm;
  children?: ReactNode;
}) {
  const context = useContext(LearningContext);
  const root = useRef<HTMLSpanElement>(null);
  const [canExplain, setCanExplain] = useState(false);
  useLayoutEffect(() => {
    setCanExplain(
      !root.current?.parentElement?.closest(
        'button, a, input, select, textarea, summary, [role="button"], [role="link"], [contenteditable="true"]',
      ),
    );
  }, []);
  return (
    <span className="learning-term" ref={root}>
      {children ?? GLOSSARY[term].name}
      {context && canExplain && KEYWORD_MEDIA[term]?.length ? (
        <button
          type="button"
          className="learning-info"
          aria-label={`Explain ${GLOSSARY[term].name}`}
          title={`What is ${GLOSSARY[term].name}?`}
          onClick={() => context.open(term)}
        >
          <Info size={15} />
        </button>
      ) : null}
    </span>
  );
}

export function LearningControls({ onOpen }: { onOpen?: () => void } = {}) {
  const context = useContext(LearningContext);
  if (!context) return null;
  return (
    <button
      className="conversation-icon labeled-control"
      aria-label="Open space keywords"
      title="Space keywords"
      onClick={() => {
        onOpen?.();
        context.open("context");
      }}
    >
      <BookOpen size={20} />
      <span>Keywords</span>
      {context.hasKeywords ? (
        <span
          className="keyword-alert"
          aria-label="Keywords available on this page"
        />
      ) : null}
    </button>
  );
}

export function HintButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      className="game-hint"
      disabled={disabled}
      aria-label="Hint: show the next action"
      onClick={() => window.dispatchEvent(new Event("replay-game-help"))}
    >
      <Lightbulb size={19} />
      <span>Hint</span>
    </button>
  );
}

export function LearningText({ text }: { text: string }) {
  const context = useContext(LearningContext);
  const id = useId();
  const registerText = context?.registerText;
  useEffect(() => registerText?.(id, text), [id, text, registerText]);
  const pieces: ReactNode[] = [];
  let end = 0;
  for (const match of matchLearningTerms(text)) {
    if (!KEYWORD_MEDIA[match.term]?.length) continue;
    pieces.push(text.slice(end, match.start));
    pieces.push(
      <Term key={match.start} term={match.term}>
        {text.slice(match.start, match.end)}
      </Term>,
    );
    end = match.end;
  }
  pieces.push(text.slice(end));
  return <>{pieces}</>;
}
