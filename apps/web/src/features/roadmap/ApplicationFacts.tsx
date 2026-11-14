import {
  APPLICATION_HISTORY,
  ASTRONAUT_VACANCY,
} from "@exo/data/roadmap/journeys";
import { CalendarDays, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
export function ApplicationFacts({ role }: { role: number }) {
  const [elapsed] = useState(
    () => Date.now() > Date.parse(ASTRONAUT_VACANCY.deadline),
  );
  return (
    <section className="rm-facts" id="rm-facts">
      <span className="rm-kicker">
        <ShieldCheck size={15} /> IMPORTANT / FOR LEARNERS & GROWN-UPS
      </span>
      <h2>Dream big. Know the real rules.</h2>
      <div className="rm-fact-grid">
        <article className="rm-application">
          <CalendarDays size={24} />
          <span className="rm-kicker">ASTRONAUT RECRUITMENT</span>
          <h3>
            {elapsed
              ? "The published window has ended"
              : "Published closing date"}
          </h3>
          <strong>{ASTRONAUT_VACANCY.label}</strong>
          <p>
            4 December, 10:59 a.m. in Bangladesh (UTC+6). Snapshot checked{" "}
            {ASTRONAUT_VACANCY.checked}; not a live vacancy feed. Recheck the
            official listing before applying.
          </p>
          <a href={ASTRONAUT_VACANCY.url} target="_blank" rel="noreferrer">
            Read the actual announcement <ExternalLink size={14} />
          </a>
        </article>
        <article>
          <span className="rm-kicker">WHO CAN APPLY?</span>
          <h3>Eligibility comes first.</h3>
          <p>
            NASA’s astronaut programme requires U.S. citizenship, qualifying
            STEM education, relevant experience and a medical examination. A
            child’s school activity is not an application qualification.
          </p>
          <a
            href="https://www.nasa.gov/humans-in-space/astronauts/become-an-astronaut/"
            target="_blank"
            rel="noreferrer"
          >
            NASA’s current requirements ↗
          </a>
        </article>
        <article>
          <span className="rm-kicker">WHAT ABOUT SCIENTISTS & ENGINEERS?</span>
          <h3>Different roles. Different openings.</h3>
          <p>
            {role === 0
              ? "Space careers extend beyond the astronaut corps. "
              : "Your chosen career does not use an astronaut application cycle. "}
            Research, engineering and internship vacancies open separately. Each
            employer sets its own qualifications and eligibility.
          </p>
          <a
            href="https://www.nasa.gov/careers/how-to-apply/"
            target="_blank"
            rel="noreferrer"
          >
            NASA: how to apply ↗
          </a>
        </article>
      </div>
      <div className="rm-history-heading">
        <h3>When did NASA recruit before?</h3>
        <p>
          Selected recent cycles, not the entire history. Recruitment is as
          needed; do not assume a yearly or guaranteed four-year intake.
        </p>
      </div>
      <ol className="rm-history">
        {APPLICATION_HISTORY.map((item) => (
          <li key={item.date}>
            <time>{item.date}</time>
            <h4>{item.title}</h4>
            <p>{item.detail}</p>
            <a href={item.url} target="_blank" rel="noreferrer">
              NASA record ↗
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
