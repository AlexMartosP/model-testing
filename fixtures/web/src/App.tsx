import { useEffect, useState } from "react";
import type { Home } from "./api.ts";
import { getHomes } from "./api.ts";
import { HomeList } from "./components/HomeList.tsx";
import { IncidentList } from "./components/IncidentList.tsx";

export function App() {
  const [homes, setHomes] = useState<Home[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getHomes().then(setHomes, (reason: unknown) => setError(String(reason)));
  }, []);

  const selected = homes?.find((home) => home.id === selectedId) ?? null;

  return (
    <div className="app">
      <header>
        <h1>Property monitor</h1>
      </header>

      {error && <p className="error">Could not load homes: {error}</p>}
      {!homes && !error && <p className="muted">Loading…</p>}

      {homes && (
        <main>
          <HomeList homes={homes} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <IncidentList home={selected} />
          ) : (
            <section className="panel">
              <p className="muted">Pick a home to see its incidents.</p>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
