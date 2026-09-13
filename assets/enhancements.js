"use strict";

const paletteFallback={
  "REAL":"#72b8ff","EVAL":"#75e6ca","EVAL → REAL":"#ff9e6a","GOV":"#c99cff",
  "LEGAL":"#ffc76d","MISUSE":"#ff7181","POLICY":"#8fa9ff","CONTESTED":"#e8b36b"
};

const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??false;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function getJson(url){const r=await fetch(url,{cache:"no-cache"});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();}
function dateTime(date){return new Date(`${date}T00:00:00Z`).getTime();}
function inferRepo(){
  const host=location.hostname.toLowerCase();
  if(host.endsWith(".github.io")){const owner=host.slice(0,-".github.io".length),repo=location.pathname.split("/").filter(Boolean)[0];if(owner&&repo)return `https://github.com/${owner}/${repo}`;}
  return "https://github.com/DevDevvy/ai-incident-atlas";
}

function openTimelineIncident(id){
  document.querySelector('[data-view="timeline"]')?.click();
  let tries=0;
  const locate=()=>{
    const target=document.querySelector(`.card[data-open="${CSS.escape(id)}"]`);
    if(target){target.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"center"});target.classList.add("overview-target");setTimeout(()=>target.classList.remove("overview-target"),1400);return;}
    if(tries++<14)setTimeout(locate,70);
  };
  setTimeout(locate,70);
}

function overviewLayout(events,min,max,width){
  const pad=26,usable=width-pad*2,minGap=20;
  const laneY=[22,42,62,82,102];
  const laneOrder=[2,1,3,0,4];
  const lastX=Array(laneY.length).fill(-Infinity);
  return events.map(event=>{
    const normalized=max===min?0.5:(dateTime(event.date)-min)/(max-min);
    const rawX=pad+normalized*usable;
    let lane=laneOrder.find(index=>rawX-lastX[index]>=minGap);
    let x=rawX;
    if(lane===undefined){
      lane=laneOrder.reduce((best,index)=>lastX[index]<lastX[best]?index:best,laneOrder[0]);
      x=Math.min(width-pad,lastX[lane]+minGap);
    }
    lastX[lane]=x;
    return {event,x,y:laneY[lane],lane};
  });
}

function renderOverview(events,config){
  const overview=document.querySelector("#overviewTimeline"),timeline=overview?.closest(".overview-timeline");
  if(!overview||!timeline)return;
  const palette={...paletteFallback,...(config.palette||{})};
  const sorted=[...events].sort((a,b)=>a.date.localeCompare(b.date));
  const min=dateTime(sorted[0].date),max=dateTime(sorted.at(-1).date);
  const years=[...new Set(sorted.map(e=>Number(e.date.slice(0,4))))];
  const legend=(config.evidenceOrder||Object.keys(paletteFallback)).filter(x=>sorted.some(e=>e.evidence===x)).slice(0,8);
  const width=Math.max(1120,Math.min(1900,sorted.length*22));
  const axisY=68;
  const layout=overviewLayout(sorted,min,max,width);

  timeline.style.width=`${width}px`;
  timeline.style.minWidth=`${width}px`;
  document.querySelector("#overviewLegend").innerHTML=legend.map(type=>`<span><i style="--legend:${esc(palette[type]||"#8fa9ff")}"></i>${esc(type)}</span>`).join("");
  document.querySelector("#overviewYears").innerHTML=years.map(year=>{
    const x=26+((dateTime(`${year}-01-01`)-min)/(max-min))*(width-52);
    return `<span class="overview-year" style="left:${Math.max(26,Math.min(width-26,x))}px">${year}</span>`;
  }).join("");

  document.querySelector(".overview-stems")?.remove();
  const stems=[];
  overview.innerHTML=layout.map(({event,x,y},index)=>{
    const dot=palette[event.evidence]||"#8fa9ff",major=event.impact>=5;
    const radius=major?8.5:6.5,center=y+radius;
    if(Math.abs(center-axisY)>2)stems.push(`<span class="overview-stem" style="left:${x}px;top:${Math.min(center,axisY)}px;height:${Math.abs(center-axisY)}px;--dot:${esc(dot)};--delay:${Math.min(index*7,520)}ms"></span>`);
    return `<button class="overview-dot${major?" major":""}" style="left:${x}px;top:${y}px;--dot:${esc(dot)};--delay:${Math.min(index*7,520)}ms" data-overview-id="${esc(event.id)}" data-overview-index="${index}" title="${esc(event.dateLabel)} · ${esc(event.evidence)} · ${esc(event.title)}" aria-label="${esc(event.dateLabel)}. ${esc(event.evidence)}. ${esc(event.title)}"></button>`;
  }).join("");
  overview.insertAdjacentHTML("beforebegin",`<div class="overview-stems" aria-hidden="true">${stems.join("")}</div>`);

  const count=document.querySelector("#overviewCount"),hint=document.querySelector(".overview-summary .hint");
  const defaultHint=innerWidth<=760?"Swipe horizontally. Tap a node to jump into the full timeline.":"Scroll horizontally and click a node to jump into the full timeline.";
  count.textContent=`${events.length} documented events across ${years.length} years`;
  hint.textContent=defaultHint;
  hint.id="overviewHint";

  const nodes=[...document.querySelectorAll("[data-overview-id]")];
  nodes.forEach((button,index)=>{
    const event=sorted[index];
    button.addEventListener("click",()=>openTimelineIncident(button.dataset.overviewId));
    const show=()=>{hint.textContent=`${event.dateLabel} · ${event.evidence} · ${event.title}`;hint.classList.add("is-preview");};
    const reset=()=>{hint.textContent=defaultHint;hint.classList.remove("is-preview");};
    button.addEventListener("mouseenter",show);button.addEventListener("focus",show);button.addEventListener("mouseleave",reset);button.addEventListener("blur",reset);
    button.addEventListener("keydown",eventKey=>{
      let next=null;
      if(eventKey.key==="ArrowRight")next=nodes[index+1];
      else if(eventKey.key==="ArrowLeft")next=nodes[index-1];
      else if(eventKey.key==="Home")next=nodes[0];
      else if(eventKey.key==="End")next=nodes.at(-1);
      if(next){eventKey.preventDefault();next.focus();next.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"nearest",inline:"center"});}
    });
  });

  const scroller=document.querySelector(".overview-scroll");
  const syncEdges=()=>{if(!scroller)return;scroller.classList.toggle("at-start",scroller.scrollLeft<8);scroller.classList.toggle("at-end",scroller.scrollLeft+scroller.clientWidth>=scroller.scrollWidth-8);};
  scroller?.addEventListener("scroll",syncEdges,{passive:true});syncEdges();
  requestAnimationFrame(()=>document.querySelector(".atlas-overview")?.classList.add("overview-ready"));
}

function animateNumber(element,target,duration=650){
  if(!element)return;
  if(reducedMotion){element.textContent=target;return;}
  const start=performance.now();
  const tick=now=>{const p=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-p,3);element.textContent=Math.round(target*eased);if(p<1)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}

function animateStats(events){
  const values={
    statTotal:events.length,
    statCross:events.filter(e=>e.evidence==="EVAL → REAL").length,
    statEval:events.filter(e=>e.evidence==="EVAL").length,
    statGov:events.filter(e=>e.evidence==="GOV"||e.evidence==="POLICY").length,
    statSources:events.reduce((n,e)=>n+(e.sources?.length||0),0)
  };
  Object.entries(values).forEach(([id,value],index)=>setTimeout(()=>animateNumber(document.getElementById(id),value),reducedMotion?0:index*45));
}

function setupYearBarMotion(){
  const bars=document.querySelector("#yearBars");if(!bars)return;
  const activate=()=>{if(bars.querySelector(".barfill")){bars.classList.add("motion-ready");return true;}return false;};
  if(activate())return;
  const observer=new MutationObserver(()=>{if(activate())observer.disconnect();});observer.observe(bars,{childList:true,subtree:true});
}

function setupScrollReveal(){
  if(reducedMotion)return;
  document.body.classList.add("motion-enabled");
  const selector=".stage,.latest-item,.workflow-step,.theme-card,.health,.method-card,.contribute-grid,.event";
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}}),{threshold:.08,rootMargin:"0px 0px -28px"});
  const register=root=>{
    const items=[];
    if(root instanceof Element&&root.matches(selector))items.push(root);
    root.querySelectorAll?.(selector).forEach(item=>items.push(item));
    items.forEach((item,index)=>{if(item.dataset.motionObserved)return;item.dataset.motionObserved="1";item.classList.add("motion-reveal");item.style.setProperty("--reveal-delay",`${Math.min(index%6*35,175)}ms`);observer.observe(item);});
  };
  register(document);
  const mutations=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof Element)register(node);})));mutations.observe(document.body,{childList:true,subtree:true});
}

function setupFilterSidebar(){
  const workspace=document.querySelector(".workspace"),sidebar=document.querySelector("#sidebar"),content=workspace?.querySelector(".content");
  if(!workspace||!sidebar||!content)return;

  const header=document.createElement("div");
  header.className="filter-sidebar-head";
  header.innerHTML='<div><strong>Research filters</strong><span>Refine what is shown</span></div><button type="button" class="mini filter-collapse" aria-label="Collapse filters" title="Collapse filters">←</button>';
  sidebar.prepend(header);

  const reopen=document.createElement("button");
  reopen.type="button";
  reopen.className="softbtn filter-reopen";
  reopen.innerHTML='<span aria-hidden="true">☰</span><span>Filters</span>';
  reopen.setAttribute("aria-label","Show research filters");
  Object.assign(reopen.style,{position:"fixed",left:"14px",top:"82px",zIndex:"48",display:"none",alignItems:"center",gap:"7px",boxShadow:"0 10px 34px rgba(0,0,0,.28)"});
  document.body.appendChild(reopen);

  const storageKey="aiIncidentAtlas:filtersCollapsed";
  const setCollapsed=(collapsed,persist=true)=>{
    if(innerWidth<=800)collapsed=false;
    workspace.classList.toggle("filters-collapsed",collapsed);
    sidebar.setAttribute("aria-hidden",collapsed?"true":"false");
    header.querySelector(".filter-collapse").setAttribute("aria-expanded",collapsed?"false":"true");
    reopen.setAttribute("aria-expanded",collapsed?"false":"true");

    if(collapsed){
      workspace.style.gridTemplateColumns="minmax(0,1fr)";
      workspace.style.gap="0";
      content.style.gridColumn="1 / -1";
      reopen.style.display="inline-flex";
    }else{
      workspace.style.gridTemplateColumns="";
      workspace.style.gap="";
      content.style.gridColumn="";
      reopen.style.display="none";
    }

    if(persist)try{localStorage.setItem(storageKey,collapsed?"1":"0");}catch{}
  };

  let initial=false;try{initial=localStorage.getItem(storageKey)==="1";}catch{}
  setCollapsed(initial,false);
  header.querySelector(".filter-collapse").addEventListener("click",()=>setCollapsed(true));
  reopen.addEventListener("click",()=>setCollapsed(false));
  addEventListener("resize",()=>{
    if(innerWidth<=800){
      workspace.classList.remove("filters-collapsed");
      workspace.style.gridTemplateColumns="";
      workspace.style.gap="";
      content.style.gridColumn="";
      reopen.style.display="none";
      sidebar.removeAttribute("aria-hidden");
    }else{
      let collapsed=false;try{collapsed=localStorage.getItem(storageKey)==="1";}catch{}
      setCollapsed(collapsed,false);
    }
  });

  const sections=[...sidebar.querySelectorAll(".filter-section")];
  sections.forEach((section,index)=>{
    const title=section.querySelector(".filter-title");if(!title)return;
    title.classList.add("filter-title-collapsible");
    title.setAttribute("role","button");title.setAttribute("tabindex","0");title.setAttribute("aria-expanded","true");
    const toggle=()=>{
      const collapsed=section.classList.toggle("filter-section-collapsed");
      title.setAttribute("aria-expanded",collapsed?"false":"true");
    };
    title.addEventListener("click",event=>{if(event.target.closest("button,[data-clear]"))return;toggle();});
    title.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&!event.target.closest("button")){event.preventDefault();toggle();}});
    if(index===2||index===3)section.classList.add("filter-section-default-compact");
  });
}

function setupInteractionPolish(){
  const topbar=document.querySelector(".topbar");
  const syncTopbar=()=>topbar?.classList.toggle("is-scrolled",scrollY>10);
  addEventListener("scroll",syncTopbar,{passive:true});syncTopbar();

  const syncNav=()=>document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute("aria-pressed",button.classList.contains("active")?"true":"false"));
  document.addEventListener("click",event=>{if(event.target.closest('[data-view]'))setTimeout(syncNav,0);});syncNav();
}

async function renderEnhancements(){
  const overview=document.querySelector("#overviewTimeline");if(!overview)return;
  setupInteractionPolish();setupYearBarMotion();setupScrollReveal();setupFilterSidebar();
  try{
    const [events,config]=await Promise.all([getJson("./data/incidents.json"),getJson("./data/site.json")]);
    renderOverview(events,config);animateStats(events);
    const repo=(config.repositoryUrl||inferRepo()).replace(/\/$/,"");
    document.querySelectorAll("[data-workflow-link]").forEach(link=>{link.href=link.dataset.workflowLink==="issues"?`${repo}/issues/new/choose`:repo;link.target="_blank";link.rel="noopener noreferrer";});
  }catch(error){console.warn("Visual overview enhancement unavailable",error);document.querySelector("#overviewCount").textContent="Timeline overview unavailable";}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderEnhancements,{once:true});else renderEnhancements();
