import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { insertIncident } from "./lib/issue-promotion.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const input = args.find((arg) => !arg.startsWith("--"));

if (!input) {
  console.error("Usage: node scripts/add-incidents-bulk.mjs path/to/batch.json [--dry-run]");
  process.exit(2);
}

const datasetPath = path.resolve("data/incidents.json");
const inputPath = path.resolve(input);
const original = fs.readFileSync(datasetPath, "utf8");
const events = JSON.parse(original);
const records = JSON.parse(fs.readFileSync(inputPath, "utf8"));

if (!Array.isArray(records) || records.length === 0) {
  console.error("Bulk import file must contain a non-empty JSON array.");
  process.exit(2);
}

const existingIds = new Set(events.map((event) => event.id));
const existingTitles = new Set(events.map((event) => event.title.trim().toLowerCase()));
const batchIds = new Set();
const batchTitles = new Set();
let next = [...events];

for (const record of records) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    console.error("Every bulk import item must be an incident object.");
    process.exit(2);
  }
  if (!record.id || !record.title || !record.date) {
    console.error("Every bulk import item must include id, title, and date.");
    process.exit(2);
  }

  const normalizedTitle = record.title.trim().toLowerCase();
  if (existingIds.has(record.id)) {
    console.error(`Incident id already exists: ${record.id}`);
    process.exit(1);
  }
  if (existingTitles.has(normalizedTitle)) {
    console.error(`Incident title already exists: ${record.title}`);
    process.exit(1);
  }
  if (batchIds.has(record.id)) {
    console.error(`Duplicate id inside batch: ${record.id}`);
    process.exit(1);
  }
  if (batchTitles.has(normalizedTitle)) {
    console.error(`Duplicate title inside batch: ${record.title}`);
    process.exit(1);
  }

  batchIds.add(record.id);
  batchTitles.add(normalizedTitle);
  next = insertIncident(next, record);
}

const output = JSON.stringify(next, null, 2) + "\n";
fs.writeFileSync(datasetPath, output);

try {
  execFileSync(process.execPath, [path.resolve("scripts/validate-data.mjs")], { stdio: "inherit" });
} catch (error) {
  fs.writeFileSync(datasetPath, original);
  console.error("Validation failed; data/incidents.json was restored.");
  process.exit(error.status || 1);
}

if (dryRun) {
  fs.writeFileSync(datasetPath, original);
  console.log(`✓ Dry run passed for ${records.length} incident(s); dataset restored.`);
} else {
  console.log(`✓ Added ${records.length} incident(s) to data/incidents.json`);
}
