import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  FlaskConical,
  Rocket,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useOrientationLifecycleStore } from "@exo/ui";
import { useGameSettings } from "@/shared/shell/settings/gameSettingsContext";
import { ROADMAP_SOURCES } from "@exo/data/roadmap";
import { JOURNEYS } from "@exo/data/roadmap/journeys";
import { ApplicationFacts } from "./ApplicationFacts";
import { MissionRoadmap } from "./MissionRoadmap";
import "./roadmap.css";

const ROLES = [
  {
    title: "Astronaut",
    verb: "Explore beyond Earth",
    text: "Work with a crew. Solve problems. Prepare for the extraordinary.",
    icon: Rocket,
    color: "pink",
    portrait: "commander-pressure-suit-v2.webp",
  },
  {
    title: "Scientist",
    verb: "Discover something new",
    text: "Ask big questions. Investigate the evidence. Help us understand space.",
    icon: FlaskConical,
    color: "mint",
    portrait: "scientist-pressure-suit-v2.webp",
  },
  {
    title: "Engineer",
    verb: "Build what comes next",
    text: "Turn an idea into a machine, a tool or the code that makes a mission work.",
    icon: Wrench,
    color: "gold",
    portrait: "systems-pressure-suit-v1.webp",
  },
];
export default function RoadmapPage() {
  const [role, setRole] = useState<number | null>(null);
  const [tab, setTab] = useState("careers");
  const [opened, setOpened] = useState<number | null>(0);
  const [visible, setVisible] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const scroll = useRef<HTMLElement>(null);
  const frozen = useOrientationLifecycleStore((s) => s.isFrozen);
  const { gentle } = useGameSettings();
  useEffect(() => {
    if (role === null || tab !== "careers") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((old) => [
          ...new Set([
            ...old,
            ...entries
              .filter((e) => e.isIntersecting)
              .map((e) => Number((e.target as HTMLElement).dataset.step)),
          ]),
        ]);
      },
      { root: scroll.current, threshold: 0.12 },
    );
    scroll.current
      ?.querySelectorAll<HTMLElement>("[data-step]")
      .forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [role, tab]);
  const choose = (index: number) => {
    setRole(index);
    setVisible([]);
    setOpened(0);
    setProgress(0);
    scroll.current?.scrollTo({ top: 0 });
  };
  const current = role === null ? null : ROLES[role];
  return (
    <main
      ref={scroll}
      className={`rm-page ${frozen ? "rm-frozen" : ""} ${gentle ? "rm-gentle" : ""}`}
      onScroll={(e) => {
        const el = e.currentTarget;
        setProgress(
          el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight),
        );
      }}
      id="roadmap-content"
    >
      <div className="rm-topbar">
        <span>
          <Compass size={16} /> YOUR FUTURE IN SPACE
        </span>
        <a href="#roadmap-sources">
          <BookOpen size={15} />
          NASA & official sources
        </a>
      </div>
      <nav className="rm-tabs" aria-label="Roadmap topics">
        <button
          aria-pressed={tab === "careers"}
          onClick={() => {
            setTab("careers");
            setVisible([]);
            scroll.current?.scrollTo({ top: 0 });
          }}
        >
          My space future
        </button>
        <button
          aria-pressed={tab === "mission"}
          onClick={() => {
            setTab("mission");
            scroll.current?.scrollTo({ top: 0 });
          }}
        >
          University missions
        </button>
      </nav>
      {tab === "careers" && role === null ? (
        <section className="rm-welcome">
          <span className="rm-kicker">
            <Sparkles size={14} /> A BIG DREAM STARTS WITH A LITTLE CURIOSITY
          </span>
          <h1>
            What do you want
            <br />
            to <em>become?</em>
          </h1>
          <p>
            You do not need to have it all figured out.
            <br />
            Pick a dream. Let’s see where the path could lead.
          </p>
          <div className="rm-roles">
            {ROLES.map((r, i) => (
              <button
                className={`rm-role ${r.color}`}
                key={r.title}
                onClick={() => choose(i)}
              >
                <div className="rm-portrait">
                  <img src={`/story/crew-portraits/${r.portrait}`} alt="" />
                  <span className="rm-role-label">{r.title}</span>
                  <r.icon className="rm-role-icon" size={26} />
                </div>
                <div className="rm-role-copy">
                  <span className="rm-kicker">{r.verb}</span>
                  <h2>
                    I want to be {i === 1 ? "a" : "an"}
                    <br />
                    <strong>{r.title.toLowerCase()}.</strong>
                  </h2>
                  <p>{r.text}</p>
                  <span className="rm-role-cta">
                    Explore my path <ArrowRight size={17} />
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="rm-welcome-note">
            Not a career test. You can explore every path and change your mind.
          </p>
        </section>
      ) : tab === "careers" && current && role !== null ? (
        <>
          <header className={`rm-journey-hero ${current.color}`}>
            <div>
              <button
                className="rm-back"
                onClick={() => {
                  setRole(null);
                  scroll.current?.scrollTo({ top: 0 });
                }}
              >
                <ArrowLeft size={15} /> Explore another dream
              </button>
              <span className="rm-kicker">
                YOUR POSSIBLE PATH / {current.title.toUpperCase()}
              </span>
              <h1>
                {role === 0
                  ? "Reach for the stars."
                  : role === 1
                    ? "Follow the questions."
                    : "Build the possibilities."}
                <br />
                <em>Start right here.</em>
              </h1>
              <p>
                Six stepping stones. Real requirements. Plenty of room to grow.
              </p>
              <div className="rm-shortcuts">
                <a href="#rm-path">Explore the roadmap ↓</a>
                <a href="#rm-facts">NASA application facts ↗</a>
              </div>
            </div>
            <div className="rm-hero-art">
              <div className="rm-orbit" />
              <img
                src={`/story/crew-portraits/${current.portrait}`}
                alt={`Illustrated ${current.title.toLowerCase()} guide`}
              />
              <span>YOUR DREAM, YOUR JOURNEY</span>
            </div>
          </header>
          <div className="rm-guide-note">
            <Sparkles size={19} />
            <p>
              <strong>Start wherever you are.</strong> School activities are
              ideas to try, not NASA admission rules. There is no deadline for
              choosing your dream.
            </p>
          </div>
          <div className="rm-path-heading" id="rm-path">
            <span className="rm-kicker">SCROLL TO FOLLOW THE PATH</span>
            <h2>From “what if?” to “what’s next?”</h2>
            <p>
              Tap a stepping stone for a useful activity and the details behind
              it.
            </p>
          </div>
          <ol className="rm-path">
            {JOURNEYS[role].map((step, i) => (
              <li
                data-step={i}
                className={`rm-waypoint ${visible.includes(i) ? "rm-visible" : ""}`}
                key={step.title}
              >
                <span className="rm-dot">{String(i + 1).padStart(2, "0")}</span>
                <article className="rm-step">
                  <span className="rm-kicker">{step.when}</span>
                  <button
                    className="rm-step-title"
                    aria-expanded={opened === i}
                    aria-controls={`rm-details-${i}`}
                    onClick={() => setOpened(opened === i ? null : i)}
                  >
                    <h3>{step.title}</h3>
                    <ChevronDown size={20} />
                  </button>
                  <p>{step.why}</p>
                  <div
                    className="rm-step-detail"
                    id={`rm-details-${i}`}
                    hidden={opened !== i}
                  >
                    <div className="rm-try">
                      <span>
                        <Sparkles size={15} /> SOMETHING YOU CAN TRY
                      </span>
                      <p>{step.activity}</p>
                    </div>
                    <p className="rm-takeaway">
                      <Check size={16} />
                      {step.takeaway}
                    </p>
                    <a
                      href={ROADMAP_SOURCES[role === 0 && i >= 2 ? 0 : 1].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {role === 0 && i >= 2
                        ? "NASA requirements"
                        : "NASA career reference"}{" "}
                      ↗
                    </a>
                    <small className="rm-editorial">
                      Activities are our learning suggestions, not NASA
                      selection tests.
                    </small>
                  </div>
                </article>
              </li>
            ))}
          </ol>
          <section className="rm-finish">
            <Rocket size={32} />
            <h2>Your next small step matters.</h2>
            <p>
              Pick one activity. Ask a teacher or trusted adult to help you
              explore it.
            </p>
            <button
              onClick={() => {
                setRole(null);
                scroll.current?.scrollTo({ top: 0 });
              }}
            >
              Explore another path <ArrowRight size={16} />
            </button>
          </section>
          <ApplicationFacts role={role} />
        </>
      ) : (
        <MissionRoadmap />
      )}
      <section className="rm-sources" id="roadmap-sources">
        <span className="rm-kicker">REAL INFORMATION. VISIBLE SOURCES.</span>
        <h2>Built with NASA & official references.</h2>
        <p>
          Checked 14 November 2026. An independent educational guide by Zero To
          Beyond, not a NASA endorsement. Our school activities are suggestions;
          linked announcements set the actual requirements.
        </p>
        <div>
          {ROADMAP_SOURCES.map((s) => (
            <article key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name} ↗
              </a>
              <p>{s.note}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="rm-scroll-progress" aria-hidden="true">
        <span style={{ height: `${progress * 100}%` }} />
      </div>
    </main>
  );
}
