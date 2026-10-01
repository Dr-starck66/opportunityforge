#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const manifest=".astra-green-release.blobsha";
if(!fs.existsSync(manifest)){
  console.error("ASTRA_GREEN_TOKEN_BLOCKED: missing "+manifest);
  process.exit(78);
}
const lines=fs.readFileSync(manifest,"utf8").split(/?
/).map(x=>x.trim()).filter(Boolean);
if(!lines.length){
  console.error("ASTRA_GREEN_TOKEN_BLOCKED: empty manifest");
  process.exit(78);
}
for(const line of lines){
  const m=line.match(/^([0-9a-f]{40})s+(.+)$/i);
  if(!m){
    console.error("ASTRA_GREEN_TOKEN_BLOCKED: malformed line "+line);
    process.exit(78);
  }
  const expected=m[1].toLowerCase();
  const file=m[2].trim();
  if(!fs.existsSync(file)){
    console.error("ASTRA_GREEN_TOKEN_BLOCKED: missing "+file);
    process.exit(78);
  }
  const body=fs.readFileSync(file);
  const header=Buffer.from("blob "+body.length+"\0","utf8");
  const actual=crypto.createHash("sha1").update(header).update(body).digest("hex");
  if(actual!==expected){
    console.error("ASTRA_GREEN_TOKEN_BLOCKED: hash mismatch "+file+" expected="+expected+" actual="+actual);
    process.exit(78);
  }
}
console.log("ASTRA_GREEN_TOKEN_PASS files="+lines.length);
