import test from 'node:test';
import assert from 'node:assert/strict';
import {nextReset,countdown,worldStateService} from '../public/world-state.js';
import {homeView} from '../public/home.js';
import {empty,collected} from '../public/model.js';

test('standing reset targets next UTC midnight across date/year boundaries',()=>{
 assert.equal(nextReset(Date.parse('2026-12-31T23:59:59Z')),Date.parse('2027-01-01T00:00:00Z'));
 assert.equal(nextReset(Date.parse('2026-11-13T00:00:00Z')),Date.parse('2026-11-14T00:00:00Z'));
 assert.equal(countdown('2026-11-13T00:00:00Z',Date.parse('2026-11-13T00:01:00Z')),'00:00:00');
 assert.equal(countdown('invalid'),'—');
});
test('world cache coalesces, separates languages and marks previous snapshot stale on failure',async()=>{
 let now=Date.parse('2026-11-13T12:00:00Z'),calls=0,fail=false;
 const service=worldStateService({now:()=>now,fetcher:async()=>{calls++;if(fail)throw Error('offline');return {ok:true,json:async()=>({state:'day',expiry:'2026-11-13T13:00:00Z'})};}});
 const [a,b]=await Promise.all([service('ru'),service('ru')]);assert.deepEqual(a,b);assert.equal(calls,8);
 await service('ru');assert.equal(calls,8);await service('en');assert.equal(calls,16);
 now+=61000;fail=true;const stale=await service('ru');assert.equal(stale.stale,true);assert.deepEqual(stale.data,a.data);assert.equal(stale.updatedAt,a.updatedAt);
 const missing=await worldStateService({fetcher:async()=>({ok:true,json:async()=>({bad:true})})})();assert.equal(missing.error,true);assert.deepEqual(missing.data,{});
});
test('home renders honest empty state, actual completed count, Nightwave and escapes feed HTML',()=>{
 const frame={id:'frame',name:'Test',prime:false,recipe:null};
 const render=homeView({language:'en',frames:[frame],state:empty(),collected,availability:{frames:{},stale:true},name:f=>f.name}).render;
 let html=render();assert.ok(html.includes('0<small> / 1'));assert.match(html,/Nightwave/);assert.match(html,/Data unavailable/);assert.doesNotMatch(html,/Fissures/);
 const expiry=new Date(Date.now()+3600000).toISOString();
 html=render({data:{nightwave:{expiry,season:12,phase:0,activeChallenges:[{expiry,title:'<script>x</script>',reputation:4500,desc:'Do a task'}]},sortie:{expiry,boss:'Boss',variants:[{node:'Node',missionType:'Spy',modifier:'Radiation'}]}},stale:false,updatedAt:new Date().toISOString()});
 assert.match(html,/Series 12/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Spy/);assert.doesNotMatch(html,/<script>/);
 html=render({data:{cetusCycle:{state:'day',expiry:'2000-01-01T00:00:00Z'}}});assert.match(html,/Awaiting update/);
});

test('one failed endpoint preserves working sections and reports partial freshness',async()=>{
 const service=worldStateService({fetcher:async url=>{if(url.includes('zarimanCycle'))throw Error('offline');return {ok:true,json:async()=>({state:'night',expiry:'2026-12-31T12:00:00Z'})};}});
 const result=await service();assert.equal(result.stale,true);assert.deepEqual(result.failed,['zarimanCycle']);assert.equal(result.data.cetusCycle.state,'night');assert.equal(result.data.zarimanCycle,undefined);
});
