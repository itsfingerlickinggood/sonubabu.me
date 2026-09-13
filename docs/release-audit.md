# Website release evaluation

13 September 2026. Scope: all 23 public pages, with implementation focused on the shared layout, the Learnings collections, and delivery weight.

## Design judgment

The personal site benefits from an editorial reading column, not dashboard furniture. Music artwork deserves space; book titles must stay readable despite different cover proportions. A ten-item collection does not need a carousel, invented playback, or a new animation dependency.

This applies the `emil-design-eng` and `apple-design` skills: predictable placement, system typography, meaningful grouping, immediate keyboard response, and restrained motion. The choice to leave the shelves still also follows Emil's distinction between useful feedback and unnecessary animation. [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations)

| Before | After | Why |
| --- | --- | --- |
| Home navigation began at 63px; other index pages at 96px in the 1280×900 baseline | One shared shell, navigation spacing, available-width breakpoint and scrollbar gutter | Switching pages preserves the position of every navigation control |
| Different Home title size and mobile illustration preceding the heading | The Home heading aligns with the five other main-page headings; mobile artwork follows the introduction | Stable hierarchy and reading order |
| Tiny album thumbnails beside cramped copy | Three cover-led columns on desktop, two on narrow screens | Artwork is recognizable without sacrificing complete titles |
| Five mixed-height book cards in one grid | Three references with aligned caption baselines; two fiction entries in a separate group; compact rows on phones | Clear relationships and readable titles without cropping originals |
| Email link on Home and redundant Blog follow-up | Removed | Less competing navigation; the About contact address is retained |
| A large canvas library containing unused renderers | Only the live Home dot field and 404 grid | Smaller download and parse cost |
| One large stylesheet on every page | Seven page-family bundles, retaining shared logical-selector rules | Lower first-page cost while preserving the cascade |
| Repository root configured as deployment output | Explicit public-file allowlist in `dist/` | No source masters, QA screenshots, internal notes or research working files in the deployed site |

All ten music/book selections are preserved. The original Gotham and OpenX screenshots are unchanged. Research evidence qualifications and illustrative-versus-measured distinctions are retained.

## Measured delivery budgets

These are file bytes, not a claim about live-network speed or a Lighthouse score.

| Resource | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Home CSS | 127,005 B | 31,438 B | 75.2% |
| Canvas JavaScript | 46,795 B | 5,372 B | 88.5% |
| Main JavaScript | 4,511 B | 3,826 B | 15.2% |
| Home CSS + JavaScript | 178,311 B | 40,636 B | 77.2% |

Home CSS + JavaScript gzip to 10,405 B in a local compression check. The complete generated public directory is 13,031,286 B, including 11,898,992 B of assets. The local asset source tree is 156,049,138 B; editable masters and superseded variants are not part of the deployment. Full-resolution paintings are available on request rather than downloaded by each thumbnail.

Runtime URLs are content-versioned, including the maze module's engine import. Existing cache headers can therefore reuse unchanged files without serving old CSS after an HTML update. The build uses pinned tools and a lockfile; no remote lookup is needed during a build after dependencies are installed.

### Optimizer regression found and fixed

A reduced test case showed PurgeCSS 8 discarding a nested `:is()` rule when an alternative was absent. This changed research typography and prevented chart controls from wrapping at 200% text size. The build now preserves complete logical-selector rules using ignore ranges. The larger final CSS budget above includes that protection. The configuration and safelisting mechanism follow the [official PurgeCSS configuration documentation](https://purgecss.com/configuration).

## Verification

- **1,736/1,736 whole-site browser checks passed** against the production output on localhost:3001: 23 pages, widths 1280/768/540/390/320, both themes, identical navigation-control rectangles, main-page title alignment, loaded images, system fonts, local anchors, and script/resource failures.
- Every page reflowed at 200% root text size in a 390px viewport without document-level horizontal overflow. Wide research tables keep their own scroll area.
- Home fit without vertical scrolling at 1280×720, 1366×768, 375×812 and 390×844. Smaller screens and enlarged text may scroll naturally; content is not clipped to force a fit.
- Keyboard theme switching, theme persistence, blocked storage, native disclosures, image-error fallback, 500-episode training, blog choices, project filtering and no-JavaScript main-page fallbacks passed.
- **335/335 research/browser regressions passed**, including the five research articles, diagram controls, source qualifications, native contents, full-image dialogs, focus restoration, theme-specific pictures, reduced motion, no-JavaScript reading, original project image proportions, and responsive layouts.
- **19 maze tests** and **11 motion-clock assertions** passed. **23 HTML pages** passed static validation. The production check resolved **648 local references**, verified version hashes, checked source exclusions and enforced byte budgets.
- Pinned dependency installation reported **zero known vulnerabilities** at the time of the check. This is not a security certification.
- A clean export of the staged Git snapshot passed an offline `npm ci`, build, static validation, production-file checks, maze tests and motion tests. It does not require ignored PNG masters, private notes or prior QA files. A staged-file scan found no credential patterns in the 83 changed text files it inspected.
- Visual inspection covered the main-page layouts, both shelf layouts and palettes, and representative research diagrams and artwork views. No permanent overlays, new divider systems, or decorative shelf motion were introduced.

The browser checks use a separate headless Chrome profile. This is an independent post-implementation test pass, not a second person's review or user study. Physical iPhone/Safari and Firefox testing, assistive-technology testing, production Core Web Vitals, CDN cache behavior and post-deployment availability were not verified here. Source experiments were not rerun as part of this frontend release.

## Recovery and maintenance

Editable image masters, earlier audits, plans, and internal claim-review notes remain local and ignored by Git. Current public artwork manifests retain source credits and master-image SHA-256 digests. Unused renderer files, the superseded build scripts, old combined stylesheet and empty `npx` artifact are recoverable in the ignored `.local-archive/2026-09-13/` folder. No research working files or original Gotham/OpenX images were deleted.

`npm run test:browser` reproduces the browser suites with a dedicated Chrome profile; see the README. Reports and screenshots stay local and are not deployed. Run `npm run build`, `npm run check`, `npm run test:maze`, `npm run test:motion`, and `npm run test:build` before a release.
