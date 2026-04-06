import { unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const p = join(dirname(fileURLToPath(import.meta.url)), "..", "css", "_bundle.css");
if (existsSync(p)) unlinkSync(p);
