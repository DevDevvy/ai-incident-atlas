import fs from "node:fs";
const events=JSON.parse(fs.readFileSync("data/incidents.json","utf8"));
const count=(fn)=>events.filter(fn).length;const sources=events.flatMap(e=>e.sources);
console.log(`AI Incident Atlas content audit`);console.log(`Events: ${events.length}`);console.log(`Sources: ${sources.length}`);console.log(`Primary/paper-backed events: ${count(e=>e.sources.some(s=>s.kind==="Primary / official"||s.kind==="Paper"))}`);console.log(`Medium/low-confidence events: ${count(e=>e.confidence!=="High")}`);console.log(`Contested events: ${count(e=>e.evidence==="CONTESTED")}`);console.log(`Eval → real events: ${count(e=>e.evidence==="EVAL → REAL")}`);console.log(`\nRecords without a primary source or paper:`);for(const e of events.filter(e=>!e.sources.some(s=>s.kind==="Primary / official"||s.kind==="Paper")))console.log(`- ${e.date} | ${e.id} | ${e.title}`);

