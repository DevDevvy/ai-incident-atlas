import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { insertIncident, issueToIncident } from './lib/issue-promotion.mjs';

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const writeJson = (p, value) => fs.writeFileSync(path.join(root, p), `${JSON.stringify(value, null, 2)}\n`);

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required.');

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const config = readJson('data/site.json');
const incidents = readJson('data/incidents.json');
const record = issueToIncident(event.issue, config, incidents);

writeJson('data/incidents.json', insertIncident(incidents, record));
console.log(`Prepared incident ${record.id} from verified issue #${event.issue.number}.`);
