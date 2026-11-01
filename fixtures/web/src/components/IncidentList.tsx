import { useEffect, useState } from "react";
import type { Home, Incident } from "../api.ts";
import { getIncidents } from "../api.ts";
import { formatPeak, formatStarted, kindLabel } from "../format.ts";

export function IncidentList({ home }: { home: Home }) {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIncidents(null);
    setError(null);
    let current = true;
    getIncidents(home.id, "open").then(
      (rows) => { if (current) setIncidents(rows); },
      (reason: unknown) => { if (current) setError(String(reason)); },
    );
    return () => {
      current = false;
    };
  }, [home.id]);

  return (
    <section className="panel" aria-label={`Incidents for ${home.name}`}>
      <h2>{home.name}</h2>
      <p className="muted">
        {home.devices} device{home.devices === 1 ? "" : "s"} · {home.timezone}
      </p>

      {error && <p className="error">Could not load incidents: {error}</p>}
      {!incidents && !error && <p className="muted">Loading…</p>}
      {incidents?.length === 0 && <p className="muted">No open incidents.</p>}

      {incidents && incidents.length > 0 && (
        <ul className="incidents">
          {incidents.map((incident) => (
            <li key={incident.id} className={`incident ${incident.kind}`}>
              <span className="incident-kind">{kindLabel[incident.kind]}</span>
              <span className="incident-when">{formatStarted(incident.startedAt)}</span>
              <span className="incident-peak">{formatPeak(incident.peakDb)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
