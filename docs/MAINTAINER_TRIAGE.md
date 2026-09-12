# Maintainer triage

For new incidents, use this flow:

`submitted → needs-verification → verified → pr-created → merged`

or:

`submitted → source-needed / duplicate / declined`

## Verify a new incident

1. Search the current dataset and open issues for duplicates.
2. Open every submitted source.
3. Find the strongest reasonably available primary source.
4. Verify the event date rather than only article publication dates.
5. Verify names, model versions, organizations, numbers, and quoted claims independently.
6. Confirm the evidence class and distinguish human misuse from autonomous behavior.
7. Rewrite sensational or anthropomorphic language into specific observed behavior.
8. Strengthen the mandatory caveat.
9. Confirm tags and Atlas themes are appropriate.
10. Decide whether the incident materially improves the Atlas.

## Promote the verified issue

For a **new incident** issue carrying `data-submission`, apply the label:

`verified`

That is the approval boundary. The `Promote verified incident` GitHub Actions workflow will then:

1. parse the issue form
2. generate the canonical record
3. insert it chronologically into `data/incidents.json`
4. run `npm run validate`
5. create a dedicated automation branch
6. open a pull request containing the dataset change
7. add `pr-created` and remove `needs-verification`
8. comment on the issue with the PR URL

Review the generated PR normally. Do not merge only because the automation succeeded.

The PR contains `Closes #N`, so merging it closes the source issue.

## If automation fails

The issue receives `promotion-failed` and a comment linking to the Actions run.

Typical causes:

- missing tags/themes
- invalid theme name
- malformed source line
- duplicate incident ID/title
- invalid date or classification
- repository setting does not allow GitHub Actions to create PRs

Correct the issue or automation problem, remove/re-add `verified`, and retry.

## Corrections / updates

Correction issues carry `correction`, not `data-submission`, and are intentionally excluded from automatic promotion for now. Existing stable IDs can be referenced by stages, tours, and external deep links, so updates need more careful patch semantics than new-record insertion.

For a verified correction:

1. edit the existing record in `data/incidents.json`
2. preserve its existing `id` unless there is an exceptional migration reason
3. run `npm run validate` and `npm run audit`
4. open a PR linked to the correction issue

## Stable IDs

Never change an existing `id` only because a title changed. IDs are public references used by deep links, stages, tours, and outside links.

## If an event becomes better understood

Update the existing record's summary, confidence, classification, caveat, and sources as appropriate. Git history preserves the earlier state.
