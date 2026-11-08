import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
import { createServer, type ServerResponse } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chain, markets, memoryFor, record, personalRecord, suggestedSize, hotSetup, type Setup, type Hit, type Direction, type MemberMemory, type CrewMemory } from '@nakama/core';
import { toBase64 } from '@mysten/sui/utils';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { cost } from '@mysten/deepbook-v3/predict';

type Order={address:string;size:number;digest:string;recordId?:string;status:'enqueued'|'filled'|'refunded'|'settled';orderId?:string;cost?:number;fillDigest?:string;payoutDigest?:string;pnl?:number;hit?:boolean};
type Call={id:string;crewId:string;caller:string;why:string;setup:Setup;marketId:string;expiryMs:number;strike:number;upper?:number;createdAt:string;orders:Order[];status:'live'|'expired'|'settled';crewRecord?:ReturnType<typeof record>;callerRecord?:ReturnType<typeof personalRecord>;recalled?:string[];memoryBlobId?:string};
type Crew={id:string;name:string;members:string[];createdAt:string;calls:Call[];playbook?:{best:string;worst:string;blobId?:string}[]};
const dbPath=fileURLToPath(new URL('../../../data/crews.json', import.meta.url)); let crews:Crew[]=[]; try{crews=JSON.parse(await readFile(dbPath,'utf8'))}catch{}
const listeners=new Set<ServerResponse>(); const prepared=new Map<string,{callId:string;address:string;size:number;at:number}>();
const samples:{at:number;spot:number}[]=[];
const missing=(n:string)=>process.env[n]?null:`Setup required: ${n}`;
const live=()=>process.env.NAKAMA_ALLOW_MAINNET==='I_ACKNOWLEDGE_REAL_USDC';
function safeError(e:unknown){let s=String(e);for(const n of ['TATUM_API_KEY','MEMWAL_MAINNET_KEY','MEMWAL_MAINNET_ACCOUNT_ID','OPENROUTER_API_KEY']){const v=process.env[n];if(v)s=s.replaceAll(v,'[redacted]')}return s}
function respond(res:ServerResponse,code:number,value:unknown){res.writeHead(code,{'content-type':'application/json','access-control-allow-origin':'*'});res.end(JSON.stringify(value,(_,v)=>typeof v==='bigint'?String(v):v))}
async function save(){await mkdir(fileURLToPath(new URL('../../../data', import.meta.url)),{recursive:true});await writeFile(dbPath,JSON.stringify(crews,null,2));for(const r of listeners)r.write(`data: ${JSON.stringify({type:'crews'})}\n\n`)}
async function body(req:AsyncIterable<Uint8Array>){let s='';for await(const c of req){s+=c.toString();if(s.length>20000)throw Error('Body too large')}return JSON.parse(s)}
const address=(s:unknown)=>{if(typeof s!=='string'||!/^0x[0-9a-f]{64}$/i.test(s))throw Error('Invalid Sui address');return s.toLowerCase()};
const crew=(id:string)=>{const c=crews.find(x=>x.id===id);if(!c)throw Error('Crew not found');return c};
const call=(id:string)=>{const c=crews.find(x=>x.calls.some(y=>y.id===id));const x=c?.calls.find(y=>y.id===id);if(!c||!x)throw Error('Call not found');return {c,x}};
function context(cadence:1|5,direction:Direction,strike:number,spot:number):Setup{const now=Date.now();const past=(ms:number)=>[...samples].reverse().find(x=>x.at<=now-ms)?.spot;const p60=past(60000),p5=past(300000);return {cadence,direction,strikeDistance:strike-spot,move60s:p60==null?null:spot-p60,move5m:p5==null?null:spot-p5,hourUtc:new Date().getUTCHours()}}
async function marketList(){const m=await markets();const spot=m.markets.find(x=>x.forward!=null)?.forward;if(spot!=null){samples.push({at:Date.now(),spot});while(samples[0]?.at<Date.now()-360000)samples.shift()}return m.markets}
async function recall(namespace:string,setup:Setup):Promise<Hit[]>{return memoryFor(namespace).recall(setup)}
let writeQueue=Promise.resolve();let nextWrite=0;
function remember(namespace:string,memory:CrewMemory|MemberMemory,onDone?:(id:string)=>Promise<void>){writeQueue=writeQueue.catch(()=>{}).then(async()=>{const wait=Math.max(0,nextWrite-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));nextWrite=Date.now()+2000;const id=await memoryFor(namespace).remember(memory);await onDone?.(id)}).catch(e=>{console.error('Memory write:',safeError(e))});}
async function enrichment(c:Crew,x:Call,member?:string){const setup=x.setup;let crewHits:Hit[]=[];let memberHits:Hit[]=[];let memoryError:string|null=null;try{crewHits=await recall(`crew:${c.id}`,setup);if(member)memberHits=await recall(`member:${member}`,setup)}catch(e){memoryError=safeError(e)}const hot=hotSetup(crewHits);return {record:record(crewHits,hot?.setup??setup),hot,member:member?{...suggestedSize(memberHits),record:personalRecord(memberHits)}:null,recalled:crewHits.map(h=>h.blobId),memoryError}}
async function verifyOrder(x:Call,digest:string,owner:string){const ch=chain();if(!(ch.client instanceof SuiJsonRpcClient))throw Error('Tatum JSON RPC required to verify orders');const tx=await ch.client.getTransactionBlock({digest,options:{showInput:true,showEffects:true,showEvents:true}});if(tx.effects?.status.status!=='success'||tx.transaction?.data.sender?.toLowerCase()!==owner)throw Error('Unverified member transaction');const receipt=ch.predict.decode.enqueue(tx);if(receipt.marketId.toLowerCase()!==x.marketId.toLowerCase()||receipt.side!=='mint')throw Error('Enqueue receipt differs from call');return String(receipt.recordId)}
async function eventDigest(ch:ReturnType<typeof chain>,kind:string,x:Call,o:Order){
  if(!(ch.client instanceof SuiJsonRpcClient))return null;
  const pkg=ch.config.packages.predictOrdersV1??ch.config.packages.predictOrders;if(!pkg)return null;
  const ev=await ch.client.queryEvents({query:{MoveEventType:`${pkg}::queue_events::${kind}`},limit:50,order:'descending'});
  return ev.data.find(e=>{const p=e.parsedJson as Record<string,unknown>;return String(p.record_id)===o.recordId&&String(p.expiry_market_id).toLowerCase()===x.marketId.toLowerCase()})?.id.txDigest??null;
}
async function watch(){
  let changed=false;
  for(const c of crews)for(const x of c.calls){
    if(x.status==='settled')continue;
    for(const o of x.orders){
      try{
        const ch=chain();
        if(o.status==='enqueued'&&o.recordId){
          const outcome=await ch.predict.read.waitForOutcome({underlying:'BTC',expiryMs:x.expiryMs,marketId:x.marketId},BigInt(o.recordId),{timeoutMs:1500});
          if(outcome.outcome==='refunded'){o.status='refunded';changed=true}
          else if(outcome.outcome==='filled'){
            const digest=await eventDigest(ch,'QueuedOrderFilled',x,o);
            if(digest&&ch.client instanceof SuiJsonRpcClient){
              const tx=await ch.client.getTransactionBlock({digest,options:{showEvents:true}});
              const fill=ch.predict.decode.queuedFills(tx).find(f=>String(f.recordId)===o.recordId&&f.marketId===x.marketId);
              if(fill?.position){o.fillDigest=digest;o.orderId=String(fill.position.orderId);o.cost=fill.amount+fill.fees.order;o.status='filled';changed=true}
            }
          }
        }
        if(o.status==='filled'&&o.recordId&&o.orderId&&Date.now()>x.expiryMs+10000&&ch.client instanceof SuiJsonRpcClient){
          const settlement=await ch.predict.read.settlement({underlying:'BTC',expiryMs:x.expiryMs,marketId:x.marketId});
          if(!settlement.settled||settlement.settlementPriceRaw==null)continue;
          const digest=await eventDigest(ch,'OpenRecordSettled',x,o);if(!digest)continue;
          const tx=await ch.client.getTransactionBlock({digest,options:{showEvents:true}});
          const paid=ch.predict.decode.openRecordPayouts(tx).find(p=>p.marketId===x.marketId&&String(p.recordId)===o.recordId&&!p.skipped);if(!paid)continue;
          const expected=Number(cost.settledPayout(BigInt(o.orderId),settlement.settlementPriceRaw,settlement.tickSizeRaw))/1e6;
          if(Math.abs(expected-paid.payout)>0.000001)throw Error('Payout differs from contract math');
          o.payoutDigest=digest;o.pnl=Math.round((paid.payout-(o.cost??0))*1e6)/1e6;o.hit=paid.payout>0;o.status='settled';changed=true;
        }
      }catch(e){console.error('Order watcher:',safeError(e))}
    }
    if(Date.now()>x.expiryMs&&x.status==='live'){x.status='expired';changed=true}
    if(x.orders.some(o=>o.status==='settled')&&x.orders.every(o=>o.status==='settled'||o.status==='refunded')){
      x.status='settled';changed=true;
      const settled=x.orders.filter(o=>o.status==='settled');
      const memory:CrewMemory={kind:'call',crewId:c.id,callId:x.id,caller:x.caller,why:x.why,setup:x.setup,hit:settled.some(o=>o.hit),joiners:settled.map(o=>({address:o.address,size:o.size,hit:!!o.hit,pnl:o.pnl??0,fillDigest:o.fillDigest??'',payoutDigest:o.payoutDigest})),createdAt:new Date().toISOString()};
      if(process.env.MEMWAL_MAINNET_KEY&&process.env.MEMWAL_MAINNET_ACCOUNT_ID)remember(`crew:${c.id}`,memory,async id=>{x.memoryBlobId=id;await save()});
      for(const o of settled){const m:MemberMemory={kind:'result',crewId:c.id,callId:x.id,address:o.address,size:o.size,hit:!!o.hit,pnl:o.pnl??0,createdAt:new Date().toISOString()};if(process.env.MEMWAL_MAINNET_KEY&&process.env.MEMWAL_MAINNET_ACCOUNT_ID)remember(`member:${o.address}`,m)}
      const done=c.calls.filter(a=>a.status==='settled');if(done.length%5===0){const good=done.filter(a=>a.orders.some(o=>o.hit)).at(-1),bad=done.filter(a=>a.orders.some(o=>o.hit===false)).at(-1);const best=good?`${good.setup.cadence}m ${good.setup.direction}`:'No wins yet',worst=bad?`${bad.setup.cadence}m ${bad.setup.direction}`:'No losses yet';const p:{best:string;worst:string;blobId?:string}={best,worst};c.playbook??=[];c.playbook.push(p);if(process.env.MEMWAL_MAINNET_KEY&&process.env.MEMWAL_MAINNET_ACCOUNT_ID)remember(`crew:${c.id}`,{kind:'playbook',crewId:c.id,best,worst,calls:done.length,createdAt:new Date().toISOString()},async id=>{p.blobId=id;await save()})}
    }
  }
  if(changed)await save();
}
const server=createServer(async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'});res.end();return}try{const u=new URL(req.url??'/', 'http://localhost');const p=u.pathname;if(p==='/events'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','access-control-allow-origin':'*'});listeners.add(res);req.on('close',()=>listeners.delete(res));res.write('data: {"type":"connected"}\n\n');return}
if(p==='/rpc'&&req.method==='POST'){const payload=await body(req);const target=process.env.TATUM_API_KEY?'https://sui-mainnet.gateway.tatum.io':process.env.NAKAMA_DEV_SUI_RPC;if(!target)throw Error('Setup required: TATUM_API_KEY');const upstream=await fetch(target,{method:'POST',headers:{'content-type':'application/json',...(process.env.TATUM_API_KEY?{'x-api-key':process.env.TATUM_API_KEY}:{})},body:JSON.stringify(payload)});res.writeHead(upstream.status,{'content-type':'application/json','access-control-allow-origin':'*'});res.end(await upstream.text());return}
if(p==='/status'){respond(res,200,{rpc:process.env.TATUM_API_KEY?'Tatum':process.env.NAKAMA_DEV_SUI_RPC?'dev RPC (not Tatum)':'unavailable',memoryNetwork:'Walrus mainnet',mainnetWrites:live(),setup:['TATUM_API_KEY','MEMWAL_MAINNET_KEY','MEMWAL_MAINNET_ACCOUNT_ID','OPENROUTER_API_KEY'].map(missing).filter(Boolean)});return}
if(p==='/markets'&&req.method==='GET'){respond(res,200,{markets:await marketList()});return}
if(p==='/crews'&&req.method==='POST'){const b=await body(req);const name=String(b.name??'').trim().slice(0,60);if(!name)throw Error('Crew name required');const id=randomUUID().slice(0,8);const c:Crew={id,name,members:[],calls:[],createdAt:new Date().toISOString()};crews.push(c);await save();respond(res,201,c);return}
const cm=p.match(/^\/crews\/([^/]+)(?:\/(join|calls|composer|recap))?$/);if(cm){const c=crew(cm[1]);if(!cm[2]&&req.method==='GET'){respond(res,200,c);return}if(cm[2]==='join'&&req.method==='POST'){const b=await body(req);const a=address(b.address);if(!c.members.includes(a)){c.members.push(a);await save();if(process.env.MEMWAL_MAINNET_KEY&&process.env.MEMWAL_MAINNET_ACCOUNT_ID)remember(`crew:${c.id}`,{kind:'membership',crewId:c.id,address:a,createdAt:new Date().toISOString()})}respond(res,200,c);return}
if(cm[2]==='composer'&&req.method==='GET'){const list=await marketList();const m=list.find(x=>x.expiryMs>Date.now()+20000);if(!m)throw Error('No active market');const setup=context(m.cadence,'up',m.suggestedStrike??m.referencePrice??0,m.forward??m.referencePrice??0);const e=await enrichment(c,{id:'',crewId:c.id,caller:'',why:'',setup,marketId:m.id,expiryMs:m.expiryMs,strike:0,createdAt:'',orders:[],status:'live'});respond(res,200,{...e,markets:list});return}
if(cm[2]==='calls'&&req.method==='POST'){const b=await body(req);const caller=address(b.caller);if(!c.members.includes(caller))throw Error('Join crew first');const m=(await marketList()).find(x=>x.id===b.marketId);if(!m||m.expiryMs<Date.now()+15000)throw Error('Market expired');const direction=b.direction as Direction;if(!['up','down','range'].includes(direction))throw Error('Choose direction');const strike=Number(b.strike);if(!Number.isFinite(strike)||strike%1!==0)throw Error('Strike must be on 1 USD grid');const upper=direction==='range'?Number(b.upper):undefined;if(direction==='range'&&(!Number.isFinite(upper)||upper!<=strike||upper!%1!==0))throw Error('Invalid upper strike');const why=String(b.why??'').trim().slice(0,280);if(!why)throw Error('Add a short why');const setup=context(m.cadence,direction,strike,m.forward??m.referencePrice??strike);const x:Call={id:randomUUID().slice(0,8),crewId:c.id,caller,why,setup,marketId:m.id,expiryMs:m.expiryMs,strike,upper,createdAt:new Date().toISOString(),orders:[],status:'live'};const e=await enrichment(c,x,caller);x.crewRecord=e.record;x.callerRecord=e.member?.record;x.recalled=e.recalled;c.calls.push(x);await save();respond(res,201,{...x,memoryError:e.memoryError});return}
if(cm[2]==='recap'&&req.method==='GET'){if(!process.env.OPENROUTER_API_KEY)throw Error('Setup required: OPENROUTER_API_KEY');const last=c.calls.at(-1);if(!last)throw Error('No calls yet');const e=await enrichment(c,last);if(e.memoryError)throw Error(e.memoryError);const recalled=await recall(`crew:${c.id}`,last.setup);const facts=recalled.length?JSON.stringify(recalled.map(h=>({blobId:h.blobId,memory:h.memory}))):'No recalled memories';const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.NAKAMA_MODEL??'openai/gpt-4.1-mini',messages:[{role:'system',content:'Write a short crew recap using only the recalled Walrus facts supplied. If none, say no recap yet. Do not infer outcomes.'},{role:'user',content:facts}]})});if(!r.ok)throw Error(`OpenRouter ${r.status}`);const j=await r.json() as any;respond(res,200,{text:j.choices?.[0]?.message?.content??'',blobIds:e.recalled});return}}
const om=p.match(/^\/calls\/([^/]+)\/(plan|orders|suggestion)$/);if(om){const {c,x}=call(om[1]);if(om[2]==='suggestion'&&req.method==='GET'){const owner=address(u.searchParams.get('address'));if(!c.members.includes(owner))throw Error('Join crew first');respond(res,200,await enrichment(c,x,owner));return}if(req.method!=='POST')throw Error('POST required');const b=await body(req);const owner=address(b.address);if(!c.members.includes(owner))throw Error('Join crew first');if(om[2]==='plan'){if(x.expiryMs<Date.now()+12000)throw Error('Call expired');const e=await enrichment(c,x,owner);const size=Number(b.size??e.member?.size??2);if(!Number.isFinite(size)||size<1||size>100)throw Error('Size must be 1 to 100 USDC');const ch=chain();const descriptor:any={underlying:'BTC',expiryMs:x.expiryMs,marketId:x.marketId,side:x.setup.direction,strike:x.strike};if(x.setup.direction==='range'){delete descriptor.strike;descriptor.lower=x.strike;descriptor.upper=x.upper}const quote=await ch.predict.read.planMint(owner,descriptor,{amount:size,slippageCents:5});let transaction:string|null=null,dryRun:any=null;if(quote.accepting){const built=await ch.predict.tx.enqueuePlan(owner,descriptor,quote);built.transaction.setSender(owner);const bytes=await built.transaction.build({client:ch.client});transaction=toBase64(bytes);if(ch.client instanceof SuiJsonRpcClient){const sim=await ch.client.dryRunTransactionBlock({transactionBlock:bytes});dryRun={status:sim.effects.status.status,error:sim.effects.status.error??null,rpc:ch.rpc}}else{const sim=await ch.client.core.simulateTransaction({transaction:bytes,include:{effects:true}});dryRun={status:sim.$kind==='Transaction'?'success':'failure',rpc:ch.rpc}}if(dryRun.status==='success')prepared.set(transaction,{callId:x.id,address:owner,size,at:Date.now()})}respond(res,200,{quote:{accepting:quote.accepting,refusal:quote.refusal,potentialPayout:quote.potentialPayout,orderFee:quote.orderFee,totalDebit:quote.totalDebit},dryRun,transaction:live()?transaction:null,suggested:e.member,mode:live()?'real USDC':'dry-run only',memoryError:e.memoryError});return}
if(!live())throw Error('Dry-run only: mainnet writes disabled');const digest=String(b.digest??'');if(x.orders.some(o=>o.digest===digest))throw Error('Order already registered');const recordId=await verifyOrder(x,digest,owner);const pr=[...prepared.values()].find(z=>z.callId===x.id&&z.address===owner&&Date.now()-z.at<60000);if(!pr)throw Error('Order was not recently prepared for this member');x.orders.push({address:owner,size:pr.size,digest,recordId,status:'enqueued'});for(const [bytes,value] of prepared)if(value===pr)prepared.delete(bytes);await save();respond(res,201,x.orders.at(-1));return}
if(p==='/execute'&&req.method==='POST'){if(!live())throw Error('Dry-run only: mainnet writes disabled');const b=await body(req);const pr=prepared.get(b.bytes);if(!pr||Date.now()-pr.at>60000)throw Error('Transaction was not recently prepared');const ch=chain();if(!(ch.client instanceof SuiJsonRpcClient))throw Error('Tatum JSON RPC required');const tx=await ch.client.executeTransactionBlock({transactionBlock:b.bytes,signature:b.signature,options:{showEffects:true,showEvents:true,showInput:true}});if(tx.effects?.status.status!=='success')throw Error('Transaction failed');respond(res,200,{digest:tx.digest});return}
respond(res,404,{error:'Not found'})}catch(e){respond(res,400,{error:safeError(e)})}});
let watching=false;setInterval(()=>{if(watching)return;watching=true;void watch().catch(e=>console.error('Watcher:',safeError(e))).finally(()=>{watching=false})},5000);
server.listen(Number(process.env.NAKAMA_PORT??8787),()=>console.log(`Nakama server on ${process.env.NAKAMA_PORT??8787}`));
