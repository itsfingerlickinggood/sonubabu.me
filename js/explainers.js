/* Small, deterministic teaching tools. No network requests or animation loops. */
(() => {
  "use strict";
  const select = (root, value) => {
    root.querySelectorAll("[data-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.choice === String(value)));
    });
  };
  const bind = (root, update, initial) => {
    root.querySelectorAll("[data-choice]").forEach(button => {
      button.addEventListener("click", () => {
        const value = button.dataset.choice;
        select(root, value);
        update(value);
      });
    });
    select(root, initial);
    update(String(initial));
  };
  const write = (root, selector, value) => { root.querySelector(selector).textContent = value; };
  const security = [
    ["Expression", "Expression evaluation stays within arithmetic.", "Unintended local-file access", "Constrain evaluation to explicitly permitted arithmetic operations."],
    ["Resource or tool request", "A reachable interface is also authorized.", "Exposed MCP resources and tools", "Check resource and tool permissions at each server-side access boundary."],
    ["Connectivity input", "Input remains data when a command is prepared.", "Command injection and log disclosure", "Keep arguments separate from commands and limit sensitive information in logs."],
    ["Configuration document", "Parsing a document cannot execute behavior.", "Unsafe YAML deserialization", "Use safe parsing with a constrained schema and reject executable object construction."],
    ["Shared session state", "Cached authorization remains valid for the current actor.", "Authorization-state poisoning", "Bind authorization to the current principal and recheck it at the operation boundary."],
    ["Trading operation", "A checked balance cannot change before use.", "TOCTOU race and double spending", "Make validation and state change atomic, with explicit concurrency controls."]
  ];
  const weather = {
    ready: ["26°", "Illustrative temperature · °C", "Ready · sample forecast available.", true],
    cached: ["26°", "Previously available sample · °C", "Cached · keep the previous view visible and identify that it may be stale.", true],
    loading: ["—", "Waiting for data", "Loading · do not display a fabricated temperature while data is unavailable.", false],
    empty: ["—", "No forecast available", "No data · the request completed without a usable forecast.", false],
    error: ["—", "Forecast unavailable", "Error · a failed request is different from a zero-degree forecast.", false]
  };
  const sources = {
    html: ["research/alignment-faking.html", "HTML carries the article and its evidence. Reading and ordinary links do not require JavaScript."],
    css: ["css/work.css → css/site.min.css", "The shared stylesheet supplies layout, theme, figure styling, and focus states. The build combines and minifies it."],
    js: ["js/research.js → js/research.min.js", "Page-specific JavaScript connects controls to figures. It enhances the article without owning its underlying evidence."]
  };
  document.querySelectorAll("[data-explainer]").forEach(root => {
    const kind = root.dataset.explainer;
    if (kind === "inventory") {
      const input = root.querySelector("select");
      const rows = [...root.querySelectorAll("[data-memory]")];
      const update = () => {
        const floor = Number(input.value);
        rows.forEach(row => { row.hidden = Number(row.dataset.memory) < floor; });
        const count = rows.filter(row => !row.hidden).length;
        write(root, "[data-inventory-count]", `${count} of ${rows.length} example records meet the filter${floor ? ` (at least ${floor} GiB)` : ""}.`);
      };
      input.addEventListener("change", update);
      root.querySelector("[data-reset]").addEventListener("click", () => { input.value = "0"; update(); });
      update();
    } else if (kind === "verifier") {
      bind(root, perspective => {
        root.querySelectorAll("[data-access]").forEach(item => {
          item.classList.toggle("is-unavailable", !item.dataset.access.split(" ").includes(perspective));
        });
        root.querySelectorAll("[data-lane]").forEach(lane => lane.classList.toggle("is-selected", lane.dataset.lane === perspective));
        write(root, "[data-perspective-output]", perspective === "agent"
          ? "Agent perspective: public task material and the submission are visible; held-out labels and verifier logic remain outside the workspace."
          : "Verifier perspective: the submitted artifacts can be checked against held-out labels using separate evaluation logic.");
      }, "agent");
    } else if (kind === "security") {
      bind(root, index => {
        const values = security[Number(index)];
        if (!values) return;
        ["input", "assumption", "failure", "control"].forEach((field, i) => write(root, `[data-security-${field}]`, values[i]));
      }, 0);
    } else if (kind === "weather") {
      bind(root, state => {
        const values = weather[state];
        if (!values) return;
        write(root, "[data-weather-value]", values[0]);
        write(root, "[data-weather-label]", values[1]);
        write(root, "[data-weather-status]", values[2]);
        root.querySelector(".weather-profile").style.visibility = values[3] ? "visible" : "hidden";
        root.querySelector(".weather-profile").setAttribute("aria-hidden", String(!values[3]));
      }, "ready");
    } else if (kind === "publishing") {
      bind(root, layer => {
        if (!sources[layer]) return;
        write(root, "[data-source-file]", sources[layer][0]);
        write(root, "[data-source-output]", sources[layer][1]);
        root.querySelectorAll("[data-output-layer]").forEach(output => output.classList.toggle("is-selected", output.dataset.outputLayer === layer));
        root.querySelectorAll("[data-source-edge]").forEach(edge => edge.classList.toggle("is-selected", edge.dataset.sourceEdge === layer));
      }, "html");
    } else return;
    root.querySelectorAll("[data-lab-controls]").forEach(control => { control.hidden = false; });
  });
})();
