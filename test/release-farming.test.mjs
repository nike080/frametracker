import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {empty,entry,collected,demand,nextAction,restoreProgress,missingParts,sharedSources,relicLibrary,relicTotal,helminthEligible,progressHistory} from '../public/model.js';
const c=JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url))), frames=[...c.frames,...c.equipment];
test('FT08 legacy ownership does not invent history; repeat has independent demand and survives restore',()=>{
 const f=c.frames[0], s=empty(); s.frames[f.id]={done:true,parts:{},mastered:true,helminth:true,repeat:true,repeatParts:{}}; s.goals=[f.id];
 const restored=restoreProgress(JSON.parse(JSON.stringify(s)),frames);
 assert.deepEqual(restored,s); assert.equal(collected(f,s).done,false); assert.ok(demand([f],s).size); assert.equal(nextAction(f,s).kind,'acquire');
 s.frames[f.id].done=false; assert.equal(entry(s,f).mastered,true); assert.equal(entry(s,f).helminth,true);
 const old=restoreProgress({frames:{[f.id]:{done:true,parts:{}}},stock:{}},frames); assert.equal(old.frames[f.id].mastered,undefined); assert.equal(old.frames[f.id].helminth,undefined);
 assert.equal(helminthEligible(c.frames.find(f=>f.name==='Excalibur Umbra')),false);assert.equal(helminthEligible(c.frames.find(f=>f.prime)),false);
});
test('FT07 real goal intersections exclude collected rewards and preserve full rotations',()=>{
 const s=empty(), result=sharedSources(c.frames,s,c.relicLocations);assert.ok(result.length);
 const row=result[0], selected=[...new Set(row.rewards.map(r=>r.frameId))].map(id=>frames.find(f=>f.id===id));
 assert.ok(sharedSources(selected,s,c.relicLocations).length);for(const f of selected)s.frames[f.id]={done:true,parts:{}};
 assert.deepEqual(sharedSources(selected,s,c.relicLocations),[]);
 const node=(id,where)=>({id,name:id,parts:[],materials:[],drops:[{where}]}); const a={id:'a',recipe:node('pa','Mission · A')},b={id:'b',recipe:node('pb','Mission · B')};
 assert.deepEqual(sharedSources([a,b],empty()),[]);b.recipe.drops[0].where='Mission · A';assert.equal(sharedSources([a,b],empty()).length,1);
});
test('FT10 full relic library, sparse refinement stock, validation, linkage and undo',()=>{
 const names=relicLibrary(frames,c.relicLocations);assert.ok(names.length>=799);assert.equal(new Set(names).size,names.length);
 const s=empty(), name=names[0];s.relics[name]={intact:0,radiant:3};const h=progressHistory();h.capture(s);s.relics[name].radiant--;assert.equal(relicTotal(s,name),2);assert.equal(relicTotal(h.undo(),name),3);
 assert.deepEqual(restoreProgress(s,frames),s);s.relics[name].flawless=-1;s.relics[name].exceptional=1.5;const clean=restoreProgress(s,frames);assert.equal(clean.relics[name].flawless,undefined);assert.equal(clean.relics[name].exceptional,undefined);
 const f=c.frames.find(f=>f.prime);assert.ok(missingParts(f,s).some(p=>p.relics.length));s.frames[f.id]={done:true,parts:{}};assert.deepEqual(missingParts(f,s),[]);
});
