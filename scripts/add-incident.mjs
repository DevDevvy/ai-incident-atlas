import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const input=process.argv[2];
if(!input){console.error("Usage: node scripts/add-incident.mjs path/to/record.json");process.exit(2);}
const datasetPath=path.resolve("data/incidents.json");
const record=JSON.parse(fs.readFileSync(path.resolve(input),"utf8"));
const events=JSON.parse(fs.readFileSync(datasetPath,"utf8"));
if(events.some(e=>e.id===record.id)){console.error(`Incident id already exists: ${record.id}`);process.exit(1);}
events.push(record);events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
fs.writeFileSync(datasetPath,JSON.stringify(events,null,2)+"\n");
try{execFileSync(process.execPath,[path.resolve("scripts/validate-data.mjs")],{stdio:"inherit"});}
catch(error){console.error("Validation failed. Revert the dataset change or fix the new record.");process.exit(error.status||1);}
console.log(`✓ Added ${record.id} to data/incidents.json`);

