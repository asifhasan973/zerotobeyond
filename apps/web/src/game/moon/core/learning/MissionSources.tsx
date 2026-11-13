import { useLearningStep } from "./learningScene";
import partPhotos from "../../workshop/partPhotos.json";
import { useState } from "react";
import { Library } from "lucide-react";
import { GameInfo } from "@exo/ui";
import {
  MISSION_SOURCES,
  MODEL_BOUNDARIES,
} from "@/game/moon/shared/missionSources";

export function SourcesButton() {
  const [open, setOpen] = useState(false);
  const step = useLearningStep() ?? "home";
  const relevant = /transfer|orbit|journey|flight|launch/.test(step)
    ? ["horizons", "rocket", "gmat", "apollo"]
    : /return|debrief/.test(step)
      ? ["return", "entry", "moon-map", "lro"]
      : /crew|surface-arrival/.test(step)
        ? ["crew-radio", "first-steps", "apollo"]
        : /science|rover|surface|explor/.test(step)
          ? ["viper", "operations", "water", "rocks", "xray", "lro"]
          : /descent|landing/.test(step)
            ? ["apollo", "moon-map", "lro"]
            : ["challenge", "mission-design", "rocket", "viper"];

  const sourcePage = (title: string, ids: readonly string[]) => (
    <div key={title} className="mission-source-page">
      <h3>{title}</h3>
      {MISSION_SOURCES.filter((source) => ids.includes(source.id)).map(
        (source) => (
          <article key={source.id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title} ↗
            </a>
            <p>{source.use}</p>
          </article>
        ),
      )}
    </div>
  );

  return (
    <>
      <button
        className="conversation-icon labeled-control"
        aria-label="NASA sources and game rules"
        title="NASA sources & game rules"
        onClick={() => setOpen(true)}
      >
        <Library size={20} />
        <span>NASA</span>
      </button>
      {open ? (
        <GameInfo
          title="Science behind the game"
          onClose={() => setOpen(false)}
          pages={[
            sourcePage("Sources for this stage", relevant),
            sourcePage("Mission design & orbital data", [
              "challenge",
              "mission-design",
              "horizons",
              "gmat",
              "lro",
              "maturity",
              "mission-lab",
              "cubesat",
            ]),
            <div key="hardware">
              <h3>Real hardware photos</h3>
              <p>
                Reference photos represent real systems, not exact game tiers or
                ratings.
              </p>
              {Object.entries(partPhotos).map(([key, photo]) => (
                <figure key={key}>
                  <img
                    loading="lazy"
                    src={`${import.meta.env.BASE_URL}${photo.src}`}
                    alt={photo.title}
                    style={{
                      width: "100%",
                      maxHeight: 220,
                      objectFit: "contain",
                    }}
                  />
                  <figcaption>
                    <a href={photo.source} target="_blank" rel="noreferrer">
                      {photo.title} · NASA ↗
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>,
            sourcePage("Crew & flight", [
              "crew-radio",
              "first-steps",
              "apollo",
              "return",
              "entry",
              "rocket",
              "moon-map",
            ]),
            sourcePage("Ice science", ["viper", "water", "operations"]),
            sourcePage("Rock science", ["rocks", "xray"]),
            ...[0, 3].map((start) => (
              <div key={`rules-${start}`} className="mission-source-page">
                <h3>Game rules</h3>
                {MODEL_BOUNDARIES.slice(start, start + 3).map((rule) => (
                  <article key={rule.title}>
                    <strong>{rule.title}</strong>
                    <p>{rule.text}</p>
                  </article>
                ))}
              </div>
            )),
          ]}
        />
      ) : null}
    </>
  );
}
