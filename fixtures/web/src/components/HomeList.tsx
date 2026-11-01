import type { Home } from "../api.ts";

type Props = {
  homes: Home[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function HomeList({ homes, selectedId, onSelect }: Props) {
  return (
    <nav className="panel" aria-label="Homes">
      <h2>Homes</h2>
      <ul className="homes">
        {homes.map((home) => (
          <li key={home.id}>
            <button
              type="button"
              className={home.id === selectedId ? "home selected" : "home"}
              aria-current={home.id === selectedId}
              onClick={() => onSelect(home.id)}
            >
              <span className="home-name">{home.name}</span>
              <span className="home-address">{home.address}</span>
              {home.openIncidents > 0 && (
                <span className="badge" title={`${home.openIncidents} open incidents`}>
                  {home.openIncidents}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
