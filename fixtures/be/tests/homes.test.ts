import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createApp } from "../src/app.ts";

/** Start the app on a free port for one test and shut it down afterwards. */
async function withServer<T>(use: (base: string) => Promise<T>): Promise<T> {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("server did not bind a port");
  try {
    return await use(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** `fetch`, with the body left as `unknown` so each test parses the shape it expects. */
async function get(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url);
  return { status: res.status, body: await res.json() };
}

const homeSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  timezone: z.string(),
  devices: z.number(),
  openIncidents: z.number(),
});

const incidentSchema = z.object({
  id: z.string(),
  homeId: z.string(),
  kind: z.enum(["noise", "occupancy", "offline"]),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  peakDb: z.number().nullable(),
  status: z.enum(["open", "resolved"]),
});

const errorSchema = z.object({ error: z.string() });

test("GET /api/health", async () => {
  await withServer(async (base) => {
    const { status, body } = await get(`${base}/api/health`);
    assert.equal(status, 200);
    assert.deepEqual(body, { ok: true });
  });
});

test("GET /api/homes lists homes with their open incident count", async () => {
  await withServer(async (base) => {
    const { status, body } = await get(`${base}/api/homes`);
    assert.equal(status, 200);
    const { homes } = z.object({ homes: z.array(homeSchema) }).parse(body);
    assert.equal(homes.length, 4);
    assert.equal(homes.find((home) => home.id === "h-01")?.openIncidents, 2);
  });
});

test("GET /api/homes/:homeId returns one home", async () => {
  await withServer(async (base) => {
    const { status, body } = await get(`${base}/api/homes/h-03`);
    assert.equal(status, 200);
    const { home } = z.object({ home: homeSchema }).parse(body);
    assert.equal(home.name, "Nørrebrogade 18");
  });
});

test("GET /api/homes/:homeId is 404 for an unknown home", async () => {
  await withServer(async (base) => {
    const { status, body } = await get(`${base}/api/homes/h-99`);
    assert.equal(status, 404);
    assert.equal(errorSchema.parse(body).error, "home_not_found");
  });
});

test("GET /api/homes/:homeId/incidents lists a home's incidents, newest first", async () => {
  await withServer(async (base) => {
    const { status, body } = await get(`${base}/api/homes/h-01/incidents`);
    assert.equal(status, 200);
    const { incidents } = z.object({ incidents: z.array(incidentSchema) }).parse(body);
    assert.deepEqual(incidents.map((incident) => incident.id), ["i-1001", "i-1002", "i-1003"]);
  });
});

test("GET /api/homes/:homeId/incidents is 404 for an unknown home", async () => {
  await withServer(async (base) => {
    const { status, body } = await get(`${base}/api/homes/h-99/incidents`);
    assert.equal(status, 404);
    assert.equal(errorSchema.parse(body).error, "home_not_found");
  });
});
