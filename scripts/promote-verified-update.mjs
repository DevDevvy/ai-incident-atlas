import fs from 'node:fs';
import path from 'node:path';
import { normalizeSourceKind, parseIssueSections } from './lib/issue-promotion.mjs';

const root=process.cwd();
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const writeJson=(p,v)=>fs.writeFileSync(path.join(root,p),`${JSON.stringify(v,null,2)}\n`);
const allowedFields=new Set(['date','dateLabel','title','org','category','evidence','impact','confidence','summary','why','caveat','tags','sources','themes']);
const normalizePatchedSource=source=>{
  if(!source||typeof source!=='object')return source;
  if(!Object.hasOwn(source,'kind'))throw new Error('Updated sources must include kind for every source.');
  return {...source,kind:normalizeSourceKind(source.kind)};
};
const normalizePatchChanges=changes=>Object.hasOwn(changes,'sources')
  ? {
      ...changes,
      sources: Array.isArray(changes.sources)
        ? changes.sources.map(normalizePatchedSource)
        : changes.sources
    }
  : changes;

const eventPath=process.env.GITHUB_EVENT_PATH;
if(!eventPath)throw new Error('GITHUB_EVENT_PATH is required.');
const event=JSON.parse(fs.readFileSync(eventPath,'utf8'));
const issue=event.issue;
const labels=new Set((issue.labels||[]).map(x=>typeof x==='string'?x:x.name));
if(!labels.has('correction')||!labels.has('verified'))throw new Error('Verified correction issue required.');
if(labels.has('pr-created')||labels.has('published'))throw new Error('Issue was already promoted.');

const sections=parseIssueSections(issue.body||'');
const field=label=>String(sections.get(label)||'').trim();
const incidentId=field('Incident ID');
let patchText=field('Machine-readable Atlas patch');
patchText=patchText.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
const patch=JSON.parse(patchText);
if(!patch||patch.incidentId!==incidentId||!patch.changes||typeof patch.changes!=='object'||Array.isArray(patch.changes))throw new Error('Invalid incident patch.');
const keys=Object.keys(patch.changes);
if(!keys.length)throw new Error('Patch has no changes.');
for(const key of keys)if(!allowedFields.has(key))throw new Error(`Field cannot be updated automatically: ${key}`);

const incidents=readJson('data/incidents.json');
const index=incidents.findIndex(x=>x.id===incidentId);
if(index<0)throw new Error(`Unknown incident id: ${incidentId}`);
const current=incidents[index];
const changes=normalizePatchChanges(patch.changes);
const updated={...current,...changes,id:current.id};
if(Object.hasOwn(changes,'title')&&incidents.some(x=>x.id!==incidentId&&x.title.trim().toLowerCase()===String(updated.title).trim().toLowerCase()))throw new Error('Updated title duplicates another incident.');

let next=[...incidents];
next[index]=updated;
if(updated.date!==current.date){
  next.splice(index,1);
  const insertAt=next.findIndex(x=>x.date>updated.date);
  if(insertAt<0)next.push(updated);else next.splice(insertAt,0,updated);
}
writeJson('data/incidents.json',next);
console.log(`Prepared update for ${incidentId} from verified issue #${issue.number}. Changed: ${keys.join(', ')}`);
