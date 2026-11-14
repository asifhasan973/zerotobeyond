import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Search, X } from "lucide-react";
import { SOLAR_SEARCH_ALIASES, type CosmicObject } from "@exo/data/cosmic";
interface Props {
  objects: CosmicObject[];
  onSources(): void;
  onSelect(id: string): void;
}
const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]/g, "");
export function SolarNav(p: Props) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const search = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const term = normalize(query);
  const results = p.objects.filter((o) =>
    [o.name, o.id, ...(SOLAR_SEARCH_ALIASES[o.id] ?? [])].some((name) =>
      normalize(name).includes(term),
    ),
  );
  const choose = (id: string) => {
    p.onSelect(id);
    setQuery("");
    setOpen(false);
    setActive(0);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !search.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open)
      search.current
        ?.querySelector('[role="option"][aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);
  return (
    <header className="solar-header">
      <div className="solar-search" ref={search}>
        <Search size={17} />
        <input
          ref={input}
          role="combobox"
          aria-label="Search planets and spacecraft"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="solar-search-results"
          aria-activedescendant={
            open && results[active]
              ? `solar-search-${results[active].id}`
              : undefined
          }
          placeholder="Find a planet or spacecraft…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              e.stopPropagation();
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                results.length
                  ? (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                    results.length
                  : 0,
              );
            } else if (e.key === "Enter" && open && results[active]) {
              e.preventDefault();
              choose(results[active].id);
            }
          }}
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActive(0);
              setOpen(true);
              input.current?.focus();
            }}
          >
            <X size={14} />
          </button>
        )}
        {open && (
          <div className="solar-search-panel">
            <p>
              {query
                ? `${results.length} ${results.length === 1 ? "destination" : "destinations"} found`
                : "Where would you like to go?"}
            </p>
            <div
              id="solar-search-results"
              role="listbox"
              aria-label="Search results"
            >
              {results.map((o, index) => (
                <button
                  role="option"
                  id={`solar-search-${o.id}`}
                  aria-selected={index === active}
                  key={o.id}
                  onPointerMove={() => setActive(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o.id)}
                >
                  <i style={{ background: o.color }} />
                  <span>
                    {o.name}
                    <small>
                      {o.kind === "spacecraft"
                        ? "Spacecraft"
                        : o.kind === "moon"
                          ? "Moon"
                          : o.kind === "star"
                            ? "Star"
                            : "Planet"}
                    </small>
                  </span>
                  {index === active && <Check size={14} />}
                </button>
              ))}
            </div>
            {!results.length && (
              <div className="solar-search-empty">
                No matches for “{query}”.
                <button
                  onClick={() => {
                    setQuery("");
                    setActive(0);
                    input.current?.focus();
                  }}
                >
                  Show all destinations
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <button
        className="solar-sources-button"
        aria-label="Sources"
        title="Sources"
        onClick={p.onSources}
      >
        <BookOpen size={17} />
      </button>
    </header>
  );
}
