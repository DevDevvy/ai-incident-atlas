import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root=process.cwd(), dist=path.join(root,"dist");
execFileSync(process.execPath,[path.join(root,"scripts/validate-data.mjs")],{stdio:"inherit"});
fs.rmSync(dist,{recursive:true,force:true});fs.mkdirSync(dist,{recursive:true});
const copy=(src,dst=src)=>{const from=path.join(root,src),to=path.join(dist,dst);fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{recursive:true});};
for(const item of ["index.html","404.html","robots.txt","manifest.webmanifest","assets","data","docs"])copy(item);
fs.writeFileSync(path.join(dist,".nojekyll"),"");
if(fs.existsSync(path.join(root,"CNAME")))copy("CNAME");
console.log("✓ Built static site into dist/");

