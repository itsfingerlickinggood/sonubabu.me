# sonubabu.me

Static portfolio built with HTML, modular CSS, and vanilla JavaScript.

## Start locally

```bash
npm ci
npm run dev
```

The preview server requests port `3000`. If that port is already in use, `serve` prints the alternate local URL it selected.

## Build and validate

```bash
npm run build
npm run check
npm run test:maze
npm run test:motion
npm run test:build
```

- `npm run build` creates page-family CSS bundles, minifies only live JavaScript, versions runtime URLs, and generates an allowlisted `dist/` deployment. Build tools are pinned in `package-lock.json`; there are no third-party browser runtime dependencies.
- `npm run check` validates page metadata, internal links, duplicate IDs, visualization names, illustration assets/provenance, and common text-encoding corruption.
- `npm run test:maze` tests the Learnings arcade environment, Q-learning updates, reproducibility, and actual policy improvement across four seeds. Open `/learnings.html` locally; choose **Train +500 → Watch → Run** to see a learned route, or **You play** for keyboard/touch controls.

Use `npm run preview` to inspect the production output at `http://localhost:3001`. Vercel publishes `dist/`, not this repository root.

## Browser regression checks

The tests use a dedicated local Chrome profile, never your personal browser session. With Node.js 22 or newer, create a temporary directory with `mktemp -d`, then launch Chrome with `--headless=new --remote-debugging-port=0 --user-data-dir=<temporary-directory>/profile`. Keep the production preview running.

Set `QA_CHROME_PROFILE` to that profile directory and `QA_OUTPUT` to a separate screenshot/report directory, then run `npm run test:browser`. Optional `QA_URL` overrides the default `http://127.0.0.1:3001`.

The suites cover all 24 pages, five widths, both palettes, shared navigation geometry, 200% text, keyboard use, no-JavaScript fallbacks, image failure, the maze, and research interactions. They save JSON results and screenshots locally; neither is deployed.

## Artwork and archived work

Responsive WebP exports and the original Gotham/OpenX screenshots are included. Editable PNG masters, superseded artwork, historical audits, internal claim-review notes, and local agent tooling are excluded from Git and deployment; existing local copies are preserved. Artwork prompts, source credits and master-image digests remain in [docs/work-artwork.json](docs/work-artwork.json) and the other current artwork manifests.

See [the release evaluation](docs/release-audit.md) for the design decisions, measured budgets, testing scope and limitations.

The transparent Earth favicon is documented in [the identity artwork record](docs/favicon-artwork.json), including its generation prompt and the one-word tab titles. Home keeps the text brand; every other page uses the same Earth as an accessible Home link, with a softer CSS colour treatment in dark mode and a shared, stable header slot. Light is the default regardless of the device colour scheme; a visitor's explicit saved dark-mode choice is respected. Missing, invalid or blocked storage falls back to light. Public HTML and structured metadata must not contain email contact details; `npm run check` guards against reintroducing them. `npm run build` packages the checked-in PNG exports into `favicon.ico`; it does not require the original painting. Run `npm run test:identity` with the same dedicated Chrome environment to verify titles, icon loading, transparency, theme selection, keyboard navigation and Home/inner-page branding. Finish the build before running browser tests: rebuilding replaces the preview directory.
