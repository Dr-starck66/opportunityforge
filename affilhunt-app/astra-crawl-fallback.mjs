// ASTRA CRAWLER OMEGA: evidence-only fallback when primary public-site fetch cannot connect.
// No Firecrawl dependency, no invented full HTML, no redirect to private targets.
import net from 'node:net';
const ORIGIN='https://astra-crawler-omega-prod-production.up.railway.app';
function allowedUrl(raw){
  const u=new URL(raw);
  const host=u.hostname.toLowerCase();
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||
     (u.port&&u.port!=='80'&&u.port!=='443')||
     net.isIP(host)||host==='localhost'||host==='0.0.0.0'||
     /\.(?:local|internal|test|invalid|localhost)$/i.test(host))throw Error('ASTRA_UNSAFE_TARGET');
  u.hash='';return u;
}
export async function crawlProspectWithAstra(url,{fetchFn=fetch}={}){
  const target=allowedUrl(url);
  const res=await fetchFn(ORIGIN+'/api/crawl',{
    method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({url:target.href,maxPages:1,maxDepth:0}),
    signal:AbortSignal.timeout(11000)
  });
  if(!res.ok)throw Error('ASTRA_CRAWL_HTTP_'+res.status);
  const data=await res.json();
  if(data?.schema!=='astra-crawler-omega/v1'||!Array.isArray(data.results))throw Error('ASTRA_CRAWL_BAD_SCHEMA');
  const row=data.results.find(p=>p?.url===target.href&&p?.status===200);
  if(!row||!row.finalUrl||new URL(row.finalUrl).origin!==target.origin||
     (!row.title&&!row.metaDescription&&!(row.h1s||[]).length)||
     (row.warnings||[]).some(x=>/BLOCKED_BY_ROBOTS/i.test(String(x))))throw Error('ASTRA_CRAWL_NO_VERIFIED_EVIDENCE');
  const metadata=[row.title||'',row.metaDescription||'',...(Array.isArray(row.h1s)?row.h1s:[])];
  return {url:row.finalUrl,source:'ASTRA_CRAWLER_OMEGA',evidenceLevel:'PARTIAL_SEO_METADATA',
    title:row.title||'',metadataText:metadata.join(' ').slice(0,2200),
    description:row.metaDescription||'',status:row.status};
}
