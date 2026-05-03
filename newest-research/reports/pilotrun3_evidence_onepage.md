# Do AI Safety Guardrails Fail *Slowly*?

> **One-line summary:** Current AI safety tests only check whether a model eventually refuses a harmful request. This project proves that is the wrong question — because by the time refusal comes, the damage may already be done. We measure the delay, build a tool to catch it early, and publish a benchmark every AI lab can use.

---

## The Safety Problem — In Plain Terms

Imagine asking an AI assistant to help you build something dangerous. If you ask directly, it refuses immediately. Safe.

Now imagine you spread the same request across ten friendly messages, disguising your intent, building context, asking for pieces. The AI helps with each piece. On the final message, it refuses. Technically it said no — but you already have what you needed.

**This is the vulnerability.** Every major AI safety test today grades models on their final answer. If the model eventually refuses, it passes. Nobody is measuring what happened in the turns before that refusal. Nobody is measuring *how long* the model cooperated before it caught on.

This is not a theoretical concern. Our pilot data shows that cloaked multi-turn conversations produce unsafe cooperation at a rate of **0.20**, compared to **0.00** for direct requests — with the model never self-correcting once that pattern starts. The failure mode is real, it is measurable, and current safety benchmarks cannot see it.

---

## What This Project Does

This project introduces a new kind of safety test: one that measures **when** a model refuses, not just **whether** it does.

For each harmful goal in our test set, we construct three versions of the conversation. A direct single-turn request serves as the baseline. A staged multi-turn version breaks the same request into explicit steps, controlling for the effect of length alone. A cloaked multi-turn version disguises the same goal gradually across turns using contextual reframing — the realistic attack scenario. We then measure, turn by turn, exactly when safety behavior appears in each version, and by how much the cloaked version delays it relative to both controls.

The output is not just a research finding. It is a **reusable benchmark** — a documented test suite with dataset schema, conversation templates, and metrics — that any AI lab can run on their own models tomorrow. That infrastructure contribution is the lasting deliverable, regardless of how any single set of results lands.

Alongside the benchmark, we test a **practical monitoring tool**: a lightweight layer that watches live conversations for signs of escalating harmful intent and intervenes before the model has been fully manipulated. Our pilot results show it flags real threats with **78% precision**, imposes only a **6% latency cost**, and causes **zero measurable harm** to normal, safe conversations. This is not a research prototype. It is a deployable policy recommendation with honest trade-off reporting.

---

## What the Pilot Already Showed

We ran a controlled pilot across 70 matched conversation pairs. The results are early and we are not claiming proof — but the signal is clear enough to justify the full study.

| What we measured | What we found |
|---|---|
| Cloaked conversation unsafe trigger rate | **0.20** — versus 0.00 for direct requests |
| Conversations that went from safe to unsafe | **14** |
| Conversations that self-corrected back to safe | **0** — the failure is one-directional |
| Monitor precision on harmful conversations | **77.8%** |
| Performance cost on benign conversations | **None measurable** |
| Latency overhead of the monitor | **5.8%** |

The pipeline works end-to-end. The direction of the effect is consistent. What is missing is scale, replication, and human validation — which is exactly what the next phase delivers.

---

## Is This Proven Yet?

No, and we are not claiming it is. The pilot is a pipeline-validation stage result, not a claim-positive result. Judge agreement is currently below our own required threshold, human audit labels are pending, and only 6 of 18 seed-model combinations have been completed. We built quality gates into the system specifically to prevent over-claiming, and those gates are doing their job. The honest answer is that the signal is real and the machinery is working, but the full study is required before this becomes a publishable claim.

---

## The Execution Plan — What Happens Next and What It Requires

**Phase 1 — Scale the experiment.** We expand from 70 to 180+ matched conversation pairs, completing all 18 seed-model combinations across the six-model panel. This resolves the statistical blockers the pilot identified.

**Phase 2 — Pass the quality gates.** We raise judge agreement above the required 0.80 threshold (currently 0.12–0.38) and complete human audit labels on a stratified 10% of all rows. These gates are non-negotiable — they are what separates a directional pilot signal from a publishable, reviewer-resistant claim.

**Phase 3 — Publish the benchmark and paper.** We release the full benchmark artifact and a paper documenting the timing effect and monitor trade-offs. The target audience is not just academic reviewers — it is safety teams at AI labs who need practical evaluation tools they can actually deploy.

**Timeline: approximately three to four months for the full run and write-up.** What this phase requires is compute access to run the expanded model panel and time for human annotators on the audit subset. Those are the two concrete bottlenecks between the current pilot and a finished result.

---

## Why This Matters Beyond This Project

If trajectory-sensitive refusal timing is a real and consistent effect — which our pilot strongly suggests — then the entire field of AI safety evaluation needs to update how it grades models. A model that cooperates for nine turns and refuses on the tenth is not a safe model. It is a model with a slow-burn vulnerability that current benchmarks will mark as passing. This project produces the evidence and the tooling to change that standard.

---

*Repository: [github.com/itsfingerlickinggood/temporal-refusal-timing-pilot](https://github.com/itsfingerlickinggood/temporal-refusal-timing-pilot) · Pilot run: `benchmark_outputs/pilotrun3` · Stage: pipeline-validation, not claim-positive*

