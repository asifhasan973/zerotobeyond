import { useRef, useState } from "react";
import { Link } from "react-router";
import { readBrowserSelectionSession } from "@/game/moon/crew/selectionSession";
import { Rocket, Gamepad2, Play, RotateCcw, X } from "lucide-react";
import { SettingsButton } from "@/shared/shell/settings";
import { sound } from "@exo/audio";
import { isEngineFrozen } from "@exo/ui";
import "./siteNavbar.css";

import type { SitePage } from "./siteNavigation";
export type { SitePage } from "./siteNavigation";

const pages: { id: SitePage; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "cosmic", label: "Cosmic Explorer", href: "/?explore=cosmic" },
  { id: "archive", label: "Archive", href: "/?explore=archive" },
  { id: "signal", label: "Signal Lab", href: "/?explore=signal" },
  {
    id: "engineering",
    label: "Engineering Lab",
    href: "/?explore=engineering",
  },
  { id: "roadmap", label: "Roadmaps", href: "/?explore=roadmap" },
];

/** Shared page navigation outside the active mission. */
export function SiteNavbar({
  activePage,
  onNavigate,
  onResume,
  onNewGame,
}: {
  activePage: SitePage;
  onNavigate(page: SitePage): void;
  onResume?(): void;
  onNewGame?(): void;
}) {
  const gameDialog = useRef<HTMLDialogElement>(null);
  const [hasSave, setHasSave] = useState(false);
  const navigate = (page: SitePage) => {
    if (isEngineFrozen()) return;
    sound.playClick(650);
    onNavigate(page);
  };
  return (
    <header className="site-navbar">
      <button
        type="button"
        className="site-navbar-brand"
        aria-label="Zero To Beyond home"
        onClick={() => navigate("home")}
      >
        <span>
          <Rocket size={25} />
        </span>
        <strong>Zero To Beyond</strong>
      </button>
      <nav className="site-navbar-pages" aria-label="Main pages">
        {pages.map((page) => (
          <Link
            key={page.id}
            to={page.href}
            aria-current={activePage === page.id ? "page" : undefined}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              )
                return;
              event.preventDefault();
              navigate(page.id);
            }}
          >
            {page.label}
          </Link>
        ))}
        <button
          type="button"
          className="site-navbar-game"
          onClick={() => {
            if (isEngineFrozen()) return;
            setHasSave(!!readBrowserSelectionSession().progress.playerName);
            sound.playClick(650);
            gameDialog.current?.showModal();
          }}
        >
          <Gamepad2 size={16} /> Game
        </button>
      </nav>
      <dialog
        ref={gameDialog}
        className="site-game-dialog"
        aria-labelledby="site-game-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) gameDialog.current?.close();
        }}
      >
        <button
          className="site-game-close"
          aria-label="Close game menu"
          onClick={() => gameDialog.current?.close()}
        >
          <X size={20} />
        </button>
        <span className="site-game-badge">
          <Rocket size={28} />
        </span>
        <h2 id="site-game-title">Your Moon mission</h2>
        <p>
          {hasSave
            ? "Continue your journey or begin a new adventure."
            : "Build your spacecraft, choose your crew and explore the Moon."}
        </p>
        <div className="site-game-actions">
          {hasSave && (
            <button
              onClick={() => {
                gameDialog.current?.close();
                if (onResume) onResume();
                else window.location.assign("/?play=1");
              }}
            >
              <Play size={18} /> Resume
            </button>
          )}
          <button
            onClick={() => {
              gameDialog.current?.close();
              if (onNewGame) onNewGame();
              else window.location.assign("/?restart=1");
            }}
          >
            <RotateCcw size={18} /> New Game
          </button>
        </div>
        {hasSave && (
          <small>
            New Game asks for confirmation before replacing your saved mission.
          </small>
        )}
      </dialog>
      <div className="site-navbar-settings">
        <SettingsButton />
      </div>
    </header>
  );
}
