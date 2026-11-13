import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Database,
  FlaskConical,
  LoaderCircle,
  Save,
  Satellite,
} from "lucide-react";
import { useBlueprint } from "./useBlueprint";
import { GoalPanel, DesignPanel } from "./DesignPanel";
import { LiveBudget, TestPanel, ComparePanel } from "./ResultsPanel";
import { SourcesPanel } from "./SourcesPanel";
import { BlueprintPanel } from "./BlueprintPanel";
import { sound } from "@exo/audio";
const STEPS = [
  "Define mission",
  "Design spacecraft",
  "Test resources",
  "Compare designs",
  "Mission blueprint",
  "Sources & model",
];
export function BlueprintStudio({
  onPowerStudy,
}: {
  onPowerStudy: () => void;
}) {
  const state = useBlueprint();
  const [step, setStep] = useState(0);
  const [sourceId, setSourceId] = useState("");
  const workbench = useRef<HTMLDivElement>(null);
  const go = (next: number) => {
    setStep(next);
    sound.playClick(650);
  };
  const showSource = (id: string) => {
    setSourceId(id);
    go(5);
  };
  useEffect(() => {
    if (step === 5 && sourceId) {
      const frame = requestAnimationFrame(() => {
        const element = document.getElementById(`bp-source-${sourceId}`);
        element?.focus({ preventScroll: true });
        element?.scrollIntoView({ block: "start", behavior: "instant" });
      });
      return () => cancelAnimationFrame(frame);
    }
    if (workbench.current) workbench.current.scrollTop = 0;
  }, [step, sourceId]);
  return (
    <div className="mission-blueprint">
      <header className="bp-header">
        <div className="bp-header-title">
          <Satellite size={28} aria-hidden="true" />
          <div>
            <h1>Mission Blueprint Studio</h1>
            <p>Turn a science question into an engineering concept.</p>
          </div>
        </div>
        <div className="bp-header-actions">
          <button className="bp-secondary" onClick={onPowerStudy}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>Rover power study</span>
          </button>
          <button disabled={!state.result} onClick={state.save}>
            <Save size={15} aria-hidden="true" />
            Save draft
          </button>
        </div>
      </header>
      <main id="engineering-content" className="bp-layout">
        <aside className="bp-rail">
          <nav aria-label="Mission design workflow">
            {STEPS.map((label, i) => (
              <button
                key={label}
                aria-current={step === i ? "step" : undefined}
                onClick={() => {
                  setSourceId("");
                  go(i);
                }}
              >
                <span>
                  {i === 5 ? (
                    <Database size={15} aria-hidden="true" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                {label}
                {step === i && (
                  <ArrowRight
                    className="bp-step-arrow"
                    size={14}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </nav>
          <div className="bp-geometry">
            <div className="bp-section-heading">
              <h2>NASA geometry</h2>
              <Database size={14} aria-hidden="true" />
            </div>
            <label className="bp-field">
              Prediction date · TDB
              <input
                type="date"
                min="2000-01-01"
                max="2099-12-31"
                value={state.draft.date}
                onChange={(e) => state.update("date", e.target.value)}
              />
            </label>
            <button
              disabled={
                state.loading || !/^20\d{2}-\d{2}-\d{2}$/.test(state.draft.date)
              }
              onClick={state.fetchGeometry}
            >
              {state.loading ? (
                <LoaderCircle
                  size={14}
                  className="bp-loading-icon"
                  aria-hidden="true"
                />
              ) : (
                <Database size={14} aria-hidden="true" />
              )}
              {state.loading ? "Requesting NASA…" : "Fetch NASA data"}
            </button>
            <p>
              {state.matchingGeometry ? state.origin : "No matching geometry"}
              <br />
              <strong>{state.geometry.date} TDB</strong>
            </p>
            <button
              className="bp-text-button"
              onClick={state.useReferenceGeometry}
            >
              Use bundled reference
            </button>
            <button
              className="bp-text-button"
              onClick={() => showSource("horizons")}
            >
              Query, dates & limitations{" "}
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <p className="bp-rail-foot">
            Advanced learning lab
            <br />
            Lunar science orbiter · 24h
          </p>
        </aside>
        <div className="bp-workbench" ref={workbench}>
          {(state.errors.length > 0 || !state.matchingGeometry) && (
            <div className="bp-validation" role="alert">
              <strong>Resolve inputs to run this concept.</strong>
              <ul>
                {state.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
                {!state.matchingGeometry && (
                  <li>
                    Fetch NASA geometry for the selected date, or use the dated
                    bundled reference.
                  </li>
                )}
              </ul>
            </div>
          )}
          {step === 0 ? (
            <GoalPanel
              state={state}
              onSource={showSource}
              onNext={() => go(1)}
            />
          ) : step === 1 ? (
            <DesignPanel state={state} onSource={showSource} />
          ) : step === 2 ? (
            <TestPanel
              state={state}
              onSource={showSource}
              onDesign={() => go(1)}
            />
          ) : step === 3 ? (
            <ComparePanel state={state} />
          ) : step === 4 ? (
            <BlueprintPanel state={state} onSource={showSource} />
          ) : (
            <SourcesPanel
              geometry={state.geometry}
              origin={state.origin}
              focusId={sourceId}
            />
          )}
        </div>
        <LiveBudget state={state} onSource={showSource} />
      </main>
      <footer className="bp-footer">
        <p role="status" aria-live="polite">
          {state.message || (
            <>
              <Check size={14} aria-hidden="true" />
              Dated NASA evidence. Explicit assumptions. Reproducible results.
            </>
          )}
        </p>
        <div>
          <button disabled={!state.result} onClick={state.pinBaseline}>
            <BookmarkPlus size={15} aria-hidden="true" />
            <span>Pin design A</span>
          </button>
          {step < 4 && (
            <button className="bp-primary" onClick={() => go(step + 1)}>
              {step === 0
                ? "Design spacecraft"
                : step === 1
                  ? "Test resources"
                  : step === 2
                    ? "Compare designs"
                    : "Create blueprint"}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
