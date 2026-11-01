import { Router } from "express";
import { z } from "zod";
import { countOpenIncidents, findHome, listHomes } from "../store.ts";

export const homesRouter = Router();

/** GET /api/homes — every home, with how many incidents are currently open. */
homesRouter.get("/", (_req, res) => {
  res.json({
    homes: listHomes().map((home) => ({ ...home, openIncidents: countOpenIncidents(home.id) })),
  });
});

const homeParams = z.object({ homeId: z.string().min(1) });

/** GET /api/homes/:homeId — one home. */
homesRouter.get("/:homeId", (req, res) => {
  const params = homeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "invalid_params", detail: params.error.issues });
    return;
  }

  const home = findHome(params.data.homeId);
  if (!home) {
    res.status(404).json({ error: "home_not_found", homeId: params.data.homeId });
    return;
  }
  res.json({ home: { ...home, openIncidents: countOpenIncidents(home.id) } });
});
