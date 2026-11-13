import { useEffect, useRef } from "react";
import { ArrowRight, Radio, ShieldAlert } from "lucide-react";
import { STORM_STORY } from "./stormAssets";
export function StormIntro({
  index,
  disabled,
  onNext,
}: {
  index: 0 | 1;
  disabled: boolean;
  onNext(): void;
}) {
  const scene = STORM_STORY[index];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);
  return (
    <section
      className="solar-shelter shelter-story"
      aria-labelledby="storm-story-title"
    >
      <img
        key={scene.src}
        className="storm-story-image"
        src={scene.src}
        alt={scene.alt}
        decoding="async"
      />
      <div className="storm-story-top">
        <span>
          <ShieldAlert size={15} /> Simulated solar particle event
        </span>
        <span>{scene.label}</span>
      </div>
      <div className="storm-story-caption">
        <div className="storm-story-copy">
          <span className="storm-story-radio">
            <Radio size={15} />
            {scene.speaker}
          </span>
          <h2 id="storm-story-title" ref={heading} tabIndex={-1}>
            {scene.title}
          </h2>
          <p>{scene.line}</p>
        </div>
        <div className="storm-story-action">
          <span
            className="storm-story-pages"
            aria-label={`Scene ${index + 1} of 2`}
          >
            <i className={index === 0 ? "is-current" : ""} />
            <i className={index === 1 ? "is-current" : ""} />
            <b>0{index + 1} / 02</b>
          </span>
          <button type="button" disabled={disabled} onClick={onNext}>
            {scene.action}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <small className="storm-story-credit">
        Illustrated scenario · radiation is invisible
      </small>
    </section>
  );
}
