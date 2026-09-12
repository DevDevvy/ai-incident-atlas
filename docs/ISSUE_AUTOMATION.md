# Verified issue → dataset PR automation

The Atlas can promote a verified **new incident** issue into a pull request automatically and finalize the source issue after a human merge.

## End-to-end flow

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
full `npm run check`
    ↓
stable insert into `data/incidents.json`
    ↓
automatic data-only pull request
    ↓
maintainer reviews + merges
    ↓
source issue → `published` + closed
    ↓
GitHub Pages deploys
```

The promotion workflow only runs when all of these are true:

- the issue receives the `verified` label
- the issue already has `data-submission`
- the issue does not already have `pr-created`
- the issue does not already have `published`

Correction issues use the separate `correction` label and are **not** automatically promoted by this workflow.

## Trust boundary

A public contributor can submit data, but cannot change the canonical dataset. A maintainer must independently verify the issue and apply `verified` before automation is allowed to create a PR.

The generated PR is never auto-merged.

## One-time GitHub setting

GitHub may block `GITHUB_TOKEN` from opening pull requests until this repository setting is enabled:

**Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**

The wording is GitHub's; the Atlas workflow does not approve or merge its own PRs.

## Parsing and normalization

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

Source kind is inferred as `Primary / official`, `Paper`, `Reporting`, or `Reference`. Contributor-facing prefixes such as `Primary -` are removed from the stored display label.

## Stable insertion

A new record is inserted immediately before the first incident with a later date. Existing records with the same date keep their current relative order.

This is deliberate: a one-record contribution should not create a large diff merely because same-day records were re-sorted by ID.

The manual `npm run add:incident` helper uses the same insertion function.

## Validation

Before the promotion branch is pushed, the workflow runs the full project check:

```bash
npm run check
```

The resulting promotion commit also receives the status:

```text
atlas/promotion-validation
```

with a link back to the workflow run.

Data-only PRs are additionally handled by `validate-data-pr.yml`. That workflow uses `pull_request_target` safely: it checks out trusted base-branch code, verifies the PR is data-only, fetches only the proposed `data/incidents.json`, and validates that data using trusted scripts. It never executes code from the PR branch.

Normal code/documentation PRs continue to use `ci.yml` with the ordinary unprivileged `pull_request` event.

## Security design

Contributor-controlled issue text is treated strictly as data and is never executed.

The promotion parser reads the GitHub event payload from `GITHUB_EVENT_PATH`. Branch names and commit messages use trusted GitHub-generated numeric values such as the issue number and workflow run ID.

The data-only validator never checks out PR code under `pull_request_target`; it copies only the JSON dataset into trusted base code before validation.

## Duplicate and validation protection

Automatic promotion fails before a PR is created if, among other things:

- the generated stable ID already exists
- an existing incident has the same title
- the issue is already `published` or already has a PR
- the date is invalid
- required form fields are missing
- evidence/category/confidence are not recognized
- impact is invalid
- tags are missing
- a theme is not in `data/site.json`
- a source line does not contain an HTTPS URL
- the resulting project fails `npm run check`

When promotion fails, the workflow adds `promotion-failed` and comments with a link to the failed Actions run.

## Successful promotion

After the PR is created, the workflow:

1. removes `needs-verification`
2. removes stale `promotion-failed` when present
3. adds `pr-created`
4. comments on the source issue with the PR URL
5. adds a hidden `atlas-source-issue` marker to the PR body
6. includes `Closes #ISSUE_NUMBER` as a human-readable fallback

PR bodies and issue comments are written through files so Markdown contains real newlines rather than literal `\\n` sequences.

## Merge finalization

`finalize-promoted-issue.yml` runs only when a PR is actually merged and all of these checks match:

- the PR author is `github-actions[bot]`
- the branch begins with `automation/issue-`
- the PR body contains a numeric `atlas-source-issue` marker
- the source issue has `data-submission`, `verified`, and `pr-created`

The finalizer then:

1. removes `pr-created`
2. removes stale `promotion-failed` when present
3. adds `published`
4. comments with the merged PR reference
5. explicitly closes the source issue as completed

This means issue closure does not depend on GitHub's repository setting for closing keywords.

## Retrying a failed promotion

1. Correct the issue content or repository code.
2. Remove `verified` from the issue.
3. Re-apply `verified`.

A successful retry automatically clears `promotion-failed`.
