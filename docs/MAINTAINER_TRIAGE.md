# Maintainer triage

Use this flow:

`submitted → needs-verification → verified → merged`

or:

`submitted → source-needed / duplicate / declined`

## Verification

1. Search the current dataset and open issues for duplicates.
2. Open every submitted source.
3. Find the strongest reasonably available primary source.
4. Verify date, names, numbers, and quoted claims independently.
5. Confirm evidence class and distinguish human misuse from autonomous behavior.
6. Rewrite sensational or anthropomorphic wording into observed behavior.
7. Strengthen the mandatory caveat.
8. Decide whether the incident materially improves the Atlas.
9. Edit only `data/incidents.json` for the incident record.
10. Run `npm run validate` and `npm run audit`.
11. Preview with `npm run preview`.
12. Merge and close the issue with the PR/commit reference.

## Stable IDs

Never change an existing `id` only because a title changed. IDs are public references used by deep links, stages, and tours.

## If an event becomes better understood

Update the existing record's summary, confidence, classification, caveat, and sources as appropriate. Git history preserves the earlier state.
