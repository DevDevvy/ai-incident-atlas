"use strict";

const paletteFallback={
  "REAL":"#72b8ff","EVAL":"#75e6ca","EVAL → REAL":"#ff9e6a","GOV":"#c99cff",
  "LEGAL":"#ffc76d","MISUSE":"#ff7181","POLICY":"#8fa9ff","CONTESTED":"#e8b36b"
};

const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function getJson(url){const r=await fetch(url,{cache:"no-cache"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}

function positionForDate(date,min,max){const t=new Date(`${date}T00:00:00Z`).getTime();return ((t-min)/(max-min))*100;}

function yearStart(year){return new Date(`${year}-01-01T00:00:00Z`).getTime();}

function openTimelineIncident(id){
  document.querySelector('[data-view="timeline"]')?.click();
  let tries=0;
  const locate=()=>{
    const target=document.querySelector(`.card[data-open="${CSS.escape(id)}"]`);
    if(target){target.scrollIntoView({behavior:"smooth",block:"center"});target.classList.add("overview-target");setTimeout(()=>target.classList.remove("overview-target"),1300);return;}
    if(tries++<12)setTimeout(locate,80);
  };
  setTimeout(locate,80);
}

function inferRepo(){
  const host=location.hostname.toLowerCase();
  if(host.endsWith(".github.io")){const owner=host.slice(0,-".github.io".length),repo=location.pathname.split("/").filter(Boolean)[0];if(owner&&repo)return `https://github.com/${owner}/${repo}`;}
  return "https://github.com/DevDevvy/ai-incident-atlas";
}

async function renderEnhancements(){
  const overview=document.querySelector("#overviewTimeline");
  if(!overview)return;
  try{
    const [events,config]=await Promise.all([getJson("./data/incidents.json"),getJson("./data/site.json")]);
    const palette={...paletteFallback,...(config.palette||{})};
    const sorted=[...events].sort((a,b)=>a.date.localeCompare(b.date));
    const min=new Date(`${sorted[0].date}T00:00:00Z`).getTime();
    const max=new Date(`${sorted.at(-1).date}T00:00:00Z`).getTime();
    const years=[...new Set(sorted.map(e=>Number(e.date.slice(0,4))))];
    const legend=(config.evidenceOrder||Object.keys(paletteFallback)).filter(x=>sorted.some(e=>e.evidence===x)).slice(0,6);

    document.querySelector("#overviewLegend").innerHTML=legend.map(type=>`<span><i style="--legend:${esc(palette[type]||"#8fa9ff")}"></i>${esc(type)}</span>`).join("");
    document.querySelector("#overviewYears").innerHTML=years.map(year=>{const left=((yearStart(year)-min)/(max-min))*100;return `<span class="overview-year" style="left:${Math.max(0,Math.min(100,left))}%">${year}</span>`;}).join("");
    overview.innerHTML=sorted.map((event,index)=>{
      const left=positionForDate(event.date,min,max),dot=palette[event.evidence]||"#8fa9ff";
      const major=event.impact>=5?" major":"";
      return `<button class="overview-dot${major}" style="left:${left}%;--dot:${esc(dot)}" data-overview-id="${esc(event.id)}" title="${esc(event.dateLabel)} · ${esc(event.evidence)} · ${esc(event.title)}" aria-label="Open ${esc(event.title)}"></button>`;
    }).join("");
    document.querySelector("#overviewCount").textContent=`${events.length} documented events across ${years.length} years`;
    document.querySelectorAll("[data-overview-id]").forEach(button=>button.addEventListener("click",()=>openTimelineIncident(button.dataset.overviewId)));

    const repo=(config.repositoryUrl||inferRepo()).replace(/\/$/,"");
    document.querySelectorAll("[data-workflow-link]").forEach(link=>{link.href=link.dataset.workflowLink==="issues"?`${repo}/issues/new/choose`:repo;link.target="_blank";link.rel="noopener noreferrer";});
  }catch(error){console.warn("Visual overview enhancement unavailable",error);document.querySelector("#overviewCount").textContent="Timeline overview unavailable";}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderEnhancements,{once:true});else renderEnhancements();
