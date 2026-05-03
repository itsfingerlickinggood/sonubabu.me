# Temporal Refusal Timing Pilot

A reproducible pilot framework for evaluating trajectory-sensitive refusal timing in large language models under a constrained API access regime.

## Project Goal

This project evaluates whether refusal timing changes when the same harmful objective is delivered through different trajectory constructions (for example: direct, staged direct, and cloaked multi-turn variants), and packages results into reproducible benchmark artifacts.

## Repository Layout

- `temporal_alignment_hysteresis_experiment.ipynb` - Main end-to-end experiment notebook.
- `temporal_alignment_research_plan.txt` - Research plan, evidence ladder, and claim policy.
- `temporal_alignment_prompt_set.csv` - Prompt source used by the notebook.
- `datasets/` - Core dataset files and provenance artifacts.
- `ideas-rp/` - Local source references used for protocol grounding.
- `_support_docs_optional/` - Optional project documentation.
- `benchmark_outputs/` - Generated run artifacts (ignored by default in git).

## Quick Start

1. Create and activate a virtual environment.
2. Install notebook dependencies.
3. Open and run the notebook.

Example setup:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U pip
pip install jupyter pandas numpy matplotlib tqdm requests
jupyter notebook
```

Then open `temporal_alignment_hysteresis_experiment.ipynb` and run cells in order.

## Reproducibility Notes

- This repository tracks code and configuration.
- Large generated artifacts in `benchmark_outputs/` are excluded from version control by default.
- If you need to preserve a specific run, export a compressed run folder separately or adjust `.gitignore`.

## Safety and Scope

This project is for safety evaluation research. Claims are bounded to the configured model access regime and run gates documented in the research plan.
