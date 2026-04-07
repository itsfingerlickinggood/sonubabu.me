import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "learnings.html");

let main = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");
main = main.replace(/\s*scheduleVizLoad\(\);\s*\n/, "\n");
main = main.replace(/\nfunction scheduleVizLoad\(\) \{[\s\S]*?\n\}\n/, "\n");

const learn = fs.readFileSync(path.join(root, "js", "learnings.js"), "utf8");
const viz = fs.readFileSync(path.join(root, "js", "viz.min.js"), "utf8");

const block = `  <!-- sonu:inline-learnings-js -->
  <script>
${learn}
${main}
  </script>
  <script>
${viz}
  </script>
  <!-- /sonu:inline-learnings-js -->
`;

let html = fs.readFileSync(htmlPath, "utf8");

const markerRe =
  /<!-- sonu:inline-learnings-js -->[\s\S]*?<!-- \/sonu:inline-learnings-js -->/;
const externalRe =
  /\s*<script defer src="\/js\/main\.min\.js"><\/script>\s*\n\s*<script defer src="\/js\/learnings\.min\.js"><\/script>\s*/;

if (markerRe.test(html)) {
  html = html.replace(markerRe, block.trimEnd() + "\n");
} else if (externalRe.test(html)) {
  html = html.replace(externalRe, "\n" + block);
} else {
  console.error("learnings.html: no inline markers and no external main/learnings scripts.");
  process.exit(1);
}

fs.writeFileSync(htmlPath, html);
console.log("Inlined main + learnings + viz into learnings.html");
