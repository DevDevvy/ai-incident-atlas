import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root=process.cwd(), dist=path.join(root,"dist");
const socialCardPath="assets/social-card-v2.jpg";
const readJpegDimensions=filePath=>{
  const image=fs.readFileSync(filePath);
  if(image[0]!==0xff||image[1]!==0xd8)throw new Error(`${socialCardPath} is not a JPEG`);
  for(let offset=2;offset+8<image.length;){
    if(image[offset]!==0xff){offset+=1;continue;}
    const marker=image[offset+1];
    const segmentLength=image.readUInt16BE(offset+2);
    if(marker>=0xc0&&marker<=0xc3){
      return {height:image.readUInt16BE(offset+5),width:image.readUInt16BE(offset+7)};
    }
    if(segmentLength<2)break;
    offset+=2+segmentLength;
  }
  throw new Error(`Could not read dimensions from ${socialCardPath}`);
};
execFileSync(process.execPath,[path.join(root,"scripts/validate-data.mjs")],{stdio:"inherit"});
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
const copy=(src,dst=src)=>{const from=path.join(root,src),to=path.join(dist,dst);fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
for(const item of ["index.html","404.html","robots.txt","manifest.webmanifest","assets","data","docs"])copy(item);

const site=JSON.parse(fs.readFileSync(path.join(root,"data","site.json"),"utf8"));
const canonicalUrl=String(site.canonicalUrl||"").trim();
if(!canonicalUrl)throw new Error("Set canonicalUrl in data/site.json before building");
const parsedCanonical=new URL(canonicalUrl);
if(parsedCanonical.protocol!=="https:")throw new Error("canonicalUrl must use HTTPS");
const socialImageUrl=new URL(socialCardPath,parsedCanonical).href;
const builtSocialCard=path.join(dist,socialCardPath);
if(!fs.existsSync(builtSocialCard))throw new Error(`Static build is missing ${socialCardPath}`);
const socialDimensions=readJpegDimensions(builtSocialCard);
if(socialDimensions.width!==1200||socialDimensions.height!==630){
  throw new Error(`${socialCardPath} must be 1200x630, found ${socialDimensions.width}x${socialDimensions.height}`);
}

const indexHtml=fs.readFileSync(path.join(dist,"index.html"),"utf8");
const requiredSocialMarkup=[
  `<link rel="canonical" href="${canonicalUrl}">`,
  `<meta property="og:url" content="${canonicalUrl}">`,
  `<meta property="og:image" content="${socialImageUrl}">`,
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta name="twitter:card" content="summary_large_image">',
  `<meta name="twitter:image" content="${socialImageUrl}">`
];
for(const markup of requiredSocialMarkup){
  if(!indexHtml.includes(markup))throw new Error(`Missing social metadata: ${markup}`);
}

fs.writeFileSync(path.join(dist,".nojekyll"),"");
const cnamePath=path.join(root,"CNAME");
if(fs.existsSync(cnamePath))copy("CNAME");
console.log(`✓ Built static site into dist/ for ${canonicalUrl}`);
