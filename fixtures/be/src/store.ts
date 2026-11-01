/**
 * The data layer. Reads the fixture once at startup and keeps it in memory, so the service has
 * no database to set up. Writes stay in memory and are lost on restart.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Home = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  devices: number;
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

type Fixture = { homes: Home[]; incidents: Incident[] };

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "../data/homes.json");
const fixture: Fixture = JSON.parse(readFileSync(dataFile, "utf8"));

const homes = [...fixture.homes];
const incidents = [...fixture.incidents];

export const listHomes = (): Home[] => [...homes];

export const findHome = (id: string): Home | undefined => homes.find((home) => home.id === id);

export function listIncidents(homeId: string, status?: IncidentStatus): Incident[] {
  return incidents
    .filter((incident) => incident.homeId === homeId)
    .filter((incident) => (status ? incident.status === status : true))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export const countOpenIncidents = (homeId: string): number =>
  incidents.filter((incident) => incident.homeId === homeId && incident.status === "open").length;
