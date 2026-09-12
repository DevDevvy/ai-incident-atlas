"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let events = [];
let stages = [];
let tourIds = [];
let config = {};
let allThemes = [];
let evidenceOrder = [];
let confidenceOrder = [];
let palette = {};
let tourIndex = 0;

const state = {
  view: "story", query: "", evidence: new Set(), themes: new Set(), confidence: new Set(),
  from: 0, to: 9999, impact: 1, savedOnly: false, primaryOnly: false, sort: "date", dir: 1
};

function safeStorageGet(key, fallback) {
  try { const value = localStorage.getItem(key); return value == null ? fallback : JSON.parse(value); }
  catch { return fallback; }
}
function safeStorageSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function ns(suffix) { return `${config.storageNamespace || "aiIncidentAtlas:v1"}:${suffix}`; }
let bookmarks = new Set();
let notes = {};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function validHttpUrl(url) { try { const u = new URL(url); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; } }
function sourceDomain(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function formatLongDate(iso) { try { return new Intl.DateTimeFormat("en-US", {year:"numeric",month:"long",day:"numeric",timeZone:"UTC"}).format(new Date(`${iso}T00:00:00Z`)); } catch { return iso; } }

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function loadData() {
  [events, stages, tourIds, config] = await Promise.all([
    fetchJson("./data/incidents.json"), fetchJson("./data/stages.json"), fetchJson("./data/tour.json"), fetchJson("./data/site.json")
  ]);
  if (!Array.isArray(events) || events.length === 0) throw new Error("Incident dataset is empty or invalid.");
  evidenceOrder = config.evidenceOrder || [...new Set(events.map(e => e.evidence))];
  confidenceOrder = config.confidenceOrder || [...new Set(events.map(e => e.confidence))];
  palette = config.palette || {};
  allThemes = config.themes || [...new Set(events.flatMap(e => e.themes || []))].sort();
  bookmarks = new Set(safeStorageGet(ns("bookmarks"), []));
  notes = safeStorageGet(ns("notes"), {});
  const years = events.map(e => Number(e.date.slice(0,4)));
  state.from = Math.min(...years); state.to = Math.max(...years);
}

function toast(message) {
  const el = $("#toast"); if (!el) return; el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 1800);
}

function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
}

function impactBars(n, color) {
  return `<span class="impact" title="Editorial impact ${n}/5" style="--dot:${esc(color)}">${[1,2,3,4,5].map(i=>`<i class="${i<=n?"on":""}"></i>`).join("")}</span>`;
}

function hasPrimarySource(event) { return event.sources.some(s => s.kind === "Primary / official" || s.kind === "Paper"); }

function visibleEvents() {
  const q = state.query.trim().toLowerCase();
  return events.filter(event => {
    const haystack = [event.title,event.org,event.category,event.evidence,event.confidence,event.summary,event.why,event.caveat,...event.tags,...event.themes,...event.sources.map(s=>s.label)].join(" ").toLowerCase();
    const year = Number(event.date.slice(0,4));
    return (!q || haystack.includes(q))
      && (!state.evidence.size || state.evidence.has(event.evidence))
      && (!state.themes.size || event.themes.some(t => state.themes.has(t)))
      && (!state.confidence.size || state.confidence.has(event.confidence))
      && year >= state.from && year <= state.to
      && event.impact >= state.impact
      && (!state.savedOnly || bookmarks.has(event.id))
      && (!state.primaryOnly || hasPrimarySource(event));
  });
}

function closeMobileFilters() {
  $("#sidebar")?.classList.remove("open"); $("#filterBackdrop")?.classList.remove("open");
  if ($("#mobileFilters")) $("#mobileFilters").textContent = "☰ Filters";
}
function toggleMobileFilters() {
  const opening = !$("#sidebar").classList.contains("open");
  $("#sidebar").classList.toggle("open", opening); $("#filterBackdrop").classList.toggle("open", opening);
  $("#mobileFilters").textContent = opening ? "× Close filters" : "☰ Filters";
}

function setView(view, scroll = true) {
  state.view = view;
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#${view}View`)?.classList.add("active");
  $$('[data-view]').forEach(button => button.classList.toggle("active", button.dataset.view === view));
  closeMobileFilters();
  if (view === "timeline") renderTimeline();
  if (view === "themes") renderThemes();
  if (view === "research") renderResearch();
  if (scroll) $(".workspace")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function renderHero() {
  $("#coverageEyebrow").textContent = `Research atlas · ${formatLongDate(events[0].date)} → ${formatLongDate(events.at(-1).date)}`;
  $("#heroLede").textContent = `A research-first map of ${events.length} major incidents, evaluations, resignations, legal fights, misuse cases, governance failures, and real-world agent boundary crossings—built to separate what actually happened from what headlines implied.`;
  $("#statTotal").textContent = events.length;
  $("#statCross").textContent = events.filter(e=>e.evidence === "EVAL → REAL").length;
  $("#statEval").textContent = events.filter(e=>e.evidence === "EVAL").length;
  $("#statGov").textContent = events.filter(e=>e.evidence === "GOV" || e.evidence === "POLICY").length;
  $("#statSources").textContent = events.reduce((n,e)=>n+e.sources.length,0);
  $("#footerSnapshot").textContent = `${events.length} events · coverage through ${formatLongDate(events.at(-1).date)}`;

  const counts = new Map();
  events.forEach(e => counts.set(e.date.slice(0,4), (counts.get(e.date.slice(0,4)) || 0) + 1));
  const max = Math.max(...counts.values());
  $("#yearBars").innerHTML = [...counts.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([year,count]) => `<div class="yearbar"><span>${year}</span><div class="bartrack"><div class="barfill" style="width:${Math.round(count/max*100)}%"></div></div><b>${count}</b></div>`).join("");
}

function renderLatest() {
  const latest = [...events].sort((a,b)=>b.date.localeCompare(a.date)).slice(0, config.latestCount || 4);
  $("#latestEvents").innerHTML = latest.map(e=>`<button class="latest-item" data-open="${esc(e.id)}"><time>${esc(e.dateLabel)} · ${esc(e.evidence)}</time><b>${esc(e.title)}</b></button>`).join("");
}

function setupFilters() {
  $("#evidenceFilters").innerHTML = evidenceOrder.map(x=>`<label class="checkrow"><input type="checkbox" value="${esc(x)}"> <span>${esc(x)}</span></label>`).join("");
  $("#themeFilters").innerHTML = allThemes.map(x=>`<label class="checkrow"><input type="checkbox" value="${esc(x)}"> <span>${esc(x)}</span></label>`).join("");
  $("#confidenceFilters").innerHTML = confidenceOrder.map(x=>`<label class="checkrow"><input type="checkbox" value="${esc(x)}"> <span>${esc(x)}</span></label>`).join("");
  const years = [...new Set(events.map(e=>e.date.slice(0,4)))].sort();
  $("#yearFrom").innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join("");
  $("#yearTo").innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join("");
  $("#yearFrom").value = String(state.from); $("#yearTo").value = String(state.to);
}

function filtersChanged() {
  state.query = $("#search").value;
  state.evidence = new Set($$("#evidenceFilters input:checked").map(x=>x.value));
  state.themes = new Set($$("#themeFilters input:checked").map(x=>x.value));
  state.confidence = new Set($$("#confidenceFilters input:checked").map(x=>x.value));
  state.from = Number($("#yearFrom").value); state.to = Number($("#yearTo").value);
  state.impact = Number($("#impactMin").value); state.savedOnly = $("#savedOnly").checked; state.primaryOnly = $("#primaryOnly").checked;
  if (state.from > state.to) { [state.from,state.to] = [state.to,state.from]; $("#yearFrom").value = String(state.from); $("#yearTo").value = String(state.to); }
  renderCurrent();
}

function resetFilters() {
  $("#search").value = ""; $$("#sidebar input[type=checkbox]").forEach(x=>x.checked=false);
  state.query=""; state.evidence.clear(); state.themes.clear(); state.confidence.clear(); state.impact=1; state.savedOnly=false; state.primaryOnly=false;
  const years = events.map(e=>Number(e.date.slice(0,4))); state.from=Math.min(...years); state.to=Math.max(...years);
  $("#yearFrom").value=String(state.from); $("#yearTo").value=String(state.to); $("#impactMin").value="1";
  renderCurrent();
}

function renderCurrent() {
  renderStages(); renderLatest();
  if (state.view === "timeline") renderTimeline();
  if (state.view === "themes") renderThemes();
  if (state.view === "research") renderResearch();
  updateSavedCount();
}

function renderStages() {
  const visible = new Set(visibleEvents().map(e=>e.id));
  $("#stages").innerHTML = stages.map(stage => {
    const keys = stage.featuredIds.map(id=>events.find(e=>e.id===id)).filter(e=>e && visible.has(e.id));
    return `<article class="stage" style="--stage:${esc(stage.accent)}"><div class="stage-top"><div><div class="stage-years">${esc(stage.years)}</div><h3>${esc(stage.title)}</h3><div class="stage-sub">${esc(stage.subtitle)}</div></div><span class="badge">${keys.length} highlighted</span></div><p class="stage-summary">${esc(stage.summary)}</p>${keys.length?`<div class="keyevents">${keys.map(e=>`<button class="keyevent" data-open="${esc(e.id)}"><time>${esc(e.dateLabel)} · ${esc(e.evidence)}</time><b>${esc(e.title)}</b></button>`).join("")}</div>`:`<div class="empty">Current filters hide this chapter’s anchor events.</div>`}</article>`;
  }).join("");
}

function renderTimeline() {
  const list = [...visibleEvents()].sort((a,b)=>a.date.localeCompare(b.date));
  $("#timelineCount").textContent = `${list.length} of ${events.length} events`;
  if (!list.length) { $("#timeline").innerHTML = `<div class="empty">No events match the current filters.</div>`; return; }
  let out="", lastYear="";
  list.forEach(event => {
    const year=event.date.slice(0,4), dot=palette[event.evidence]||"#8fa9ff";
    if (year!==lastYear) { out += `<div class="year-marker"><div class="year">${year}</div><div class="rule"></div></div>`; lastYear=year; }
    out += `<article class="event" style="--dot:${dot}"><div class="event-date">${esc(event.dateLabel)}</div><div class="card" role="button" tabindex="0" data-open="${esc(event.id)}"><div class="meta"><span class="badge evidence">${esc(event.evidence)}</span><span class="badge">${esc(event.category)}</span><span class="org">${esc(event.org)}</span>${impactBars(event.impact,dot)}</div><h3>${esc(event.title)}</h3><p>${esc(event.summary)}</p><div class="cardfoot"><div class="tags">${event.themes.slice(0,2).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}${event.tags.slice(0,2).map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div><div class="actions-mini"><button class="mini ${bookmarks.has(event.id)?"bookmarked":""}" data-bookmark="${esc(event.id)}" title="Bookmark" aria-label="Bookmark ${esc(event.title)}">★</button><button class="mini" data-open="${esc(event.id)}">Details ↗</button></div></div></div></article>`;
  });
  $("#timeline").innerHTML = out;
}

function renderThemes() {
  const visible = visibleEvents();
  $("#themesCount").textContent = `${visible.length} events across ${allThemes.length} theme lanes`;
  $("#themesGrid").innerHTML = allThemes.map(theme => {
    const list=visible.filter(e=>e.themes.includes(theme)).sort((a,b)=>a.date.localeCompare(b.date));
    return `<section class="theme-card"><h3>${esc(theme)}</h3><div class="theme-count">${list.length} matching events</div><div class="theme-events">${list.length?list.map(e=>`<button class="theme-event" data-open="${esc(e.id)}"><time>${esc(e.dateLabel)} · ${esc(e.evidence)}</time><b>${esc(e.title)}</b><span>${esc(e.org)}</span></button>`).join(""):`<div class="empty" style="padding:18px">No matches</div>`}</div></section>`;
  }).join("");
}

function renderResearchHealth(list) {
  const primary=list.filter(hasPrimarySource).length, medium=list.filter(e=>e.confidence!=="High").length, contested=list.filter(e=>e.evidence==="CONTESTED").length;
  $("#researchHealth").innerHTML = `<div class="health"><b>${list.length}</b><span>visible records</span></div><div class="health"><b>${list.length?Math.round(primary/list.length*100):0}%</b><span>primary/paper coverage</span></div><div class="health"><b>${medium}</b><span>below high confidence</span></div><div class="health"><b>${contested}</b><span>contested records</span></div>`;
}

function renderResearch() {
  let list=[...visibleEvents()]; const key=state.sort, dir=state.dir;
  list.sort((a,b)=>{let av=a[key],bv=b[key];if(key==="impact"){av=Number(av);bv=Number(bv)} return (av>bv?1:av<bv?-1:0)*dir;});
  $("#researchCount").textContent=`${list.length} rows`; renderResearchHealth(list);
  $("#researchBody").innerHTML=list.map(e=>`<tr><td>${esc(e.dateLabel)}</td><td class="titlecell" data-open="${esc(e.id)}">${esc(e.title)}</td><td><span class="badge" style="color:${palette[e.evidence]||"#fff"}">${esc(e.evidence)}</span></td><td>${esc(e.category)}</td><td>${esc(e.org)}</td><td>${e.impact}/5</td><td>${esc(e.confidence)}</td><td>${e.themes.map(t=>`<span class="sourcepill">${esc(t)}</span>`).join("")}</td><td><div class="source-quality">${e.sources.map(s=>`<span class="quality-pill ${s.kind==="Primary / official"||s.kind==="Paper"?"primary":""}">${esc(s.kind)}</span>`).join("")}</div></td></tr>`).join("");
}

function relatedFor(event) {
  return events.filter(x=>x.id!==event.id).map(x=>({event:x,score:x.themes.filter(t=>event.themes.includes(t)).length+x.tags.filter(t=>event.tags.includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.event.date.localeCompare(b.event.date)).slice(0,4).map(x=>x.event);
}

function openEvent(id) {
  const event=events.find(x=>x.id===id); if(!event) return;
  const dot=palette[event.evidence]||"#8fa9ff", related=relatedFor(event);
  $("#modalMeta").innerHTML=`<span class="badge evidence" style="--dot:${dot};color:${dot}">${esc(event.evidence)}</span><span class="badge">${esc(event.category)}</span><span class="org">${esc(event.org)}</span>`;
  $("#modalTitle").textContent=event.title;
  $("#modalBody").innerHTML=`<dl class="detailgrid"><dt>Date</dt><dd>${esc(event.dateLabel)}</dd><dt>Confidence</dt><dd>${esc(event.confidence)}</dd><dt>Editorial impact</dt><dd>${event.impact}/5</dd><dt>Themes</dt><dd>${event.themes.map(t=>`<span class="tag">${esc(t)}</span>`).join(" ")}</dd><dt>Tags</dt><dd>${event.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join(" ")}</dd></dl><div class="detail"><h4>What happened</h4><p>${esc(event.summary)}</p></div><div class="detail"><h4>Why it matters</h4><p>${esc(event.why)}</p></div><div class="detail"><h4>What this does not prove / important caveat</h4><p class="caveat">${esc(event.caveat)}</p></div><div class="detail"><h4>Sources</h4><div class="sources">${event.sources.map(source=>validHttpUrl(source.url)?`<a class="source" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer"><span><b>${esc(source.label)}</b><small>${esc(source.kind)} · ${esc(sourceDomain(source.url))}</small></span><span class="arrow">↗</span></a>`:"").join("")}</div></div><div class="detail"><h4>Related incidents</h4><div class="related">${related.map(r=>`<button data-open="${esc(r.id)}">${esc(r.dateLabel)}<br><b>${esc(r.title)}</b></button>`).join("")}</div></div><div class="detail"><h4>Your research note — stored only in this browser</h4><textarea class="notes" id="eventNote" placeholder="Add your own note, quote to verify, follow-up question, or research lead…">${esc(notes[event.id]||"")}</textarea></div><div class="modal-actions"><button class="softbtn ${bookmarks.has(event.id)?"bookmarked":""}" id="modalBookmark">★ ${bookmarks.has(event.id)?"Bookmarked":"Bookmark"}</button><button class="softbtn" id="copyCitation">Copy citation text</button><button class="softbtn" id="copyJson">Copy JSON record</button><button class="softbtn" id="copyLink">Copy deep link</button></div>`;
  $("#eventNote").addEventListener("input",ev=>{notes[event.id]=ev.target.value;safeStorageSet(ns("notes"),notes);});
  $("#modalBookmark").onclick=()=>{toggleBookmark(event.id);openEvent(event.id);};
  $("#copyCitation").onclick=()=>copyText(`${event.dateLabel} — ${event.title}. ${event.summary} Sources: ${event.sources.map(s=>`${s.label}: ${s.url}`).join(" | ")}`,"Citation text copied");
  $("#copyJson").onclick=()=>copyText(JSON.stringify(event,null,2),"JSON record copied");
  $("#copyLink").onclick=()=>{const url=new URL(location.href);url.hash=`event=${encodeURIComponent(event.id)}`;copyText(url.toString(),"Deep link copied");};
  if(!$("#detailDialog").open) $("#detailDialog").showModal();
  document.title=`${event.title} — ${config.name || "AI Incident Atlas"}`;
  history.replaceState(null,"",`#event=${encodeURIComponent(event.id)}`);
}

async function copyText(text, success) {
  try { await navigator.clipboard.writeText(text); toast(success); }
  catch { const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast(success); }
}

function closeEvent() {
  if($("#detailDialog").open) $("#detailDialog").close();
  document.title=config.name||"AI Incident Atlas"; history.replaceState(null,"",`${location.pathname}${location.search}`);
}

function toggleBookmark(id) {
  bookmarks.has(id)?bookmarks.delete(id):bookmarks.add(id); safeStorageSet(ns("bookmarks"),[...bookmarks]); updateSavedCount(); renderCurrent(); toast(bookmarks.has(id)?"Bookmarked":"Bookmark removed");
}
function updateSavedCount(){ $("#savedCount").textContent=bookmarks.size; }

function csvEscape(value){ const s=String(value??""); return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s; }
function exportCSV(){const rows=[["date","date_label","id","title","organization","evidence","category","impact","confidence","themes","summary","why_it_matters","caveat","sources"]];visibleEvents().forEach(e=>rows.push([e.date,e.dateLabel,e.id,e.title,e.org,e.evidence,e.category,e.impact,e.confidence,e.themes.join("; "),e.summary,e.why,e.caveat,e.sources.map(s=>s.url).join("; ")]));download("ai-incident-atlas-filtered.csv",rows.map(r=>r.map(csvEscape).join(",")).join("\n"),"text/csv");}
function exportJSON(){download("ai-incident-atlas-filtered.json",JSON.stringify(visibleEvents(),null,2),"application/json");}
function exportNotes(){const out=events.filter(e=>bookmarks.has(e.id)||notes[e.id]).map(e=>({id:e.id,date:e.date,title:e.title,bookmarked:bookmarks.has(e.id),note:notes[e.id]||"",sources:e.sources}));download("ai-incident-atlas-notes.json",JSON.stringify(out,null,2),"application/json");}

function renderTour(){const valid=tourIds.map(id=>events.find(e=>e.id===id)).filter(Boolean);if(!valid.length)return;const event=valid[tourIndex];$("#tourStep").textContent=`Guided progression · ${tourIndex+1} of ${valid.length}`;$("#tourTitle").textContent=event.title;$("#tourSummary").textContent=event.summary;$("#tourWhy").textContent=event.why;$("#tourMeta").innerHTML=`<span class="badge" style="color:${palette[event.evidence]||"#fff"}">${esc(event.evidence)}</span><span class="badge">${esc(event.dateLabel)}</span><span class="badge">${esc(event.org)}</span>`;$("#tourPrev").disabled=tourIndex===0;$("#tourNext").textContent=tourIndex===valid.length-1?"Finish":"Next →";}
function startTour(){tourIndex=0;$("#tour").classList.add("show");renderTour();$("#tourExit").focus();}
function closeTour(){$("#tour").classList.remove("show");}
function applyQuick(evidence){resetFilters();const checkbox=$$("#evidenceFilters input").find(x=>x.value===evidence);if(checkbox){checkbox.checked=true;filtersChanged();}setView("timeline");}
function handleHash(){const match=location.hash.match(/event=([^&]+)/);if(match)openEvent(decodeURIComponent(match[1]));}

function inferGithubRepository() {
  if (config.repositoryUrl) return config.repositoryUrl.replace(/\/$/,"");
  const host=location.hostname.toLowerCase();
  if(host.endsWith(".github.io")){const owner=host.slice(0,-".github.io".length),repo=location.pathname.split("/").filter(Boolean)[0];if(owner&&repo)return `https://github.com/${owner}/${repo}`;}
  return "";
}
function setupContributionLinks() {
  const repo=inferGithubRepository();
  const map={contributeBtn:repo?`${repo}/issues/new/choose`:"#",newIncidentLink:repo?`${repo}/issues/new?template=new_incident.yml`:"#",updateIncidentLink:repo?`${repo}/issues/new?template=update_incident.yml`:"#",githubRepoLink:repo||"#",footerRepo:repo||"#"};
  Object.entries(map).forEach(([id,url])=>{const el=$(`#${id}`);if(!el)return;el.href=url;if(repo){el.target="_blank";el.rel="noopener noreferrer";}else el.addEventListener("click",ev=>{ev.preventDefault();toast("Set repositoryUrl in data/site.json or publish on GitHub Pages to activate this link");});});
}

function renderResearchStats() { renderResearch(); }

function bindEvents() {
  document.addEventListener("click",event=>{
    const bookmark=event.target.closest("[data-bookmark]");if(bookmark){event.stopPropagation();toggleBookmark(bookmark.dataset.bookmark);return;}
    const open=event.target.closest("[data-open]");if(open){event.stopPropagation();openEvent(open.dataset.open);return;}
    const view=event.target.closest("[data-view]");if(view){setView(view.dataset.view);return;}
    const jump=event.target.closest("[data-jump]");if(jump){setView(jump.dataset.jump);return;}
    const quick=event.target.closest("[data-quick]");if(quick){applyQuick(quick.dataset.quick);return;}
  });
  document.addEventListener("keydown",event=>{
    if((event.key==="Enter"||event.key===" ")&&event.target.matches(".card[data-open]")){event.preventDefault();openEvent(event.target.dataset.open);}
    if(event.key==="Escape"){closeMobileFilters();if($("#tour").classList.contains("show"))closeTour();}
  });
  $("#search").addEventListener("input",filtersChanged); $("#yearFrom").addEventListener("change",filtersChanged); $("#yearTo").addEventListener("change",filtersChanged); $("#impactMin").addEventListener("change",filtersChanged); $("#savedOnly").addEventListener("change",filtersChanged); $("#primaryOnly").addEventListener("change",filtersChanged);
  $("#evidenceFilters").addEventListener("change",filtersChanged); $("#themeFilters").addEventListener("change",filtersChanged); $("#confidenceFilters").addEventListener("change",filtersChanged);
  $$('[data-clear]').forEach(button=>button.addEventListener("click",()=>{const key=button.dataset.clear,id=key==="evidence"?"evidenceFilters":key==="themes"?"themeFilters":"confidenceFilters";$$(`#${id} input`).forEach(x=>x.checked=false);filtersChanged();}));
  $("#resetFilters").onclick=resetFilters; $("#exportBtn").onclick=exportCSV; $("#csvBtn").onclick=exportCSV; $("#jsonBtn").onclick=exportJSON; $("#notesBtn").onclick=exportNotes; $("#printBtn").onclick=()=>window.print();
  $("#savedBtn").onclick=()=>{$("#savedOnly").checked=!$("#savedOnly").checked;filtersChanged();setView("timeline");}; $("#aboutBtn").onclick=()=>setView("method");
  $("#tourBtn").onclick=startTour; $("#heroTour").onclick=startTour; $("#tourExit").onclick=closeTour; $("#tourPrev").onclick=()=>{if(tourIndex>0){tourIndex--;renderTour();}}; $("#tourNext").onclick=()=>{const valid=tourIds.filter(id=>events.some(e=>e.id===id));if(tourIndex<valid.length-1){tourIndex++;renderTour();}else closeTour();};
  $("#detailDialog .close").onclick=closeEvent; $("#detailDialog").addEventListener("click",event=>{if(event.target===$("#detailDialog"))closeEvent();});
  $("#mobileFilters").onclick=toggleMobileFilters; $("#filterBackdrop").onclick=closeMobileFilters;
  $$("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{if(state.sort===th.dataset.sort)state.dir*=-1;else{state.sort=th.dataset.sort;state.dir=1;}renderResearch();}));
  window.addEventListener("scroll",()=>{const d=document.documentElement,total=d.scrollHeight-d.clientHeight;$("#progress").style.width=`${total>0?(d.scrollTop/total)*100:0}%`;});
  window.addEventListener("hashchange",handleHash); window.addEventListener("resize",()=>{if(innerWidth>800)closeMobileFilters();});
}

function showFatal(error) {
  const box=$("#fatalError"); box.classList.remove("hidden"); box.innerHTML=`<h2>The Atlas could not load its data.</h2><p>${esc(error.message||String(error))}</p><p>If you opened <code>index.html</code> directly from disk, run a local web server instead. See the repository README.</p>`;
}

async function init() {
  try {
    await loadData(); document.title=config.name||"AI Incident Atlas"; setupFilters(); renderHero(); renderLatest(); renderStages(); renderTimeline(); renderThemes(); renderResearch(); setupContributionLinks(); updateSavedCount(); bindEvents(); setView("story",false); handleHash();
  } catch(error) { console.error(error); showFatal(error); }
  finally { requestAnimationFrame(()=>$("#loadingScreen")?.classList.add("done")); setTimeout(()=>$("#loadingScreen")?.remove(),350); }
}

init();

