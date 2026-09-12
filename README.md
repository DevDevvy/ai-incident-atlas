# AI Incident Atlas

**AI Incident Atlas** is a static, source-driven research tool documenting major AI incidents, safety evaluations, controversies, resignations, governance failures, misuse cases, legal disputes, and real-world agent boundary crossings.

The initial dataset covers **73 events** from November 2022 through September 12, 2026, backed by **95 source links**.

## Why this architecture

`data/incidents.json` is the **single canonical source of incident data**.

The browser loads that file directly. There is no duplicate copy embedded inside HTML, no database, no CMS, and no framework build artifact that must be manually synchronized.

A normal data update is therefore:

```text
Edit data/incidents.json
        ↓
Open pull request
        ↓
GitHub Actions validates schema + chronology + IDs + sources
        ↓
Maintainer verifies the research
        ↓
Merge to main
        ↓
GitHub Pages deploys automatically
```

## Project structure

```text
.
├── index.html                    # Application shell
├── assets/
│   ├── app.js                    # Interactive Atlas application
│   ├── styles.css                # Responsive UI
│   └── favicon.svg
├── data/
│   ├── incidents.json            # CANONICAL INCIDENT DATA
│   ├── incidents.schema.json     # JSON Schema for contributors/tools
│   ├── site.json                 # Site vocabulary/configuration
│   ├── stages.json               # Five-stage historical narrative
│   └── tour.json                 # Guided-tour event IDs
├── scripts/
│   ├── validate-data.mjs         # Zero-dependency data validator
│   ├── audit-data.mjs            # Research-maintenance report
│   ├── build.mjs                 # Creates deployable dist/
│   ├── serve.mjs                 # Local development server
│   ├── add-incident.mjs          # Inserts + sorts a prepared record
│   ├── first-push.sh             # Optional initial Git helper
│   └── enable-pages.sh           # Optional Pages API helper
├── .github/
│   ├── ISSUE_TEMPLATE/           # Structured data/correction forms
│   ├── workflows/                # CI, Pages deployment, label sync
│   ├── labels.json
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── DEPLOYMENT.md
│   ├── EDITORIAL_POLICY.md
│   ├── MAINTAINER_TRIAGE.md
│   └── METHODOLOGY.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE.md
└── package.json                  # Scripts only; no npm dependencies
```

## First launch

If you only want to get the project online, start with [`QUICKSTART.md`](QUICKSTART.md).

## Local development

Requires Node.js 20+; the GitHub workflows use Node 24.

There are **no npm packages to install**.

```bash
npm run validate
npm run dev
```

Open:

`http://127.0.0.1:8080`

Do not open `index.html` directly with `file://`; browsers block the JSON fetch in that mode.

### Production preview

```bash
npm run preview
```

This validates the data, builds `dist/`, and serves the exact deployable output.

## Validation

```bash
npm run validate
```

The validator checks, among other things:

- required fields
- stable unique IDs
- valid ISO dates
- chronological ordering
- allowed evidence/category/theme values
- impact range
- source structure
- HTTPS source URLs
- stage/tour references

A pull request cannot pass CI if these checks fail.

## Research audit

```bash
npm run audit
```

This reports dataset size, source coverage, non-high-confidence entries, contested entries, EVAL → REAL incidents, and records without a primary source or research paper.

## GitHub Pages deployment

The repository includes `.github/workflows/pages.yml`. Every merge/push to `main` validates, builds `dist/`, and deploys the static site.

After the first push, enable **Settings → Pages → Source: GitHub Actions** once. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). If you already use the GitHub CLI, `bash scripts/enable-pages.sh` can perform that one-time Pages configuration through GitHub's API.

## Community submissions

Use **Issues → New issue** for structured forms:

- Submit a new AI incident
- Correct/update an existing incident
- Report a site bug

Data submissions are automatically labeled `needs-verification` after the label-sync workflow has created the repository labels.

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licensing

- Application code: MIT
- Original Atlas dataset/editorial text/documentation: CC BY 4.0
- Linked third-party source material remains subject to its original owners' terms

See [`LICENSE.md`](LICENSE.md).

## Maintainer convenience

To insert a fully prepared record and keep chronology sorted:

```bash
npm run add:incident -- /path/to/record.json
```

The helper refuses duplicate IDs, writes the canonical dataset, sorts it, and immediately runs validation.
