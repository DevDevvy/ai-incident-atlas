const PRIMARY_HOSTS = [
  'openai.com', 'anthropic.com', 'metr.org', 'palisaderesearch.org', 'aisi.gov.uk',
  'gov.uk', 'fcc.gov', 'garanteprivacy.it', 'ec.europa.eu', 'europa.eu',
  'digital-strategy.ec.europa.eu', 'apple.com', 'microsoft.com', 'huggingface.co',
  'sakana.ai', 'safe.ai', 'futureoflife.org', 'righttowarn.ai'
];

const REPORTING_HOSTS = [
  'reuters.com', 'apnews.com', 'washingtonpost.com', 'nytimes.com', 'arstechnica.com',
  'theverge.com', 'axios.com', 'wired.com', 'bloomberg.com', 'theguardian.com',
  'cnbc.com', 'ft.com', 'sfchronicle.com', 'bbc.com', 'bbc.co.uk', 'semafor.com',
  'japantimes.co.jp'
];

function normalizeEmpty(value = '') {
  const v = String(value).trim();
  return /^_?No response_?$/i.test(v) ? '' : v;
}

export function parseIssueSections(body = '') {
  const sections = new Map();
  const normalized = String(body).replace(/\r\n/g, '\n');
  const heading = /^###\s+(.+?)\s*$/gm;
  const matches = [...normalized.matchAll(heading)];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current[0].length;
    const end = next ? next.index : normalized.length;
    sections.set(current[1].trim(), normalizeEmpty(normalized.slice(start, end)));
  }

  return sections;
}

function getField(sections, label, required = true) {
  const value = normalizeEmpty(sections.get(label) || '');
  if (required && !value) throw new Error(`Missing required issue-form field: ${label}`);
  return value;
}

function normalizeChoice(value, allowed, label) {
  const trimmed = value.trim();
  if (allowed.has(trimmed)) return trimmed;
  for (const option of allowed) {
    if (trimmed.startsWith(`${option} —`) || trimmed.startsWith(`${option} -`)) return option;
  }
  throw new Error(`Invalid ${label}: ${trimmed}`);
}

export function parseList(value) {
  return [...new Set(String(value)
    .split(/[\n,]/)
    .map((x) => x.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean))];
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));
}

const hostMatches = (host, candidates) => candidates.some((d) => host === d || host.endsWith(`.${d}`));

export function inferSourceKind(line, url) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  if (/\b(paper|arxiv)\b/i.test(line) || hostMatches(host, ['arxiv.org'])) return 'Paper';
  if (/\b(primary|official)\b/i.test(line) || hostMatches(host, PRIMARY_HOSTS)) return 'Primary / official';
  if (/\b(reuters|associated press|\bap\b|reporting|guardian|wired|ars technica|bloomberg|axios|bbc|washington post|new york times)\b/i.test(line) || hostMatches(host, REPORTING_HOSTS)) return 'Reporting';
  return 'Reference';
}

export function parseSources(value) {
  const lines = String(value).split('\n').map((x) => x.trim()).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    const match = line.match(/https:\/\/[^\s)\]}>]+/i);
    if (!match) throw new Error(`Source line does not contain an HTTPS URL: ${line.slice(0, 140)}`);

    const url = match[0].replace(/[.,;:]+$/, '');
    let before = line.slice(0, match.index).replace(/^[-*\s]+|[\s—–:|-]+$/g, '').trim();
    before = before.replace(/^(primary|official|reporting|reference|paper)\s*[-—–:|]+\s*/i, '').trim();
    const host = new URL(url).hostname.replace(/^www\./, '');

    parsed.push({
      label: before || host,
      url,
      kind: inferSourceKind(line, url)
    });
  }

  const seen = new Set();
  return parsed.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

export function issueToIncident(issue, config, incidents) {
  if (!issue) throw new Error('Workflow event does not contain an issue.');
  if (issue.pull_request) throw new Error('Pull request events cannot be promoted as incident issues.');

  const labels = new Set((issue.labels || []).map((x) => typeof x === 'string' ? x : x.name));
  if (!labels.has('data-submission')) throw new Error('Only issues labeled data-submission can be promoted.');
  if (!labels.has('verified')) throw new Error('Issue must be labeled verified before promotion.');
  if (labels.has('pr-created') || labels.has('published')) throw new Error('This issue has already been promoted.');

  const sections = parseIssueSections(issue.body || '');
  const allowedEvidence = new Set(config.evidenceOrder);
  const allowedCategories = new Set(config.categories);
  const allowedConfidence = new Set(config.confidenceOrder);
  const allowedThemes = new Set(config.themes);

  const date = getField(sections, 'Event date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`Event date must be valid YYYY-MM-DD; received: ${date}`);
  }

  const title = getField(sections, 'Proposed factual title');
  const id = slugify(title);
  if (!id) throw new Error('Could not generate an incident ID from the title.');

  const evidence = normalizeChoice(getField(sections, 'Evidence type'), allowedEvidence, 'evidence type');
  const category = normalizeChoice(getField(sections, 'Primary category'), allowedCategories, 'category');
  const confidence = normalizeChoice(getField(sections, 'Confidence in the core factual claim'), allowedConfidence, 'confidence');

  const impactMatch = getField(sections, 'Suggested editorial impact').match(/[1-5]/);
  if (!impactMatch) throw new Error('Suggested editorial impact must contain a number from 1 to 5.');
  const impact = Number(impactMatch[0]);

  const tags = parseList(getField(sections, 'Suggested tags'));
  if (!tags.length) throw new Error('At least one suggested tag is required for automatic promotion.');

  const themes = parseList(getField(sections, 'Suggested Atlas themes'));
  if (!themes.length) throw new Error('At least one Atlas theme is required for automatic promotion.');
  for (const theme of themes) {
    if (!allowedThemes.has(theme)) throw new Error(`Unknown Atlas theme: ${theme}`);
  }

  const sources = parseSources(getField(sections, 'Sources'));
  if (!sources.length) throw new Error('At least one source is required.');

  if (incidents.some((x) => x.id === id)) throw new Error(`Duplicate incident id already exists: ${id}`);
  if (incidents.some((x) => x.title.trim().toLowerCase() === title.trim().toLowerCase())) {
    throw new Error(`An incident with this title already exists: ${title}`);
  }

  return {
    date,
    dateLabel: getField(sections, 'Display date / range', false) || formatDateLabel(date),
    title,
    org: getField(sections, 'Organization / model / person'),
    category,
    evidence,
    impact,
    confidence,
    summary: getField(sections, 'What happened?'),
    why: getField(sections, 'Why does it matter?'),
    caveat: getField(sections, 'What does this NOT prove / important caveat?'),
    tags,
    sources,
    id,
    themes
  };
}

export function insertIncident(incidents, record) {
  const next = [...incidents];
  const firstLater = next.findIndex((event) => event.date > record.date);
  if (firstLater === -1) next.push(record);
  else next.splice(firstLater, 0, record);
  return next;
}
