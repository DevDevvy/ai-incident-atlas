import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root=process.cwd();
const readJson=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const events=readJson("data/incidents.json"), config=readJson("data/site.json"), stages=readJson("data/stages.json"), tour=readJson("data/tour.json");
const errors=[];
const allowedEvidence=new Set(config.evidenceOrder), allowedConfidence=new Set(config.confidenceOrder), allowedThemes=new Set(config.themes), allowedCategories=new Set(config.categories), allowedSourceKinds=new Set(config.sourceKinds);
const required=["id","date","dateLabel","title","org","category","evidence","impact","confidence","summary","why","caveat","tags","themes","sources"];
const ids=new Set();
const dateRe=/^\d{4}-\d{2}-\d{2}$/; const idRe=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function fail(where,msg){errors.push(`${where}: ${msg}`)}
function duplicates(items){return items.filter((v,i,a)=>a.indexOf(v)!==i)}

if(!Array.isArray(events)||!events.length) fail("dataset","incidents.json must be a non-empty array");
events.forEach((e,i)=>{
  const where=`event[${i}]${e?.id?` (${e.id})`:""}`;
  if(!e||typeof e!=="object"||Array.isArray(e)){fail(where,"must be an object");return;}
  for(const key of required) if(!(key in e)) fail(where,`missing required field ${key}`);
  if(typeof e.id!=="string"||!idRe.test(e.id)) fail(where,"id must be lowercase kebab-case");
  if(ids.has(e.id)) fail(where,"duplicate id"); ids.add(e.id);
  if(typeof e.date!=="string"||!dateRe.test(e.date)||Number.isNaN(Date.parse(`${e.date}T00:00:00Z`))) fail(where,"date must be valid YYYY-MM-DD");
  for(const field of ["dateLabel","title","org","summary","why","caveat"]) if(typeof e[field]!=="string"||!e[field].trim()) fail(where,`${field} must be a non-empty string`);
  if(!allowedEvidence.has(e.evidence)) fail(where,`unknown evidence value ${e.evidence}`);
  if(!allowedConfidence.has(e.confidence)) fail(where,`unknown confidence value ${e.confidence}`);
  if(!allowedCategories.has(e.category)) fail(where,`unknown category ${e.category}`);
  if(!Number.isInteger(e.impact)||e.impact<1||e.impact>5) fail(where,"impact must be an integer from 1 to 5");
  if(!Array.isArray(e.tags)||!e.tags.length||e.tags.some(x=>typeof x!=="string"||!x.trim())) fail(where,"tags must be a non-empty string array");
  if(Array.isArray(e.tags)&&duplicates(e.tags).length) fail(where,"tags contain duplicates");
  if(!Array.isArray(e.themes)||!e.themes.length) fail(where,"themes must be non-empty");
  else { for(const t of e.themes) if(!allowedThemes.has(t)) fail(where,`unknown theme ${t}`); if(duplicates(e.themes).length) fail(where,"themes contain duplicates"); }
  if(!Array.isArray(e.sources)||!e.sources.length) fail(where,"at least one source is required");
  else e.sources.forEach((s,j)=>{const sw=`${where} source[${j}]`;if(!s||typeof s!=="object")return fail(sw,"must be object");if(typeof s.label!=="string"||!s.label.trim())fail(sw,"label required");if(typeof s.url!=="string")fail(sw,"url required");else{try{const u=new URL(s.url);if(u.protocol!=="https:")fail(sw,"source URLs must use HTTPS");}catch{fail(sw,"invalid URL")}}if(!allowedSourceKinds.has(s.kind))fail(sw,`unknown source kind ${s.kind}`);});
});
for(let i=1;i<events.length;i++) if(events[i-1].date>events[i].date) fail("dataset",`events must be chronological: ${events[i-1].id} appears before earlier ${events[i].id}`);
for(const [i,s] of stages.entries()){if(!s.id||!s.title||!Array.isArray(s.featuredIds))fail(`stage[${i}]`,"invalid stage structure");else for(const id of s.featuredIds)if(!ids.has(id))fail(`stage[${i}]`,`unknown featured id ${id}`);}
if(!Array.isArray(tour)||!tour.length)fail("tour","tour.json must be a non-empty id array");else{for(const id of tour)if(!ids.has(id))fail("tour",`unknown event id ${id}`);if(duplicates(tour).length)fail("tour","contains duplicate ids");}
if(errors.length){console.error(`Data validation failed with ${errors.length} error(s):\n- ${errors.join("\n- ")}`);process.exit(1);}
const sources=events.reduce((n,e)=>n+e.sources.length,0);console.log(`✓ Validated ${events.length} incidents, ${sources} sources, ${stages.length} narrative stages, and ${tour.length} guided-tour events.`);

