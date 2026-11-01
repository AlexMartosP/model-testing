import express from "express";
import { homesRouter } from "./routes/homes.ts";
import { incidentsRouter } from "./routes/incidents.ts";

export function createApp() {
  const app = express();
  app.use(express.json());

  // The dev web app runs on another port.
  app.use((_req, res, next) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type");
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/homes/:homeId/incidents", incidentsRouter);
  app.use("/api/homes", homesRouter);

  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  return app;
}
