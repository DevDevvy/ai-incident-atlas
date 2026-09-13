import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const root=process.cwd(), dist=path.join(root,"dist");
execFileSync(process.execPath,[path.join(root,"scripts/validate-data.mjs")],{stdio:"inherit"});
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
const copy=(src,dst=src)=>{const from=path.join(root,src),to=path.join(dist,dst);fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
for(const item of ["index.html","404.html","robots.txt","manifest.webmanifest","assets","data","docs"])copy(item);

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

fs.writeFileSync(path.join(dist,".nojekyll"),"");
if(fs.existsSync(path.join(root,"CNAME")))copy("CNAME");
console.log("✓ Built static site into dist/");
