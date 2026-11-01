import { Router } from "express";
import { z } from "zod";
import { findHome, listIncidents } from "../store.ts";

export const incidentsRouter = Router({ mergeParams: true });

const incidentParams = z.object({ homeId: z.string().min(1) });

const incidentQuery = z.object({
  state: z.enum(["open", "resolved"]).optional(),
});

/** GET /api/homes/:homeId/incidents — a home's incidents, newest first. */
incidentsRouter.get("/", (req, res) => {
  const params = incidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid_params", detail: params.error.issues });
    return;
  }

  const query = incidentQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "invalid_query", detail: query.error.issues });
    return;
  }

  const { homeId } = params.data;
  if (!findHome(homeId)) {
    res.status(404).json({ error: "home_not_found", homeId });
    return;
  }

  res.json({ incidents: listIncidents(homeId, query.data.state) });
});
