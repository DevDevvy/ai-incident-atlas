# Verified issue → dataset PR automation

The Atlas can promote a verified **new incident** issue into a pull request automatically.

## Trust boundary

A public contributor can submit data, but cannot change the dataset.

```text
structured issue
    ↓
needs-verification
    ↓
maintainer independently checks sources and wording
    ↓
maintainer applies `verified`
    ↓
GitHub Actions parses the issue as data
    ↓
validated `data/incidents.json` change
    ↓
automatic pull request
    ↓
maintainer reviews + merges
    ↓
GitHub Pages deploys
```

The workflow only runs when all of these are true:

- the issue receives the `verified` label
- the issue already has `data-submission`
- the issue does not already have `pr-created`

Correction issues use the separate `correction` label and are **not** automatically promoted by this workflow.

## One-time GitHub setting

GitHub may block `GITHUB_TOKEN` from opening pull requests until this repository setting is enabled:

**Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**

The workflow already declares least-privilege job permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
```

The setting above only allows that token to create the PR. A human still has to merge it.

## What the parser generates

The issue form maps directly into the canonical record:

| Issue field | Dataset field |
| --- | --- |
| Event date | `date` |
| Display date / range | `dateLabel` |
| Proposed factual title | `title` + generated `id` |
| Organization / model / person | `org` |
| Primary category | `category` |
| Evidence type | `evidence` |
| Suggested editorial impact | `impact` |
| Confidence | `confidence` |
| What happened? | `summary` |
| Why does it matter? | `why` |
| Caveat | `caveat` |
| Suggested tags | `tags` |
| Sources | `sources` |
| Suggested Atlas themes | `themes` |

If Display date is blank, it is generated from the ISO event date.

Source kind is inferred from the source line/domain as one of:

- `Primary / official`
- `Paper`
- `Reporting`
- `Reference`

## Security design

Contributor-controlled issue text is never interpolated into a shell command.

The promotion parser reads the GitHub event payload from `GITHUB_EVENT_PATH`, treats form responses strictly as data, generates a JSON object, and then runs the existing Atlas validator.

Branch names, commit messages, and shell arguments use only trusted GitHub-generated numeric values such as the issue number and workflow run ID.

The generated PR is not merged automatically.

## Duplicate and validation protection

Automatic promotion fails before a PR is created if, among other things:

- the generated stable ID already exists
- an existing incident has the same title
- the date is invalid
- required form fields are missing
- evidence/category/confidence are not recognized
- impact is invalid
- tags are missing
- a theme is not in `data/site.json`
- a source line does not contain an HTTPS URL
- the resulting Atlas dataset fails `npm run validate`

When promotion fails, the workflow adds `promotion-failed` and comments on the issue with a link to the failed Actions run.

## Successful promotion

After the PR is created, the workflow:

1. removes `needs-verification`
2. adds `pr-created`
3. comments on the source issue with the PR URL
4. creates the PR with `Closes #ISSUE_NUMBER`

Merging that PR therefore closes the source issue automatically.

## Retrying a failed promotion

1. Correct the issue content or repository code.
2. Remove `promotion-failed` if desired.
3. Remove `verified` from the issue.
4. Re-apply `verified`.

Re-applying the label creates a fresh workflow event.
