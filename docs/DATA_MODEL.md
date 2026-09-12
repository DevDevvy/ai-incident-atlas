# Data model

The canonical dataset is `data/incidents.json`. A machine-readable JSON Schema lives at `data/incidents.schema.json`.

## Required fields

| Field | Purpose |
| --- | --- |
| `id` | Stable lowercase kebab-case identifier |
| `date` | ISO event date (`YYYY-MM-DD`) used for sorting |
| `dateLabel` | Human-readable date/range |
| `title` | Concise factual headline |
| `org` | Main organizations/models/people |
| `category` | Primary editorial category |
| `evidence` | REAL / EVAL / EVAL → REAL / GOV / LEGAL / MISUSE / POLICY / CONTESTED |
| `impact` | Editorial historical impact, 1–5 |
| `confidence` | Confidence in core factual claim |
| `summary` | What happened |
| `why` | Why it matters to the AI timeline |
| `caveat` | What the evidence does not prove |
| `tags` | Specific concepts/entities/mechanisms |
| `themes` | Cross-year Atlas research lanes |
| `sources` | Source objects |

## Source object

```json
{
  "label": "OpenAI technical report",
  "url": "https://example.com/report",
  "kind": "Primary / official"
}
```

Allowed source kinds are configured in `data/site.json`.

## Updating vocabulary

Categories, themes, evidence order, confidence order, and source kinds are controlled by `data/site.json`. The validator rejects incident values outside that vocabulary.
