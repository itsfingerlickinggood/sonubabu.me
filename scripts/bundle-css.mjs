import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const parts = ["reset.css", "variables.css", "base.css", "components.css", "pages.css"].map(
  (f) => readFileSync(join(root, "css", f), "utf8")
);
const bundle = parts.join("\n");
writeFileSync(join(root, "css", "_bundle.css"), bundle);
