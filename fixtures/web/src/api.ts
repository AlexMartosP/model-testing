/** Everything this app knows about the backend. */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type Home = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  devices: number;
  openIncidents: number;
};

export type IncidentKind = "noise" | "occupancy" | "offline";
export type IncidentStatus = "open" | "resolved";

export type Incident = {
  id: string;
  homeId: string;
  kind: IncidentKind;
  startedAt: string;
  endedAt: string | null;
  peakDb: number | null;
  status: IncidentStatus;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  // The response shape is trusted here, not validated. The backend's own tests are what hold it.
  return res.json() as Promise<T>;
}

export async function getHomes(): Promise<Home[]> {
  const body = await get<{ homes: Home[] }>("/api/homes");
  return body.homes;
}

export async function getIncidents(homeId: string, status?: IncidentStatus): Promise<Incident[]> {
  const query = status ? `?status=${status}` : "";
  const body = await get<{ incidents: Incident[] }>(`/api/homes/${homeId}/incidents${query}`);
  return body.incidents;
}
