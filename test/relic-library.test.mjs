import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {allRelics,relicContents} from '../public/relic-library.js';
import {refinementLevels, relicPage, archiveAvailability} from '../public/model.js';
import {buildAvailability} from '../public/availability.js';

test('FT10 rewards cover every library relic and each refinement with actual probability distributions',()=>{
 for(const name of allRelics) {
  for(const level of refinementLevels) {
   const rows=relicContents[name][level]; assert.ok(rows?.length, name+' '+level);
   assert.ok(rows.every(r=>r.id && r.name && Number.isFinite(r.chance) && r.chance>=0 && r.chance<=100));
   assert.ok(Math.abs(rows.reduce((sum,r)=>sum+r.chance,0)-100)<0.1,name+' '+level);
  }
 }
 const rare=relicContents['Lith A1'].intact.find(r=>r.chance===2);assert.ok(rare);
 assert.equal(relicContents['Lith A1'].radiant.find(r=>r.id===rare.id).chance,10);
});
test('FT10 individual live relic statuses distinguish missions, Varzia, vaulted and stale data',()=>{
 const now=Date.parse('2026-11-13T12:00:00Z');
 const snap={relics:{date:new Date(now).toISOString(),data:[{id:'a',name:'Lith A1',vaulted:false,rewards:[],locations:['Earth · A']},{id:'b',name:'Lith B1',vaulted:true,rewards:[],locations:[]},{id:'c',name:'Lith C1',vaulted:true,rewards:[],locations:[]}]},traders:{date:new Date(now).toISOString(),data:[{start:now-1,end:now+60000,relics:['b']}]}};
 const result=buildAvailability([],snap,now);
 assert.equal(result.relics['Lith A1'].status,'available'); assert.equal(result.relics['Lith B1'].channel,'resurgence');assert.equal(result.relics['Lith B1'].status,'available');assert.equal(result.relics['Lith C1'].status,'vaulted');
 snap.relics.error=true;assert.equal(buildAvailability([],snap,now).relics['Lith A1'].status,'unknown');
});
test('FT10 bounded pages search the full library and combine source and goal filters',()=>{
 const rows=allRelics.map((name,i)=>({name,active:i%2===0,hasSource:i%3===0,goal:i%5===0}));
 const result=relicPage(rows);assert.equal(result.items.length,24);assert.equal(result.total,799);
 const all=[];for(let page=0;page<result.pages;page++) all.push(...relicPage(rows,{page}).items.map(r=>r.name));assert.deepEqual(all,allRelics);
 const query=rows.at(-1).name;assert.ok(relicPage(rows,{search:query}).items.some(r=>r.name===query));
 const filtered=relicPage(rows,{search:'lith',onlyGoals:true,source:'active'});assert.ok(filtered.items.every(r=>r.goal && r.active && r.name.toLowerCase().includes('lith')));
 assert.equal(relicPage(rows,{search:'no such relic',page:99}).page,0);
 assert.equal(relicPage(rows,{source:'no-source'}).total,rows.filter(r=>!r.hasSource).length);
});
test('FT10 filtering preserves search and toolbar while replacing only a bounded result grid',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function filterRelicCards('),source.indexOf('function relicInventoryView()'));
 const field={value:'Lith',selectionStart:2,selectionEnd:2}; const elements={};
 const app={querySelector:id=>elements[id] ??= {}};
 Object.defineProperty(app,'innerHTML',{set(){throw new Error('Do not replace the focused input');}});
 const rows=allRelics.map(name=>({name}));let renders=0;
 const context=vm.createContext({app,relicRows:rows,relicSearch:' lith ',relicOnly:false,relicSourceFilter:'all',relicPageIndex:0,relicPage,L:ru=>ru,relicCard:row=>{renders++;return row.name;}});
 vm.runInContext(fn+';filterRelicCards()',context);assert.equal(renders,24);assert.equal(field.selectionStart,2);assert.equal(elements['#relic-empty'].hidden,true);
 context.relicSearch='nothing';vm.runInContext('filterRelicCards()',context);assert.equal(elements['#relic-empty'].hidden,false);
});
test('archive presents only rotation or vaulted, defaulting unknown to vaulted',()=>{
 assert.equal(archiveAvailability({status:'available'}),'available');assert.equal(archiveAvailability({status:'partial'}),'available');
 for(const row of [undefined,{status:'unknown'},{status:'vaulted'}]) assert.equal(archiveAvailability(row),'vaulted');
});
test('FT10 spending updates only the active quantity row and keeps expanded cards intact',()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf("  if(button.hasAttribute('data-use-relic')) {");
 const end=source.indexOf("  if (button.hasAttribute('data-edit-stock'))",start);
 const input={value:2};const row={querySelector:()=>input};const button={dataset:{useRelic:'Lith A1',level:'intact'},hasAttribute:()=>true,closest:()=>row,disabled:false};
 const state={relics:{'Lith A1':{intact:2}}};let snapshots=0,writes=0;
 const context=vm.createContext({button,state,captureProgress:()=>snapshots++,save:()=>writes++,relicInventoryView:()=>{throw new Error('Spending must not rebuild the library');}});
 vm.runInContext('(function(){'+source.slice(start,end)+'})()',context);
 assert.equal(state.relics['Lith A1'].intact,1);assert.equal(input.value,1);assert.equal(button.disabled,false);assert.equal(snapshots,1);assert.equal(writes,1);
 vm.runInContext('(function(){'+source.slice(start,end)+'})()',context);assert.equal(input.value,0);assert.equal(button.disabled,true);
 vm.runInContext('(function(){'+source.slice(start,end)+'})()',context);assert.equal(snapshots,2);assert.equal(writes,2);
});
