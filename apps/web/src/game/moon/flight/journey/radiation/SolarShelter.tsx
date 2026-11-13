import { useGameSettings } from "@/shared/shell";
import { RadiationScene } from "./RadiationScene";
import { StormIntro } from "./StormIntro";
import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Package,
  Droplets,
  Utensils,
  Check,
  UserRound,
  Activity,
  Radio,
  Navigation,
  Zap,
} from "lucide-react";
import { CrewPortrait, radioCrew } from "../../../crew/operations";
import type { WorkshopSession } from "../../../workshop/lander/workshopSession";
import {
  type ShelterState,
  type ShelterAction,
  type ShelterItem,
  type ShelterCheck,
  SHELTER_WAIT_SECONDS,
} from "./radiation";
import "./radiation.css";
const bundles = [
  { id: "water", label: "Water", icon: Droplets },
  { id: "food", label: "Food", icon: Utensils },
  { id: "supplies", label: "Supplies", icon: Package },
] as const;
const checks = [
  { id: "power", label: "Power", icon: Zap },
  { id: "navigation", label: "Navigation", icon: Navigation },
  { id: "radio", label: "Radio", icon: Radio },
] as const;
const copy = {
  waiting: ["Journey ahead", "Our crew is on the way."],
  alert: [
    "Solar particle alert",
    "Radiation is rising. Prepare a shelter inside the capsule.",
  ],
  shielding: [
    "Build a protective barrier",
    "Choose a bag, then its matching bay. You can also drag it.",
  ],
  crew: [
    "Bring everyone inside",
    "Choose each crew member to move them into the shelter.",
  ],
  monitoring: [
    "Stay sheltered. Keep watch.",
    "The journey continues while we wait for readings to fall.",
  ],
  checks: [
    "All-clear. Check our systems.",
    "Check power, navigation and radio before continuing.",
  ],
  complete: [
    "Ready to continue",
    "Our crew has completed the shelter procedure.",
  ],
} as const;
export function SolarShelter({
  storm,
  session,
  act,
  disabled,
}: {
  storm: ShelterState;
  session: WorkshopSession;
  act(action: ShelterAction): void;
  disabled: boolean;
}) {
  const { gentle } = useGameSettings();
  const [selected, setSelected] = useState<ShelterItem | null>(null);
  const [hint, setHint] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const crew = radioCrew(session);
  const members = [crew.commander, crew.scientist, crew.orbit];
  const [title, instruction] = copy[storm.phase];
  const phaseIndex = [
    "alert",
    "shielding",
    "crew",
    "monitoring",
    "checks",
  ].indexOf(storm.phase);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [storm.phase]);
  const choose = (item: ShelterItem) => {
    setSelected(item);
    setHint("");
  };
  const place = (slot: ShelterItem, item = selected) => {
    if (disabled || storm.phase !== "shielding") return;
    if (!item) {
      setHint("Choose a bag first, then choose its matching bay.");
      return;
    }
    if (item !== slot) {
      setHint(`Put ${item} in the ${item} bay. Follow the labels.`);
      return;
    }
    act({ kind: "place", item, slot });
    setSelected(null);
    setHint("");
  };
  const level =
    storm.phase === "checks"
      ? "All-clear"
      : storm.monitoring >= SHELTER_WAIT_SECONDS / 2
        ? "Falling"
        : "Elevated";
  if (storm.phase === "alert" && (storm.intro ?? 0) < 2) {
    return (
      <StormIntro
        index={(storm.intro ?? 0) as 0 | 1}
        disabled={disabled}
        onNext={() => act({ kind: "briefing-next" })}
      />
    );
  }
  if (
    storm.phase === "monitoring" ||
    (storm.phase === "checks" && !storm.clearAcknowledged)
  ) {
    const clear = storm.phase === "checks";
    return (
      <section
        className={`solar-shelter radiation-watch ${clear ? "is-clear" : ""}`}
      >
        <RadiationScene
          progress={storm.monitoring / SHELTER_WAIT_SECONDS}
          paused={disabled}
          gentle={gentle}
        />
        <span className="radiation-caption">
          Simulated solar particle event · particles shown for explanation;
          radiation is invisible
        </span>
        <div className="radiation-watch-card" role="status">
          {clear ? <ShieldCheck size={30} /> : <Activity size={30} />}
          <span className="shelter-eyebrow">
            {clear ? "MISSION CONTROL" : "CREW SHELTERED · 3 / 3"}
          </span>
          <h2>{clear ? "All-clear" : "Holding course. Staying sheltered."}</h2>
          <p>
            {clear
              ? "Radiation readings have fallen. Check our systems before leaving the shelter."
              : "Solar particles are passing the spacecraft. Everyone stays in the protected cabin area."}
          </p>
          <strong>{clear ? "Readings settled" : level}</strong>
          <div className="shelter-trend">
            <span
              style={{
                width: `${(storm.monitoring / SHELTER_WAIT_SECONDS) * 100}%`,
              }}
            />
          </div>
          <small>
            Time compressed · illustrative readings, not live NASA measurements
          </small>
          {clear && (
            <button
              className="shelter-primary"
              disabled={disabled}
              onClick={() => act({ kind: "review-checks" })}
            >
              Check spacecraft systems →
            </button>
          )}
        </div>
      </section>
    );
  }
  return (
    <div className={`solar-shelter phase-${storm.phase}`}>
      <div className="shelter-title">
        <span className="shelter-eyebrow">
          <ShieldAlert size={14} /> Simulated solar particle event
        </span>
        <h2 ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <p>{instruction}</p>
      </div>
      <ol className="shelter-steps" aria-label="Shelter procedure">
        {["Alert", "Shield", "Crew", "Monitor", "Checks"].map((label, i) => (
          <li
            key={label}
            aria-current={
              i ===
              ["alert", "shielding", "crew", "monitoring", "checks"].indexOf(
                storm.phase,
              )
                ? "step"
                : undefined
            }
          >
            <span>
              {i < phaseIndex ? (
                <Check size={12} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <fieldset className="shelter-workspace" disabled={disabled}>
        <legend className="shelter-sr">Capsule shelter controls</legend>
        <div
          className="shelter-cutaway"
          role="group"
          aria-label="Capsule interior teaching diagram, not to scale"
        >
          <div className="shelter-cabin-frame">
            <svg
              className="shelter-hull"
              viewBox="0 0 520 320"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="shelter-metal" x1="0" x2="1" y2=".6">
                  <stop stopColor="#f2eef6" />
                  <stop offset=".2" stopColor="#8a8c9d" />
                  <stop offset=".48" stopColor="#d5d8e1" />
                  <stop offset=".75" stopColor="#595c70" />
                  <stop offset="1" stopColor="#b0a7be" />
                </linearGradient>
                <linearGradient id="shelter-cabin" x2="0" y2="1">
                  <stop stopColor="#313344" />
                  <stop offset="1" stopColor="#101c2b" />
                </linearGradient>
                <linearGradient id="shelter-base">
                  <stop stopColor="#212333" />
                  <stop offset=".5" stopColor="#73818a" />
                  <stop offset="1" stopColor="#202638" />
                </linearGradient>
                <pattern
                  id="shelter-grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M24 0H0V24"
                    fill="none"
                    stroke="#9ec9cd"
                    strokeOpacity=".035"
                  />
                </pattern>
              </defs>
              <rect width="520" height="320" fill="url(#shelter-grid)" />
              <ellipse
                cx="260"
                cy="289"
                rx="207"
                ry="17"
                fill="#000"
                opacity=".4"
              />
              <path
                d="M220 25Q260 14 300 25L462 247Q477 274 443 283Q260 309 77 283Q43 274 58 247Z"
                fill="url(#shelter-metal)"
                stroke="#c4becd"
                strokeWidth="2"
              />
              <path
                d="M227 46Q260 36 293 46L426 237Q443 261 416 266Q260 287 104 266Q77 261 94 237Z"
                fill="url(#shelter-cabin)"
                stroke="#66697c"
                strokeWidth="5"
              />
              <path
                d="M226 47L97 242M294 47L423 242"
                stroke="#d4d5e4"
                strokeWidth="2"
                opacity=".35"
              />
              <path
                d="M200 81Q260 65 320 81M158 139Q260 114 362 139M116 198Q260 168 404 198"
                fill="none"
                stroke="#a3a5bc"
                opacity=".14"
              />
              <path
                d="M68 266Q260 307 452 266L444 285Q260 326 76 285Z"
                fill="url(#shelter-base)"
                stroke="#85919a"
              />
              <rect
                x="233"
                y="9"
                width="54"
                height="24"
                rx="7"
                fill="#c9c8d2"
                stroke="#78788b"
              />
              <rect x="243" y="9" width="34" height="8" rx="2" fill="#232b3a" />
              <path
                d="M207 81L228 53H292L313 81L300 104H220Z"
                fill="#12192a"
                stroke="#6d7289"
              />
              <path
                d="M230 58H290"
                stroke="#b7e4e2"
                strokeWidth="2"
                opacity=".7"
              />
              <rect
                x="232"
                y="74"
                width="20"
                height="15"
                rx="2"
                fill="#354f5e"
              />
              <rect
                x="259"
                y="74"
                width="27"
                height="15"
                rx="2"
                fill="#415475"
              />
              <path
                d="M236 84L240 79L244 82L248 77M263 79H281M263 84H274"
                fill="none"
                stroke="#b0e6d9"
                strokeWidth="1"
              />
              <g fill="#d6d2db" opacity=".65">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <circle
                    key={i}
                    cx={106 + i * 38.5}
                    cy={279 + 12 * Math.sin((i * Math.PI) / 8)}
                    r="2"
                  />
                ))}
              </g>
              <path
                d="M125 246H395"
                stroke="#81a9a7"
                strokeWidth="2"
                opacity=".3"
              />
            </svg>
            <span className="shelter-capsule-label">
              <i /> CABIN VIEW <b>03 CREW</b>
            </span>
            <div className="shelter-diagram-note">
              <span>01 / FLIGHT DECK</span>
              <span>02 / SHELTER BELOW</span>
            </div>
            <div className="shelter-bays">
              {bundles.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  data-selected={
                    (selected === id && !storm.bundles.includes(id)) ||
                    undefined
                  }
                  type="button"
                  className={`shelter-bay bay-${id} ${storm.bundles.includes(id) ? "is-filled" : ""}`}
                  aria-label={`${label} shielding bay${storm.bundles.includes(id) ? ", filled" : ""}`}
                  aria-disabled={
                    storm.phase !== "shielding" || storm.bundles.includes(id)
                  }
                  onClick={() => place(id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const item = e.dataTransfer.getData("text/plain");
                    if (bundles.some((b) => b.id === item))
                      place(id, item as ShelterItem);
                  }}
                >
                  {storm.bundles.includes(id) ? (
                    <Check size={20} />
                  ) : (
                    <Icon size={20} />
                  )}
                  <span>
                    {label}
                    <small>
                      {storm.bundles.includes(id) ? "SECURED" : "PLACE HERE"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <div
              className={`shelter-crew-pod ${storm.bundles.length === 3 ? "is-shielded" : ""}`}
            >
              <span>
                <ShieldCheck size={14} /> CREW SHELTER
              </span>
              <div>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={storm.crew.includes(i) ? "is-seated" : ""}
                    aria-label={`Shelter seat ${i + 1}${storm.crew.includes(i) ? " occupied" : " empty"}`}
                  >
                    {storm.crew.includes(i) && members[i] ? (
                      <CrewPortrait member={members[i]!} />
                    ) : (
                      <UserRound size={24} />
                    )}
                  </span>
                ))}
              </div>
            </div>
            <span className="shelter-heatshield">
              HEAT SHIELD <i /> CAPSULE BASE
            </span>
          </div>
        </div>
        <div className="shelter-task">
          <div className="shelter-task-caption">
            <span>YOUR NEXT MOVE</span>
            <b>{String(phaseIndex + 1).padStart(2, "0")} / 05</b>
          </div>
          {storm.phase === "alert" ? (
            <div className="shelter-alert-card">
              <div className="shelter-warning-icon">
                <ShieldAlert size={32} />
              </div>
              <strong>Protect the crew</strong>
              <p>
                Build shielding from supplies aboard. Bring all three crew into
                the protected area.
              </p>
              <button
                type="button"
                className="shelter-primary"
                onClick={() => act({ kind: "start" })}
              >
                Prepare shelter
              </button>
            </div>
          ) : null}
          {storm.phase === "shielding" ? (
            <>
              <strong>Supplies aboard · {storm.bundles.length}/3 placed</strong>
              <div className="shelter-items">
                {bundles.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    aria-label={label}
                    disabled={storm.bundles.includes(id)}
                    draggable={!disabled && !storm.bundles.includes(id)}
                    onDragStart={(e) => {
                      choose(id);
                      e.dataTransfer.setData("text/plain", id);
                    }}
                    aria-pressed={selected === id}
                    onClick={() => choose(id)}
                  >
                    <Icon size={22} />
                    <span>
                      {label}
                      <small>
                        {storm.bundles.includes(id)
                          ? "Secured in cabin"
                          : "Select & place"}
                      </small>
                    </span>
                    {storm.bundles.includes(id) && <Check size={16} />}
                  </button>
                ))}
              </div>
              <p className="shelter-hint" role="status">
                {hint ||
                  (selected
                    ? `${selected[0].toUpperCase() + selected.slice(1)} selected. Choose its bay.`
                    : "Tap a bag or drag it into a bay.")}
              </p>
            </>
          ) : null}
          {storm.phase === "crew" ? (
            <>
              <strong>Crew sheltered · {storm.crew.length}/3</strong>
              <div className="shelter-members">
                {members.map((member, i) => (
                  <button
                    type="button"
                    key={i}
                    disabled={storm.crew.includes(i)}
                    onClick={() => act({ kind: "crew", member: i })}
                  >
                    {member ? (
                      <CrewPortrait member={member} />
                    ) : (
                      <UserRound size={26} />
                    )}
                    <span>
                      {member?.role ?? `Crew ${i + 1}`}
                      <small>
                        {storm.crew.includes(i)
                          ? "Inside shelter"
                          : "Move to shelter →"}
                      </small>
                    </span>
                    {storm.crew.includes(i) && <Check size={16} />}
                  </button>
                ))}
              </div>
              {storm.crew.length === 3 && (
                <button
                  className="shelter-primary"
                  type="button"
                  onClick={() => act({ kind: "monitor" })}
                >
                  Monitor radiation
                </button>
              )}
            </>
          ) : null}
          {storm.phase === "checks" ? (
            <>
              <div
                className={`shelter-monitor ${level === "All-clear" ? "is-clear" : ""}`}
                role="status"
              >
                <Activity size={23} />
                <span>
                  Radiation trend<strong>{level}</strong>
                </span>
              </div>
              <svg
                className="shelter-wave"
                viewBox="0 0 300 70"
                aria-hidden="true"
              >
                <path
                  d="M0 20H300M0 45H300M30 0V70M100 0V70M170 0V70M240 0V70"
                  stroke="currentColor"
                  opacity=".12"
                />
                <path
                  d="M0 12L18 17L32 8L46 27L60 12L75 31L90 20L105 40L120 30L136 43L152 36L170 50L186 46L202 56L220 53L236 61L252 58L270 64L300 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <div
                className="shelter-trend"
                aria-label={`Compressed monitoring: ${level}`}
              >
                <span
                  style={{
                    width: `${(100 * storm.monitoring) / SHELTER_WAIT_SECONDS}%`,
                  }}
                />
              </div>
              <small>Time compressed · simulated readings</small>
              {
                <div className="shelter-checks">
                  {checks.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      disabled={storm.checks.includes(id)}
                      onClick={() =>
                        act({ kind: "check", system: id as ShelterCheck })
                      }
                    >
                      <Icon size={18} />
                      {label}
                      <span>
                        {storm.checks.includes(id) ? "✓ Checked" : "Check"}
                      </span>
                    </button>
                  ))}
                  {storm.checks.length === 3 && (
                    <button
                      className="shelter-primary"
                      type="button"
                      onClick={() => act({ kind: "finish" })}
                    >
                      Resume journey →
                    </button>
                  )}
                </div>
              }
            </>
          ) : null}
        </div>
      </fieldset>
      <p className="shelter-source">
        Illustrative layout. Shielding reduces exposure; it does not block all
        radiation.{" "}
        <a
          href="https://www.nasa.gov/reference/crew-systems/"
          target="_blank"
          rel="noreferrer"
        >
          NASA · Orion crew shelter ↗
        </a>
      </p>
    </div>
  );
}
