import { Runtime } from "foldkit";
import { Model } from "./model.ts";
import { update } from "./update.ts";
import { view } from "./view.ts";

Runtime.run(
  Runtime.makeElement({
    Model,
    init: () => ({ model: { surface: "cli" as const, copied: false }, commands: [] }),
    update,
    view,
    container: document.getElementById("root"),
  }),
);
