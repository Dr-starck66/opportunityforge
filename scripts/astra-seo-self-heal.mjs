#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const root=process.cwd();
const apply=process.argv.includes("--apply");
const cfg=JSON.parse(fs.readFileSync(path.join(root,"config/astra-seo-self-heal.json"),"utf8"));
const bundlePath=path.join(root,cfg.bundleFile);
const reportPath=path.join(root,cfg.reportPath);

function writeReport(report){
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n","utf8");
}
function attr(tag,name){
  const m=tag.match(new RegExp("\\b"+name+"\\s*=\\s*([\"'])(.*?)\\1","i"));
  return m?.[2]||"";
}
function canonicalHref(html){
  for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
    const rel=attr(tag,"rel").toLowerCase().split(/\s+/);
    if(rel.includes("canonical")) return attr(tag,"href");
  }
  return "";
}
function hasNoindex(html){
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    const name=attr(tag,"name").toLowerCase();
    const content=attr(tag,"content").toLowerCase();
    if((name==="robots"||name==="googlebot")&&/(^|[,\s])noindex([,\s]|$)/i.test(content)) return true;
  }
  return false;
}
function titleOf(html){
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/<[^>]+>/g,"").trim();
}
function h1Count(html){ return (html.match(/<h1\b/gi)||[]).length; }
function normalizeUrl(raw){
  const u=new URL(raw);
  u.hash="";
  if(u.pathname.length>1) u.pathname=u.pathname.replace(/\/+$/,"");
  return u.toString().replace(/\/$/,"");
}
function xmlLocs(xml){
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim().replace(/&amp;/g,"&"));
}

if(!fs.existsSync(bundlePath)){
  console.error("ASTRA_SEO_SELF_HEAL_BLOCKED bundle missing");
  process.exit(78);
}

const base64=fs.readFileSync(bundlePath,"utf8").replace(/\s+/g,"");
const zip=new AdmZip(Buffer.from(base64,"base64"));
const entries=new Map(zip.getEntries().filter(e=>!e.isDirectory).map(e=>[e.entryName,e]));
const text=(name)=>entries.get(name)?.getData().toString("utf8")??null;

const sitemapNames=[...entries.keys()].filter(n=>/^sitemap(?:-[^/]+)?\.xml$/i.test(n)||n==="sitemap.xml");
const primary=cfg.primarySitemap;
const primaryXml=text(primary);
const actions=[];
const blocked=[];
const indexable=[];

if(primaryXml==null) blocked.push({reason:"missing-primary-sitemap",file:primary});

const allSitemapLocs=new Set();
for(const name of sitemapNames){
  const xml=text(name);
  if(xml) for(const loc of xmlLocs(xml)) allSitemapLocs.add(normalizeUrl(loc));
}

for(const [name,entry] of entries){
  if(!name.endsWith(".html")) continue;
  if((cfg.ignoreHtml||[]).includes(name)) continue;
  const html=entry.getData().toString("utf8");
  if(hasNoindex(html)) continue;
  const title=titleOf(html);
  const canonical=canonicalHref(html);
  const h1s=h1Count(html);

  if(!title){ blocked.push({file:name,reason:"missing-title"}); continue; }
  if(h1s!==1){ blocked.push({file:name,reason:"invalid-h1-count",count:h1s}); continue; }
  if(!canonical){ blocked.push({file:name,reason:"missing-canonical"}); continue; }

  let normalized;
  try { normalized=normalizeUrl(new URL(canonical,cfg.canonicalBase).toString()); }
  catch { blocked.push({file:name,reason:"invalid-canonical",canonical}); continue; }

  const expectedOrigin=new URL(cfg.canonicalBase).origin;
  if(new URL(normalized).origin!==expectedOrigin){
    blocked.push({file:name,reason:"foreign-canonical",canonical:normalized});
    continue;
  }
  indexable.push({file:name,canonical:normalized,title});
  if(!allSitemapLocs.has(normalized)){
    actions.push({type:"add-missing-sitemap-url",file:name,canonical:normalized,title});
  }
}

const robotsName=cfg.robotsFile;
const robots=text(robotsName);
const preferredSitemap=cfg.canonicalBase.replace(/\/+$/,"")+"/"+String(cfg.preferredSitemap||"").replace(/^\/+/, "");
if(robots && /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(?:$|\r?\n)/i.test(robots)){
  blocked.push({file:robotsName,reason:"global-disallow-root"});
}
if(!robots || !robots.split(/\r?\n/).some(line=>line.trim().toLowerCase()===("sitemap: "+preferredSitemap).toLowerCase())){
  actions.push({type:"ensure-robots-sitemap",file:robotsName,value:preferredSitemap});
}

if(blocked.length){
  const report={schema:"astra-seo-self-heal-static/v1",site:cfg.site,mode:apply?"apply":"audit",actions,blocked,indexableCount:indexable.length,verdict:"BLOCKED"};
  writeReport(report);
  console.error("ASTRA_SEO_SELF_HEAL_BLOCKED",JSON.stringify({blocked:blocked.length,actions:actions.length}));
  process.exit(78);
}

if(apply && actions.length){
  let nextPrimary=primaryXml;
  for(const action of actions.filter(a=>a.type==="add-missing-sitemap-url")){
    const block="<url><loc>"+action.canonical.replace(/&/g,"&amp;")+"</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>";
    nextPrimary=nextPrimary.replace(/<\/urlset>\s*$/i,block+"</urlset>");
  }
  if(nextPrimary!==primaryXml) zip.updateFile(primary,Buffer.from(nextPrimary,"utf8"));

  const robotAction=actions.find(a=>a.type==="ensure-robots-sitemap");
  if(robotAction){
    let next=(robots??"User-agent: *\nAllow: /\n").replace(/\s+$/,"");
    next+="\n\nSitemap: "+preferredSitemap+"\n";
    if(entries.has(robotsName)) zip.updateFile(robotsName,Buffer.from(next,"utf8"));
    else zip.addFile(robotsName,Buffer.from(next,"utf8"));
  }

  fs.writeFileSync(bundlePath,zip.toBuffer().toString("base64")+"\n","utf8");
}

const report={schema:"astra-seo-self-heal-static/v1",site:cfg.site,mode:apply?"apply":"audit",actions,blocked:[],indexableCount:indexable.length,verdict:actions.length?(apply?"REPAIRED":"NEEDS_REPAIR"):"PASS"};
writeReport(report);
console.log("ASTRA_SEO_SELF_HEAL_RESULT",JSON.stringify({site:cfg.site,mode:report.mode,indexable:indexable.length,actions:actions.length,verdict:report.verdict}));
if(!apply && actions.length) process.exit(2);
