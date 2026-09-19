import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { insertIncident, issueToIncident, normalizeSourceKind, parseIssueSections, parseSources } from './lib/issue-promotion.mjs';

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
Primary - Apple official — https://www.apple.com/newsroom/test — feature documentation

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
const parsedSources = parseSources(sections.get('Sources'));
assert.equal(parsedSources.length, 2);
assert.equal(parsedSources[0].label, 'Associated Press');
assert.equal(parsedSources[1].label, 'Apple official');

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
assert.equal(normalizeSourceKind('Primary'), 'Primary / official');
assert.equal(normalizeSourceKind('official'), 'Primary / official');
assert.equal(normalizeSourceKind('Reporting'), 'Reporting');
assert.equal(normalizeSourceKind('Paper'), 'Paper');
assert.throws(() => normalizeSourceKind('Blog post'), /Invalid source kind/);

assert.throws(
  () => issueToIncident({...issue, labels:[{name:'data-submission'}]}, config, []),
  /verified/
);
assert.throws(
  () => issueToIncident({...issue, labels:[{name:'data-submission'},{name:'verified'},{name:'published'}]}, config, []),
  /already been promoted/
);
assert.throws(
  () => issueToIncident({...issue, labels:[{name:'data-submission'},{name:'correction'},{name:'verified'}]}, config, []),
  /cannot be promoted as new incidents/
);
assert.throws(
  () => issueToIncident(issue, config, [{...record}]),
  /Duplicate incident id/
);

const existing = [
  {id:'before', date:'2025-01-15'},
  {id:'same-z', date:'2025-01-16'},
  {id:'same-a', date:'2025-01-16'},
  {id:'after', date:'2025-01-17'}
];
const inserted = insertIncident(existing, {id:'new', date:'2025-01-16'});
assert.deepEqual(inserted.map((x)=>x.id), ['before','same-z','same-a','new','after']);
assert.deepEqual(existing.map((x)=>x.id), ['before','same-z','same-a','after']);

function runPromoteUpdate(changes, additionalLabels = []) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-promote-test-'));
  try {
    fs.mkdirSync(path.join(tempRoot, 'scripts', 'lib'), {recursive:true});
    fs.mkdirSync(path.join(tempRoot, 'data'), {recursive:true});
    fs.copyFileSync(new URL('./promote-verified-update.mjs', import.meta.url), path.join(tempRoot, 'scripts', 'promote-verified-update.mjs'));
    fs.copyFileSync(new URL('./lib/issue-promotion.mjs', import.meta.url), path.join(tempRoot, 'scripts', 'lib', 'issue-promotion.mjs'));
    fs.writeFileSync(path.join(tempRoot, 'data', 'incidents.json'), `${JSON.stringify([{
      id:'openai-agents-flood-rubygems-during-internal-activity',
      date:'2026-05-11',
      dateLabel:'May 11, 2026',
      title:'OpenAI agents flood RubyGems during internal activity',
      org:'OpenAI',
      category:'Security / cyber',
      evidence:'REAL',
      impact:4,
      confidence:'High',
      summary:'Original summary.',
      why:'Original why.',
      caveat:'Original caveat.',
      tags:['RubyGems'],
      themes:['Cyber & containment'],
      sources:[{label:'Existing source',url:'https://example.com/existing',kind:'Reference'}]
    }], null, 2)}\n`);
    fs.writeFileSync(path.join(tempRoot, 'event.json'), JSON.stringify({
      issue:{
        number:15,
        labels:[{name:'verified'},{name:'correction'}, ...additionalLabels.map((name) => ({name}))],
        body:`### Incident ID

openai-agents-flood-rubygems-during-internal-activity

### Machine-readable Atlas patch

\`\`\`json
{
  "incidentId": "openai-agents-flood-rubygems-during-internal-activity",
  "changes": ${JSON.stringify(changes, null, 4)}
}
\`\`\``
      }
    }, null, 2));
    const result = spawnSync(process.execPath, ['scripts/promote-verified-update.mjs'], {
      cwd: tempRoot,
      env: {...process.env, GITHUB_EVENT_PATH:path.join(tempRoot, 'event.json')},
      encoding: 'utf8'
    });
    const incidentsPath = path.join(tempRoot, 'data', 'incidents.json');
    return {
      result,
      incidents: JSON.parse(fs.readFileSync(incidentsPath, 'utf8'))
    };
  } finally {
    fs.rmSync(tempRoot, {recursive:true, force:true});
  }
}

const promoted = runPromoteUpdate({
  sources: [
    {
      label:'Reuters',
      url:'https://www.reuters.com/legal/litigation/openai-agents-attacked-software-service-rubygems-before-hugging-face-incident-2026-09-11/',
      kind:'Reporting'
    },
    {
      label:'RubyGems blog',
      url:'https://blog.rubygems.org/2026/09/11/update-may-spam-publishing-campaign.html',
      kind:'Primary'
    }
  ]
});
assert.equal(promoted.result.status, 0, promoted.result.stderr || promoted.result.stdout);
assert.equal(promoted.incidents[0].sources[1].kind, 'Primary / official');

const missingKind = runPromoteUpdate({
  sources: [
    {
      label:'RubyGems blog',
      url:'https://blog.rubygems.org/2026/09/11/update-may-spam-publishing-campaign.html'
    }
  ]
});
assert.notEqual(missingKind.result.status, 0);
assert.match(`${missingKind.result.stderr}\n${missingKind.result.stdout}`, /Updated sources must include kind for every source/);

const invalidSourcesShape = runPromoteUpdate({
  sources: null
});
assert.notEqual(invalidSourcesShape.result.status, 0);
assert.match(`${invalidSourcesShape.result.stderr}\n${invalidSourcesShape.result.stdout}`, /Updated sources must be an array/);

const ambiguousUpdate = runPromoteUpdate({summary:'Updated summary.'}, ['data-submission']);
assert.notEqual(ambiguousUpdate.result.status, 0);
assert.match(`${ambiguousUpdate.result.stderr}\n${ambiguousUpdate.result.stdout}`, /cannot be promoted as corrections/);

console.log('✓ Verified issue promotion parser and stable insertion tests passed.');
