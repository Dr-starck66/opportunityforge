import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import AdmZip from "adm-zip";

const engine=path.resolve("scripts/astra-seo-self-heal.mjs");

function setup({missingCanonical=false}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"freehotels-self-heal-"));
  fs.mkdirSync(path.join(root,"config"),{recursive:true});
  const zip=new AdmZip();
  zip.addFile("index.html",Buffer.from('<html><head><title>Home</title><link rel="canonical" href="https://freehotels.info/"></head><body><h1>Home</h1></body></html>'));
  zip.addFile("fr/contact.html",Buffer.from('<html><head><title>Contact</title>'+(missingCanonical?'':'<link rel="canonical" href="https://freehotels.info/fr/contact">')+'</head><body><h1>Contact</h1></body></html>'));
  zip.addFile("sitemap.xml",Buffer.from('<?xml version="1.0"?><urlset><url><loc>https://freehotels.info/</loc></url></urlset>'));
  zip.addFile("sitemap-index.xml",Buffer.from('<?xml version="1.0"?><sitemapindex><sitemap><loc>https://freehotels.info/sitemap.xml</loc></sitemap></sitemapindex>'));
  fs.writeFileSync(path.join(root,"site.b64"),zip.toBuffer().toString("base64"));
  fs.writeFileSync(path.join(root,"config/astra-seo-self-heal.json"),JSON.stringify({
    site:"freehotels.info",canonicalBase:"https://freehotels.info",bundleFile:"site.b64",primarySitemap:"sitemap.xml",preferredSitemap:"sitemap-index.xml",robotsFile:"robots.txt",ignoreHtml:["404.html"],reportPath:"artifacts/seo/report.json"
  }));
  return root;
}
test("repairs missing sitemap coverage and robots directive",()=>{
  const root=setup();
  try{
    const run=spawnSync(process.execPath,[engine,"--apply"],{cwd:root,encoding:"utf8"});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const audit=spawnSync(process.execPath,[engine],{cwd:root,encoding:"utf8"});
    assert.equal(audit.status,0,audit.stderr||audit.stdout);
    const zip=new AdmZip(Buffer.from(fs.readFileSync(path.join(root,"site.b64"),"utf8"),"base64"));
    const sitemap=zip.readAsText("sitemap.xml");
    const robots=zip.readAsText("robots.txt");
    assert.match(sitemap,/https:\/\/freehotels\.info\/fr\/contact/);
    assert.match(robots,/Sitemap: https:\/\/freehotels\.info\/sitemap-index\.xml/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("fails closed when canonical is ambiguous",()=>{
  const root=setup({missingCanonical:true});
  try{
    const run=spawnSync(process.execPath,[engine,"--apply"],{cwd:root,encoding:"utf8"});
    assert.equal(run.status,78,run.stderr||run.stdout);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
