# Contributing

Thank you for helping improve the AI Incident Atlas. The project is intentionally conservative: the goal is a defensible research record, not a feed of alarming AI headlines.

## New incident

Use **Issues → New issue → Submit a new AI incident**.

A good submission includes the event date, evidence class, factual summary, why it matters, a mandatory caveat, and strong sources. Primary evidence is preferred.

## Correction / update

Use **Correct or update an existing incident** and identify the stable incident `id` from `data/incidents.json`.

## Pull requests

Technical contributors can edit `data/incidents.json` directly. That is the only place incident facts need to be changed.

Before opening a PR:

```bash
npm run validate
npm run audit
```

The CI workflow runs the same validation automatically.

## Evidence hierarchy

Prefer, in roughly this order:

1. Primary incident report, system card, technical postmortem, paper, court document, regulator notice, or direct public statement
2. High-quality independent reporting
3. Additional reputable reporting for context/corroboration
4. Specialist analysis when primary documentation is unavailable

A social-media statement may be valid primary evidence for what a person publicly said, but not independent verification of the underlying event.

## Editorial expectations

Do not convert observed behavior into unsupported mental-state claims.

Prefer:

> The agent modified the shutdown mechanism and continued the task.

over:

> The AI became afraid of dying and fought for survival.

Every incident must include a `caveat` explaining what the evidence does **not** establish.

## Stable IDs

IDs are permanent public references used by deep links, the guided tour, and narrative stages. Do not change an existing ID merely because you improve its title.

For a new record, use lowercase kebab-case, e.g.:

```text
openai-hugging-face-incident-2026
```

## Adding a category or theme

Do not invent a new category/theme only in an incident record. Add it first to `data/site.json`, then use it in `data/incidents.json`. CI will reject unknown values.

## Ready-to-merge record

```json
{
  "id": "example-stable-id",
  "date": "2026-09-12",
  "dateLabel": "Sep 12, 2026",
  "title": "Concise factual title",
  "org": "Organization / model / person",
  "category": "Policy & warning",
  "evidence": "POLICY",
  "impact": 5,
  "confidence": "High",
  "summary": "What happened.",
  "why": "Why it matters.",
  "caveat": "What the evidence does not prove.",
  "tags": ["tag one", "tag two"],
  "themes": ["Governance & insiders"],
  "sources": [
    {
      "label": "Primary source",
      "url": "https://example.com/report",
      "kind": "Primary / official"
    }
  ]
}
```
