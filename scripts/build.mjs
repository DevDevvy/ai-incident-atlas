import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const root=process.cwd(), dist=path.join(root,"dist");
execFileSync(process.execPath,[path.join(root,"scripts/validate-data.mjs")],{stdio:"inherit"});
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
const copy=(src,dst=src)=>{const from=path.join(root,src),to=path.join(dist,dst);fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
for(const item of ["index.html","404.html","robots.txt","manifest.webmanifest","assets","data","docs"])copy(item);

const site=JSON.parse(fs.readFileSync(path.join(root,"data","site.json"),"utf8"));
const ensureSlash=value=>value.endsWith("/")?value:`${value}/`;
const configuredCanonical=String(site.canonicalUrl||"").trim();
const cnamePath=path.join(root,"CNAME");
const cname=fs.existsSync(cnamePath)?fs.readFileSync(cnamePath,"utf8").trim():"";
let canonicalUrl=configuredCanonical;
if(!canonicalUrl&&cname)canonicalUrl=`https://${cname}`;
if(!canonicalUrl&&process.env.GITHUB_REPOSITORY){
  const [owner,repo]=process.env.GITHUB_REPOSITORY.split("/");
  if(owner&&repo){
    canonicalUrl=repo.toLowerCase()===`${owner.toLowerCase()}.github.io`
      ? `https://${owner}.github.io`
      : `https://${owner}.github.io/${repo}`;
  }
}
if(!canonicalUrl)canonicalUrl="http://localhost:8000";
canonicalUrl=ensureSlash(canonicalUrl.replace(/\/+$/,""));

const socialSource=path.join(root,"scripts","social-card");
const socialChunks=fs.readdirSync(socialSource)
  .filter(name=>/^chunk-\d+\.txt$/.test(name))
  .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
if(!socialChunks.length)throw new Error("No social-card source chunks found");
const socialBase64=socialChunks.map(name=>fs.readFileSync(path.join(socialSource,name),"utf8").trim()).join("");
const socialCard=Buffer.from(socialBase64,"base64");
const socialHash=crypto.createHash("sha256").update(socialCard).digest("hex");
const expectedSocialHash="684d55e8d0fa514b5629b1196b35e6a0439321b95261eff7ca9eb8a56657fa8f";
if(socialHash!==expectedSocialHash)throw new Error(`Social card checksum mismatch: ${socialHash}`);
fs.writeFileSync(path.join(dist,"assets","social-card.jpg"),socialCard);

const socialImageUrl=new URL("assets/social-card.jpg",canonicalUrl).href;
const indexPath=path.join(dist,"index.html");
const oldSocialMeta=`<meta name="description" content="A sourced interactive research atlas of major AI incidents, evaluations, controversies, resignations, governance failures, misuse cases, and real-world agent boundary crossings.">\n<meta property="og:type" content="website">\n<meta property="og:title" content="AI Incident Atlas">\n<meta property="og:description" content="Explore how AI risk changed from hallucinations and deepfakes to deception evaluations, agentic specification gaming, and real-world boundary crossings.">\n<meta name="twitter:card" content="summary">`;
const newSocialMeta=`<meta name="description" content="An open-source interactive research atlas of major AI incidents, safety events, governance controversies, misuse cases, and real-world agent boundary crossings.">\n<link rel="canonical" href="${canonicalUrl}">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="AI Incident Atlas">\n<meta property="og:url" content="${canonicalUrl}">\n<meta property="og:title" content="AI Incident Atlas">\n<meta property="og:description" content="An open-source timeline of major AI incidents, safety events, governance controversies, and real-world agent behavior.">\n<meta property="og:image" content="${socialImageUrl}">\n<meta property="og:image:secure_url" content="${socialImageUrl}">\n<meta property="og:image:type" content="image/jpeg">\n<meta property="og:image:width" content="600">\n<meta property="og:image:height" content="315">\n<meta property="og:image:alt" content="AI Incident Atlas branded share card showing the research timeline, contribution form, and incident detail interface.">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="AI Incident Atlas">\n<meta name="twitter:description" content="An open-source timeline of major AI incidents, safety events, governance controversies, and real-world agent behavior.">\n<meta name="twitter:image" content="${socialImageUrl}">\n<meta name="twitter:image:alt" content="AI Incident Atlas branded share card showing the research timeline, contribution form, and incident detail interface.">`;
const indexHtml=fs.readFileSync(indexPath,"utf8");
if(!indexHtml.includes(oldSocialMeta))throw new Error("Expected social metadata block was not found in index.html");
fs.writeFileSync(indexPath,indexHtml.replace(oldSocialMeta,newSocialMeta));

fs.writeFileSync(path.join(dist,".nojekyll"),"");
if(fs.existsSync(cnamePath))copy("CNAME");
console.log(`✓ Built static site into dist/ for ${canonicalUrl}`);
