(() => {
  "use strict";

  const setPressed = (buttons, active) => {
    buttons.forEach((button) => {
      const selected = button === active;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-active", selected);
    });
  };

  document.querySelectorAll("[data-result-chart]").forEach((chart) => {
    const buttons = [...chart.querySelectorAll("[data-chart-phase]")];
    const summary = chart.querySelector("[data-chart-summary]");
    const summaries = {
      compare: "Compare the gaps: +6.5 and −2.0 percentage points in the pilot; −0.25 and +0.25 in replication. Order, precision, and generation mode changed between phases.",
      pilot: "Pilot: DeepSeek showed a 6.5 percentage-point gap; Qwen moved 2 points in the opposite direction.",
      replication: "Replication: both models differed by only 0.25 percentage points between conditions."
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const phase = button.dataset.chartPhase;
        chart.dataset.phase = phase;
        setPressed(buttons, button);
        chart.querySelectorAll("[data-phase-panel]").forEach((panel) => {
          panel.hidden = phase !== "compare" && panel.dataset.phasePanel !== phase;
        });
        if (summary) summary.textContent = summaries[phase];
      });
    });
  });

  document.querySelectorAll("[data-trace-explorer]").forEach((explorer) => {
    const slider = explorer.querySelector("input[type='range']");
    const turnLabel = explorer.querySelector("[data-turn-label]");
    const explanation = explorer.querySelector("[data-turn-explanation]");
    const cells = [...explorer.querySelectorAll("[data-turn]")];
    const phases = [
      "Benign setup establishes the task context.",
      "A capability-relevant detail appears without the full objective.",
      "Pieces begin to compose into a risk-relevant trajectory.",
      "The model supplies assistance that an endpoint-only label could miss.",
      "A late refusal does not erase information already supplied."
    ];

    if (!slider) return;
    const update = () => {
      const turn = Number(slider.value);
      if (turnLabel) turnLabel.textContent = `Turn ${turn}`;
      if (explanation) explanation.textContent = phases[turn - 1];
      const endpoint = explorer.querySelector("[data-endpoint-reading]");
      const path = explorer.querySelector("[data-path-reading]");
      if (endpoint) endpoint.textContent = turn === 5 ? "A refusal is visible at the endpoint." : turn === 4 ? "Assistance is marked at this turn." : "Setup or partial context; no late refusal yet.";
      if (path) path.textContent = turn >= 4 ? "Earlier assistance remains part of the trace—even after a later refusal." : "No assistance has been marked in this illustrative path yet.";
      slider.setAttribute("aria-valuetext", `Turn ${turn}: ${phases[turn - 1]}`);
      cells.forEach((cell) => {
        const cellTurn = Number(cell.dataset.turn);
        cell.classList.toggle("is-past", cellTurn < turn);
        cell.classList.toggle("is-current", cellTurn === turn);
      });
    };
    slider.addEventListener("input", update);
    update();
  });

  document.querySelectorAll("[data-trust-demo]").forEach((demo) => {
    const buttons = [...demo.querySelectorAll("[data-trust-mode]")];
    const status = demo.querySelector("[data-trust-status]");
    const messages = {
      mixed: "Without an enforced boundary, instruction-like text can compete with the actual user task.",
      separated: "With provenance and policy checks, untrusted text remains data and cannot silently acquire authority."
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.trustMode;
        demo.dataset.mode = mode;
        setPressed(buttons, button);
        if (status) status.textContent = messages[mode];
        const reading = demo.querySelector("[data-authority-reading]");
        if (reading) reading.textContent = mode === "separated" ? "The application rejects authority claimed by document text. Content remains readable data." : "Can influence a proposed action when authority is conflated with content.";
      });
    });
  });

  document.querySelectorAll("[data-horizon-demo]").forEach((demo) => {
    const buttons = [...demo.querySelectorAll("[data-horizon-step]")];
    const context = [...demo.querySelectorAll("[data-horizon-context]")];
    const controls = demo.querySelector("[data-horizon-controls]");
    const fields = ["phase", "question", "description", "carried", "check"];
    const stages = [
      {
        phase: "01 · Grounding",
        question: "What legitimate task is being established?",
        description: "The exchange opens with an educational overview. That framing supplies context; it is not a permanent guarantee that every later request will be benign.",
        carried: "The educational setting only. Later framing has not entered the conversation.",
        check: "Identify the useful task and the relevant boundary. Do not infer harmful intent from an ordinary educational question alone."
      },
      {
        phase: "02 · Boundary reasoning",
        question: "What changes when the discussion moves to edge cases?",
        description: "The conversation now asks about safety concerns and difficult boundaries. Read this turn with the original purpose still in view.",
        carried: "The educational setting and the discussion of safety boundaries.",
        check: "Separate a legitimate explanation of a boundary from assistance that crosses it. Mentioning safety is not itself a safety judgment."
      },
      {
        phase: "03 · Hypothetical reframing",
        question: "Has the framing changed—or the substance?",
        description: "Academic or hypothetical language can change how a request sounds. The reviewer still needs to assess what information the answer supplies.",
        carried: "The educational setting, boundary discussion, and hypothetical framing.",
        check: "Inspect the answer's substance rather than treating a disclaimer as permission or proof of a violation."
      },
      {
        phase: "04 · Synthesis",
        question: "What does the combined answer make possible?",
        description: "The conversation asks for a conceptual summary. Review the substance of that answer alongside the earlier exchange, not only its disclaimers.",
        carried: "The educational setting, boundary discussion, hypothetical framing, and synthesis request.",
        check: "Distinguish legitimate explanation from capability-relevant disclosure. A qualifier alone proves neither safety nor failure."
      }
    ];
    if (buttons.length !== stages.length || !controls) return;
    const select = (button) => {
      const step = Number(button.dataset.horizonStep);
      const stage = stages[step - 1];
      setPressed(buttons, button);
      fields.forEach(field => { demo.querySelector(`[data-horizon-${field}]`).textContent = stage[field]; });
      context.forEach(item => {
        const available = Number(item.dataset.horizonContext) <= step;
        item.classList.toggle("is-pending", !available);
        item.setAttribute("aria-label", item.querySelector("strong").textContent + (available ? ": in context" : ": not yet in context"));
      });
    };
    buttons.forEach(button => { button.addEventListener("click", () => select(button)); });
    select(buttons.find(button => button.getAttribute("aria-pressed") === "true") || buttons[0]);
    controls.hidden = false;
  });

  document.querySelectorAll("[data-superposition-demo]").forEach((demo) => {
    const slider = demo.querySelector("input[type='range']");
    const plane = demo.querySelector("[data-feature-plane]");
    const countLabel = demo.querySelector("[data-feature-count]");
    const interpretation = demo.querySelector("[data-feature-interpretation]");
    const probe = demo.querySelector("#feature-probe");
    const projection = demo.querySelector("[data-feature-projection]");
    if (!slider || !plane) return;

    const render = () => {
      const count = Number(slider.value);
      if (probe) { probe.max = String(count); probe.value = String(Math.min(count, Number(probe.value))); }
      const selected = probe ? Number(probe.value) : 1;
      // Preserve spatial identity and avoid rebuilding every line on probe input.
      while (plane.children.length > count) plane.lastElementChild.remove();
      while (plane.children.length < count) {
        const line = document.createElement("span");
        line.className = "feature-vector";
        line.setAttribute("aria-hidden", "true");
        plane.appendChild(line);
      }
      for (let index = 0; index < count; index += 1) {
        const line = plane.children[index];
        line.classList.toggle("is-selected", index === selected - 1);
        line.style.setProperty("--angle", `${-index * (180 / count)}deg`);
        line.style.setProperty("--length", "40%");
        line.setAttribute("aria-hidden", "true");
      }
      if (countLabel) countLabel.textContent = `${count} represented features`;
      if (probe) {
        demo.querySelector("[data-probe-label]").textContent = String(selected);
        const angle = (selected - 1) * Math.PI / count;
        const rounded = value => (Math.abs(value) < 0.0005 ? 0 : value).toFixed(3);
        if (projection) projection.textContent = `Direction ${selected} = (${rounded(Math.cos(angle))}, ${rounded(Math.sin(angle))}). Projection onto the horizontal direction = ${rounded(Math.cos(angle))}.`;
        probe.setAttribute("aria-valuetext", `Direction ${selected} of ${count}`);
      }
      if (interpretation) {
        interpretation.textContent = count === 2
          ? "Two features can occupy orthogonal directions in this two-dimensional sketch."
          : "More than two feature directions cannot all be orthogonal in two dimensions. This sketch shows geometric overlap, not learned model activations.";
      }
    };
    slider.addEventListener("input", render);
    probe?.addEventListener("input", render);
    render();
  });
  document.querySelectorAll("[data-sparsity-demo]").forEach(demo => {
    const input = demo.querySelector("input");
    const cells = [...demo.querySelectorAll("[data-sparse-cell]")];
    const update = () => {
      const active = Number(input.value);
      cells.forEach((cell, index) => {
        cell.classList.toggle("is-active", index < active);
        cell.textContent = index < active ? "1" : "0";
      });
      demo.querySelector("[data-sparse-summary]").textContent = `${active} of ${cells.length} entries are nonzero; ${cells.length - active} remain zero.`;
      input.setAttribute("aria-valuetext", `${active} nonzero entries out of ${cells.length}`);
    };
    input.addEventListener("input", update);
    update();
  });
  document.querySelectorAll("[data-enhance-controls]").forEach(control => { control.hidden = false; });

  // Keep wide research comparisons keyboard-scrollable only when needed.
  const comparisons = [...document.querySelectorAll("[data-reading-comparison]")];
  comparisons.forEach(region => {
    const hint = document.createElement("p");
    hint.className = "research-scroll-hint";
    hint.textContent = "Scroll sideways to compare all columns.";
    hint.hidden = true;
    region.insertAdjacentElement("afterend", hint);
    const update = () => {
      const scrollable = region.scrollWidth > region.clientWidth + 1;
      region.tabIndex = scrollable ? 0 : -1;
      hint.hidden = !scrollable;
    };
    update();
    if (typeof ResizeObserver === "function") new ResizeObserver(update).observe(region);
  });
})();
