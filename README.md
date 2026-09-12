# AI Incident Atlas

**AI Incident Atlas** is a static, source-driven research tool documenting major AI incidents, safety evaluations, controversies, resignations, governance failures, misuse cases, legal disputes, and real-world agent boundary crossings.

The initial dataset covers **73 events** from November 2022 through September 12, 2026, backed by **95 source links**.

## Why this architecture

`data/incidents.json` is the **single canonical source of incident data**.

The browser loads that file directly. There is no duplicate copy embedded inside HTML, no database, no CMS, and no framework build artifact that must be manually synchronized.

For community-submitted new incidents, the preferred workflow is now:

```text
Structured GitHub issue
        ↓
needs-verification
        ↓
Maintainer verifies sources + wording
        ↓
Maintainer applies `verified`
        ↓
GitHub Actions converts the issue into JSON
        ↓
Validation + automatic pull request
        ↓
Maintainer reviews and merges
        ↓
GitHub Pages deploys automatically
```

Technical contributors can still edit `data/incidents.json` directly in a normal pull request.

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
│   ├── lib/
│   │   └── issue-promotion.mjs   # Pure issue-form parsing/normalization logic
│   ├── promote-verified-issue.mjs# Converts verified issue event → dataset change
│   ├── test-issue-promotion.mjs  # Promotion parser regression tests
│   ├── validate-data.mjs         # Zero-dependency data validator
│   ├── audit-data.mjs            # Research-maintenance report
│   ├── build.mjs                 # Creates deployable dist/
│   ├── serve.mjs                 # Local development server
│   ├── add-incident.mjs          # Inserts + sorts a prepared record
│   ├── first-push.sh             # Optional initial Git helper
│   └── enable-pages.sh           # Optional Pages API helper
├── .github/
│   ├── ISSUE_TEMPLATE/           # Structured data/correction forms
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── pages.yml
│   │   ├── promote-verified-issue.yml
│   │   └── sync-labels.yml
│   ├── labels.json
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── DEPLOYMENT.md
│   ├── EDITORIAL_POLICY.md
│   ├── ISSUE_AUTOMATION.md
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
npm run check
```

The project checks include:

- incident-data validation
- stable unique IDs
- valid ISO dates
- chronological ordering
- allowed evidence/category/theme values
- impact range
- source structure and HTTPS URLs
- stage/tour references
- browser JavaScript syntax
- verified-issue promotion parser tests
- production build

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

New incident submissions begin as `data-submission` + `needs-verification`.

After independent research review, a maintainer can apply `verified`. The `Promote verified incident` workflow then parses the structured issue, generates the canonical record, validates it, creates a branch, and opens a pull request. Nothing is merged automatically.

### One-time automation setting

For automatic pull-request creation, enable:

**Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**

See [`docs/ISSUE_AUTOMATION.md`](docs/ISSUE_AUTOMATION.md) and [`docs/MAINTAINER_TRIAGE.md`](docs/MAINTAINER_TRIAGE.md).

## Licensing

- Application code: MIT
- Original Atlas dataset/editorial text/documentation: CC BY 4.0
- Linked third-party source material remains subject to its original owners' terms

See [`LICENSE.md`](LICENSE.md).

## Maintainer convenience

To insert a fully prepared record manually and keep chronology sorted:

```bash
npm run add:incident -- /path/to/record.json
```

The helper refuses duplicate IDs, writes the canonical dataset, sorts it, and immediately runs validation.
