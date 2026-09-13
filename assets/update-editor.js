"use strict";

const UPDATE_FIELDS = [
  ["date","Event date"],["dateLabel","Display date"],["title","Title"],["org","Organization / model / person"],
  ["evidence","Evidence classification"],["category","Category"],["impact","Impact"],["confidence","Confidence"],
  ["summary","What happened"],["why","Why it matters"],["caveat","Caveat / interpretation"],
  ["themes","Themes"],["tags","Tags"],["sources","Sources"]
];

let updateEvents = [];
let updateConfig = {};
let selectedEvent = null;

const uq = (selector, root=document) => root.querySelector(selector);
const uqa = (selector, root=document) => [...root.querySelectorAll(selector)];
const htmlEscape = (value="") => String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function updateFetchJson(url){const response=await fetch(url,{cache:"no-cache"});if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);return response.json();}
function inferRepo(){
  if(updateConfig.repositoryUrl)return updateConfig.repositoryUrl.replace(/\/$/,"");
  const host=location.hostname.toLowerCase();
  if(host.endsWith(".github.io")){const owner=host.slice(0,-".github.io".length),repo=location.pathname.split("/").filter(Boolean)[0];if(owner&&repo)return `https://github.com/${owner}/${repo}`;}
  return "";
}
function sourceLines(event){return (event.sources||[]).map(source=>`${source.kind} | ${source.label} | ${source.url}`).join("\n");}
function parseList(value){return [...new Set(String(value).split(/[\n,]/).map(x=>x.trim()).filter(Boolean))];}
function parseSourceLines(value){
  const lines=String(value).split("\n").map(x=>x.trim()).filter(Boolean);
  return lines.map(line=>{
    const parts=line.split("|").map(x=>x.trim());
    if(parts.length>=3){const [kind,label,...rest]=parts;const url=rest.join("|").trim();return {label,url,kind};}
    const match=line.match(/https:\/\/\S+/i);if(!match)throw new Error(`Source line needs an HTTPS URL: ${line}`);
    return {label:line.slice(0,match.index).replace(/[\s:—–-]+$/g,"").trim()||new URL(match[0]).hostname,url:match[0],kind:"Reference"};
  });
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function currentCandidate(){
  const d=uq("#updateEditorDialog");
  return {
    date:uq('[name="date"]',d).value.trim(),dateLabel:uq('[name="dateLabel"]',d).value.trim(),title:uq('[name="title"]',d).value.trim(),org:uq('[name="org"]',d).value.trim(),
    evidence:uq('[name="evidence"]',d).value,category:uq('[name="category"]',d).value,impact:Number(uq('[name="impact"]',d).value),confidence:uq('[name="confidence"]',d).value,
    summary:uq('[name="summary"]',d).value.trim(),why:uq('[name="why"]',d).value.trim(),caveat:uq('[name="caveat"]',d).value.trim(),
    themes:parseList(uq('[name="themes"]',d).value),tags:parseList(uq('[name="tags"]',d).value),sources:parseSourceLines(uq('[name="sources"]',d).value)
  };
}
function buildPatch(){
  if(!selectedEvent)return {};
  const candidate=currentCandidate(),changes={};
  for(const [key] of UPDATE_FIELDS)if(!same(candidate[key],selectedEvent[key]))changes[key]=candidate[key];
  return changes;
}
function changedLabels(changes){return UPDATE_FIELDS.filter(([key])=>Object.hasOwn(changes,key)).map(([,label])=>label);}
function renderDiff(){
  const box=uq("#updateDiff");if(!box||!selectedEvent)return;
  try{
    const changes=buildPatch(),labels=changedLabels(changes);
    box.innerHTML=labels.length?`<strong>${labels.length} field${labels.length===1?"":"s"} changed</strong><span>${labels.map(htmlEscape).join(" · ")}</span>`:`<strong>No changes yet</strong><span>Edit only the fields that need to change. Unchanged fields will not be included in the GitHub patch.</span>`;
    box.classList.toggle("ready",labels.length>0);
  }catch(error){box.innerHTML=`<strong>Check the form</strong><span>${htmlEscape(error.message)}</span>`;box.classList.remove("ready");}
}
function formOptions(items,current){return items.map(x=>`<option value="${htmlEscape(x)}" ${x===current?"selected":""}>${htmlEscape(x)}</option>`).join("");}
function populateEditor(event){
  selectedEvent=event;
  const d=uq("#updateEditorDialog");
  uq("#updateSelectedTitle",d).textContent=event.title;
  uq("#updateSelectedMeta",d).textContent=`${event.dateLabel} · ${event.evidence} · ${event.org}`;
  uq('[name="date"]',d).value=event.date;uq('[name="dateLabel"]',d).value=event.dateLabel;uq('[name="title"]',d).value=event.title;uq('[name="org"]',d).value=event.org;
  uq('[name="evidence"]',d).innerHTML=formOptions(updateConfig.evidenceOrder||[...new Set(updateEvents.map(x=>x.evidence))],event.evidence);
  uq('[name="category"]',d).innerHTML=formOptions(updateConfig.categories||[...new Set(updateEvents.map(x=>x.category))].sort(),event.category);
  uq('[name="impact"]',d).value=String(event.impact);uq('[name="confidence"]',d).innerHTML=formOptions(updateConfig.confidenceOrder||["High","Medium","Low"],event.confidence);
  uq('[name="summary"]',d).value=event.summary;uq('[name="why"]',d).value=event.why;uq('[name="caveat"]',d).value=event.caveat;
  uq('[name="themes"]',d).value=(event.themes||[]).join(", ");uq('[name="tags"]',d).value=(event.tags||[]).join(", ");uq('[name="sources"]',d).value=sourceLines(event);
  uq('[name="verificationSources"]',d).value=(event.sources||[]).map(x=>x.url).join("\n");
  uq('[name="reason"]',d).value="";uq('[name="implications"]',d).value="";
  uq("#updateSearchPanel",d).classList.add("hidden");uq("#updateEditPanel",d).classList.remove("hidden");renderDiff();
}
function renderSearchResults(query=""){
  const list=uq("#updateSearchResults");if(!list)return;
  const q=query.trim().toLowerCase();
  const matches=updateEvents.filter(event=>!q||[event.title,event.org,event.dateLabel,event.evidence,event.category,...(event.tags||[])].join(" ").toLowerCase().includes(q)).slice(0,30);
  list.innerHTML=matches.map(event=>`<button type="button" class="update-result" data-update-select="${htmlEscape(event.id)}"><time>${htmlEscape(event.dateLabel)} · ${htmlEscape(event.evidence)}</time><b>${htmlEscape(event.title)}</b><span>${htmlEscape(event.org)}</span></button>`).join("")||`<div class="update-empty">No incidents match that search.</div>`;
}
function resetToSearch(){selectedEvent=null;const d=uq("#updateEditorDialog");uq("#updateEditPanel",d).classList.add("hidden");uq("#updateSearchPanel",d).classList.remove("hidden");const input=uq("#updateSearch",d);input.value="";renderSearchResults();setTimeout(()=>input.focus(),20);}
function openUpdateEditor(id=null){
  const d=uq("#updateEditorDialog");if(!d)return;
  if(id){const event=updateEvents.find(x=>x.id===id);if(event)populateEditor(event);else resetToSearch();}
  else resetToSearch();
  if(uq("#detailDialog")?.open)uq("#detailDialog .close")?.click();
  if(!d.open)d.showModal();
}
function validateCandidate(candidate){
  const required=["date","dateLabel","title","org","evidence","category","confidence","summary","why","caveat"];
  for(const key of required)if(!String(candidate[key]??"").trim())throw new Error(`${key} cannot be empty.`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date))throw new Error("Event date must use YYYY-MM-DD.");
  if(!candidate.tags.length)throw new Error("Keep at least one tag.");
  if(!candidate.themes.length)throw new Error("Keep at least one Atlas theme.");
  if(!candidate.sources.length)throw new Error("Keep at least one source.");
  for(const source of candidate.sources){if(!/^https:\/\//i.test(source.url))throw new Error(`Source URL must use HTTPS: ${source.url}`);}
}
function buildGithubUrl(){
  if(!selectedEvent)throw new Error("Select an incident first.");
  const d=uq("#updateEditorDialog"),candidate=currentCandidate();validateCandidate(candidate);
  const changes=buildPatch(),labels=changedLabels(changes);if(!labels.length)throw new Error("Make at least one change before submitting.");
  const reason=uq('[name="reason"]',d).value.trim();if(!reason)throw new Error("Explain why the update is needed.");
  const verificationSources=uq('[name="verificationSources"]',d).value.trim();if(!verificationSources)throw new Error("Add at least one verification source URL.");
  const repo=inferRepo();if(!repo)throw new Error("The GitHub repository URL is not configured for this deployment.");
  const patchJson=JSON.stringify({incidentId:selectedEvent.id,changes},null,2);
  const summary=`Change ${labels.join(", ")}. The machine-readable patch below contains only fields that differ from the current Atlas record.`;
  const params=new URLSearchParams({template:"update_incident.yml",title:`[Update incident]: ${selectedEvent.title}`,existing_incident:selectedEvent.title,incident_id:selectedEvent.id,fields_changed:labels.join(", "),problem:reason,proposed_change:summary,patch_json:patchJson,sources:verificationSources,implications:uq('[name="implications"]',d).value.trim()});
  const url=`${repo}/issues/new?${params.toString()}`;
  if(url.length>7800)throw new Error("This update is too large to prefill safely in a GitHub URL. Reduce the change to the relevant fields or split it into two update issues.");
  return url;
}
function submitUpdate(){
  try{const url=buildGithubUrl();window.open(url,"_blank","noopener,noreferrer");}
  catch(error){const box=uq("#updateError");box.textContent=error.message;box.classList.add("show");}
}
function createDialog(){
  if(uq("#updateEditorDialog"))return;
  const dialog=document.createElement("dialog");dialog.id="updateEditorDialog";dialog.innerHTML=`
    <div class="update-head"><div><div class="update-kicker">Community correction workflow</div><h2>Suggest an incident update</h2><p>Edit the existing record here. The Atlas will send only the changed fields to GitHub for verification.</p></div><button class="close" id="updateClose" aria-label="Close update editor">×</button></div>
    <div class="update-body">
      <section id="updateSearchPanel"><label class="update-label" for="updateSearch">Find an incident</label><input id="updateSearch" class="update-input" type="search" placeholder="Search title, organization, tag, date…"><div id="updateSearchResults" class="update-results"></div></section>
      <section id="updateEditPanel" class="hidden">
        <div class="update-selected"><div><strong id="updateSelectedTitle"></strong><span id="updateSelectedMeta"></span></div><button type="button" class="mini" id="changeUpdateIncident">Change incident</button></div>
        <div class="update-grid">
          <label><span>Date</span><input name="date" type="date"></label><label><span>Display date</span><input name="dateLabel"></label>
          <label class="wide"><span>Title</span><input name="title"></label><label class="wide"><span>Organization / model / person</span><input name="org"></label>
          <label><span>Evidence</span><select name="evidence"></select></label><label><span>Category</span><select name="category"></select></label><label><span>Impact</span><select name="impact">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join("")}</select></label><label><span>Confidence</span><select name="confidence"></select></label>
          <label class="wide"><span>What happened</span><textarea name="summary" rows="5"></textarea></label><label class="wide"><span>Why it matters</span><textarea name="why" rows="4"></textarea></label><label class="wide"><span>Caveat / interpretation</span><textarea name="caveat" rows="4"></textarea></label>
          <label class="wide"><span>Themes <small>comma separated</small></span><input name="themes"></label><label class="wide"><span>Tags <small>comma separated</small></span><input name="tags"></label>
          <label class="wide"><span>Sources <small>one per line: Kind | Label | https://…</small></span><textarea name="sources" rows="5"></textarea></label>
        </div>
        <div id="updateDiff" class="update-diff"></div>
        <div class="update-evidence">
          <label><span>Why is this update needed?</span><textarea name="reason" rows="3" placeholder="What is wrong, incomplete, or newly established?" required></textarea></label>
          <label><span>Evidence supporting the update</span><textarea name="verificationSources" rows="3" placeholder="One HTTPS URL per line" required></textarea></label>
          <label><span>Does this change the interpretation or classification? <small>optional</small></span><textarea name="implications" rows="2"></textarea></label>
        </div>
        <div id="updateError" class="update-error"></div>
        <div class="update-actions"><button type="button" class="softbtn" id="cancelUpdate">Cancel</button><button type="button" class="primarybtn" id="submitUpdate">Open prefilled GitHub issue ↗</button></div>
      </section>
    </div>`;
  document.body.appendChild(dialog);
  uq("#updateClose",dialog).onclick=()=>dialog.close();uq("#cancelUpdate",dialog).onclick=()=>dialog.close();uq("#changeUpdateIncident",dialog).onclick=resetToSearch;uq("#submitUpdate",dialog).onclick=submitUpdate;
  uq("#updateSearch",dialog).addEventListener("input",event=>renderSearchResults(event.target.value));
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();const choice=event.target.closest("[data-update-select]");if(choice)populateEditor(updateEvents.find(x=>x.id===choice.dataset.updateSelect));});
  dialog.addEventListener("input",()=>{uq("#updateError",dialog).classList.remove("show");if(selectedEvent)renderDiff();});
}
function injectModalButton(){
  const actions=uq("#detailDialog .modal-actions");if(!actions||uq("#suggestUpdateBtn",actions))return;
  const button=document.createElement("button");button.type="button";button.className="softbtn";button.id="suggestUpdateBtn";button.textContent="Suggest an update ↗";
  button.onclick=()=>{const match=location.hash.match(/event=([^&]+)/);const id=match?decodeURIComponent(match[1]):null;openUpdateEditor(id);};actions.appendChild(button);
}
function bindEntryPoints(){
  document.addEventListener("click",event=>{const link=event.target.closest("#updateIncidentLink");if(link){event.preventDefault();openUpdateEditor();}});
  const observer=new MutationObserver(()=>injectModalButton());const body=uq("#modalBody");if(body)observer.observe(body,{childList:true,subtree:true});injectModalButton();
}
async function initUpdateEditor(){
  try{[updateEvents,updateConfig]=await Promise.all([updateFetchJson("./data/incidents.json"),updateFetchJson("./data/site.json")]);createDialog();renderSearchResults();bindEntryPoints();}
  catch(error){console.error("Update editor unavailable",error);}
}

initUpdateEditor();
