# Incident correction workflow

The Atlas supports a full correction/update path without asking contributors to manually copy an existing JSON record.

## Contributor flow

There are two entry points:

1. Open an incident detail modal and choose **Suggest an update**.
2. Choose **Find an incident to update** in the community contribution section.

The site loads the canonical record from `data/incidents.json`, pre-fills an editor, and lets the contributor change only the fields that need correction.

The editor compares the edited record with the current record and creates a patch containing only changed fields. It then opens the GitHub `update_incident.yml` form with the incident title, stable ID, changed-field summary, patch JSON, and verification sources pre-filled.

The contributor still reviews the GitHub form and submits it explicitly.

## Maintainer flow

```text
correction issue
    ↓
needs-verification
    ↓
maintainer checks sources + proposed changes
    ↓
maintainer applies verified
    ↓
GitHub Actions applies the machine-readable patch
    ↓
npm run check
    ↓
automated data-only pull request
    ↓
human review + merge
    ↓
published label + issue closed
    ↓
GitHub Pages rebuild
```

## Trust boundary

A public contributor cannot directly modify the canonical dataset.

Automatic patch promotion requires all of the following:

- issue has `correction`
- maintainer has applied `verified`
- issue does not already have `pr-created`
- issue does not already have `published`
- patch `incidentId` matches the stable ID in the form
- every changed key is in the automatic-update field whitelist
- the resulting complete dataset passes `npm run check`

The stable incident `id` cannot be changed through an update issue.

## Automatically patchable fields

- `date`
- `dateLabel`
- `title`
- `org`
- `category`
- `evidence`
- `impact`
- `confidence`
- `summary`
- `why`
- `caveat`
- `tags`
- `sources`
- `themes`

Removal of an entire incident remains a manual maintainer decision rather than an automatic patch operation.

## Large corrections

GitHub supports pre-filling Issue Form fields through URL query parameters, but URLs have finite size limits. The editor refuses to generate an excessively large URL. Very large rewrites should be split into focused correction issues or submitted manually through the update form.
