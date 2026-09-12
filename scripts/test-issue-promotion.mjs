import assert from 'node:assert/strict';
import { issueToIncident, parseIssueSections, parseSources } from './lib/issue-promotion.mjs';

const config = {
  evidenceOrder: ['REAL','EVAL','EVAL → REAL','GOV','LEGAL','MISUSE','POLICY','CONTESTED'],
  confidenceOrder: ['High','Medium','Low'],
  categories: ['Model failure','Security / cyber'],
  themes: ['Reliability & hallucination','Cyber & containment']
};

const body = `### Event date

2025-01-16

### Display date / range

Jan 16, 2025

### Proposed factual title

Apple pauses AI news summaries after false attributed headlines

### Organization / model / person

Apple / Apple Intelligence

### Evidence type

REAL — real-world incident or deployed product behavior

### Primary category

Model failure

### Confidence in the core factual claim

High

### Suggested editorial impact

4 — major

### What happened?

Apple temporarily disabled summaries after false alerts.

This second paragraph confirms multiline issue fields are preserved.

### Why does it matter?

It showed attribution risk.

### What does this NOT prove / important caveat?

The publishers did not publish the false claims.

### Sources

Associated Press — https://apnews.com/article/test — reporting
Apple official — https://www.apple.com/newsroom/test — feature documentation

### Suggested tags

Apple Intelligence, hallucination, news integrity

### Suggested Atlas themes

Reliability & hallucination

### Additional verification notes

Verified against sources.

### Submission checklist

- [x] done
`;

const sections = parseIssueSections(body);
assert.match(sections.get('What happened?'), /second paragraph/);
assert.equal(parseSources(sections.get('Sources')).length, 2);

const issue = {
  number: 42,
  labels: [{name:'data-submission'},{name:'verified'}],
  body
};
const record = issueToIncident(issue, config, []);
assert.equal(record.id, 'apple-pauses-ai-news-summaries-after-false-attributed-headlines');
assert.equal(record.impact, 4);
assert.deepEqual(record.tags, ['Apple Intelligence','hallucination','news integrity']);
assert.deepEqual(record.themes, ['Reliability & hallucination']);
assert.equal(record.sources[0].kind, 'Reporting');
assert.equal(record.sources[1].kind, 'Primary / official');

assert.throws(
  () => issueToIncident({...issue, labels:[{name:'data-submission'}]}, config, []),
  /verified/
);
assert.throws(
  () => issueToIncident(issue, config, [{...record}]),
  /Duplicate incident id/
);

console.log('✓ Verified issue promotion parser tests passed.');
