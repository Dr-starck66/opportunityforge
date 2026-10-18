import test from 'node:test';
import assert from 'node:assert/strict';
import {crawlProspectWithAstra} from './astra-crawl-fallback.mjs';
const url='https://example.com/';
const row={url,finalUrl:url,status:200,title:'Example Domain',metaDescription:'A public example page',h1s:['Example Domain'],warnings:[]};
const mock=(status,data)=>async(endpoint,options)=>{
  assert.equal(endpoint,'https://astra-crawler-omega-prod-production.up.railway.app/api/crawl');
  assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{url,maxPages:1,maxDepth:0});
  return {ok:status===200,status,json:async()=>data};
};
test('verified crawl returns explicitly limited metadata, never synthetic HTML',async()=>{
  const a=await crawlProspectWithAstra(url,{fetchFn:mock(200,{schema:'astra-crawler-omega/v1',results:[row]})});
  assert.equal(a.source,'ASTRA_CRAWLER_OMEGA');assert.equal(a.evidenceLevel,'PARTIAL_SEO_METADATA');
  assert.equal(a.title,'Example Domain');assert.equal(a.description,'A public example page');
  assert.equal(a.html,undefined);
});
test('unsafe hosts rejected before remote call',async()=>{
  for(const x of ['http://localhost/','http://127.0.0.1/','http://10.0.0.2/','ftp://example.com/','http://user:pass@example.com/']){
    await assert.rejects(crawlProspectWithAstra(x,{fetchFn:()=>{throw Error('FETCH_SHOULD_NOT_RUN')}}),/ASTRA_UNSAFE_TARGET/);
  }
});
test('fails closed on incomplete schemas and metadata',async()=>{
  await assert.rejects(crawlProspectWithAstra(url,{fetchFn:mock(200,{results:[row]})}),/BAD_SCHEMA/);
  await assert.rejects(crawlProspectWithAstra(url,{fetchFn:mock(200,{schema:'astra-crawler-omega/v1',results:[]})}),/NO_VERIFIED/);
});
test('non-200 HTTP and robot warnings are never marked success',async()=>{
  await assert.rejects(crawlProspectWithAstra(url,{fetchFn:mock(503,{schema:'astra-crawler-omega/v1',results:[row]})}),/HTTP_503/);
  await assert.rejects(crawlProspectWithAstra(url,{fetchFn:mock(200,{schema:'astra-crawler-omega/v1',results:[{...row,warnings:['BLOCKED_BY_ROBOTS_TXT']}]})}),/NO_VERIFIED/);
});
