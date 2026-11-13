import { MISSION_SOURCES } from "../../shared/missionSources";
export function SourceNotes({ ids }: { ids: readonly string[] }) {
  return (
    <small className="source-notes">
      Source:{" "}
      {MISSION_SOURCES.filter((s) => ids.includes(s.id)).map((s, i) => (
        <span key={s.id}>
          {i > 0 ? " · " : ""}
          <a href={s.url} target="_blank" rel="noreferrer" title={s.use}>
            {s.title} ↗
          </a>
        </span>
      ))}
    </small>
  );
}
export function MissionReferences() {
  return (
    <details className="mission-references">
      <summary>Mission sources and credits</summary>
      <p>
        NASA resources informed the mission design. Game prices, tiers and
        teaching assumptions are our own.
      </p>
      {MISSION_SOURCES.map((s) => (
        <article key={s.id}>
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.title} ↗
          </a>
          <p>{s.use}</p>
        </article>
      ))}
    </details>
  );
}
