import { MISSION_NODES, ROADMAP_SOURCES } from "@exo/data/roadmap";
export function MissionRoadmap() {
  return (
    <section className="rm-mission">
      <span className="rm-kicker">FOR COLLEGE & UNIVERSITY TEAMS</span>
      <h2>A small satellite. A real science question.</h2>
      <p>
        Explore the process, time and cost references. Several stages happen in
        parallel.
      </p>{" "}
      <div className="roadmap-summary">
        <article>
          <small>BUILD & DELIVERY REFERENCE</small>
          <strong>18–24 months</strong>
          <p>
            Typical in NASA's 2017 guide; launch wait adds months to years.
            Workstreams overlap.
          </p>
          <a href={ROADMAP_SOURCES[2].url}>NASA CubeSat 101 · Chapter 2 ↗</a>
        </article>
        <article>
          <small>HISTORICAL TELESCOPE EXAMPLE</small>
          <strong>HaloSat: &lt; $4M</strong>
          <p>
            Start through first year of operations. A historical mission
            example, not your university's estimated total.
          </p>
          <a href={ROADMAP_SOURCES[4].url}>NASA HaloSat report ↗</a>
        </article>
        <article>
          <small>ADVERTISED LAUNCH REFERENCE</small>
          <strong>$350k / 50 kg</strong>
          <p>
            SpaceX to SSO; launch reference only. Additional mass $7k/kg.
            Reconfirm quote, integration and terms.
          </p>
          <a href={ROADMAP_SOURCES[3].url}>
            SpaceX Rideshare · checked 14 Nov 2026 ↗
          </a>
        </article>
      </div>
      <div className="roadmap-mission">
        <ol>
          {MISSION_NODES.map((item, i) => (
            <li key={item.title}>
              <span className="rm-dot">{i + 1}</span>
              <article className="rm-step">
                <span className="rm-kicker">{item.subtitle}</span>
                <h3>{item.title}</h3>
                <p>{item.time}</p>
                <details>
                  <summary>What happens here?</summary>
                  <p>{item.detail}</p>
                  <p>
                    <strong>Budget:</strong> {item.cost}
                  </p>
                  <a
                    href={
                      ROADMAP_SOURCES.find((s) => s.id === item.source)?.url
                    }
                  >
                    Official reference ↗
                  </a>
                </details>
              </article>
            </li>
          ))}
        </ol>
      </div>
      <div className="roadmap-intro">
        <h3>What can it do?</h3>
        <p>
          Focused Earth imaging, radiation or technology experiments; a
          purpose-built telescope can answer a narrow astronomy question.
          Required resolution, pointing, sensitivity and data return must be
          justified in feasibility.
        </p>
        <h3>What will your mission cost?</h3>
        <p>
          No verified universal total. Request separate quotes for payload,
          spacecraft, labour, facilities/testing, licensing,
          integration/dispenser, launch, logistics, ground operations and
          contingency. The references above are not additive and do not
          establish a minimum or maximum university budget.
        </p>
        <p>
          <strong>Who to approach:</strong> faculty and university research
          offices first; then instrument suppliers, test facilities, a launch
          integrator/provider and relevant national authorities. NASA CSLI
          serves eligible U.S. organisations, not every university worldwide.
        </p>
      </div>
    </section>
  );
}
