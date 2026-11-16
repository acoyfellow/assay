import { Runtime } from "foldkit";
import { Model } from "./model.ts";
import { subscriptions } from "./subscriptions.ts";
import { restMs } from "./timeline.ts";
import { update } from "./update.ts";
import { view } from "./view.ts";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const frozenAt = new URLSearchParams(location.search).get("t");
const startClock = frozenAt !== null ? Number(frozenAt) : still ? restMs : 0;
const startPlaying = frozenAt === null && !still;

Runtime.run(
  Runtime.makeElement({
    Model,
    init: () => ({
      model: { surface: "pi" as const, copied: "", clock: startClock, playing: startPlaying },
      commands: [],
    }),
    update,
    view,
    subscriptions,
    container: document.getElementById("root"),
  }),
);
