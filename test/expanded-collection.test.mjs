import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {empty,demand,restoreProgress,knownStock,flatten,estimate} from '../public/model.js';
const c=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url)));
const all=[...c.frames,...c.equipment];
test('FT25 categories have stable unique IDs and both nested Necramech recipes',()=>{
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 for(const category of ['primary','secondary','melee','archwing','archgun','archmelee','necramech']) assert.ok(c.equipment.some(x=>x.category===category));
 const mechs=c.equipment.filter(x=>x.category==='necramech');assert.deepEqual(mechs.map(x=>x.name).sort(),['Bonewidow','Voidrig']);
 for(const x of mechs) assert.equal(x.recipe.parts.length,4);
 for(const x of c.equipment) for(const node of flatten(x.recipe)) for(const row of node.materials) assert.ok(c.materials[row.id]);
 const prime=c.equipment.find(x=>x.name==='Acceltra Prime');assert.equal(prime.recipe.parts.length,3);assert.ok(prime.recipe.parts.every(x=>x.market&&x.relics.length));
});
test('FT25 mixed goals share stock, retain unknown versus zero, and round-trip progress',()=>{
 const a=c.frames.find(x=>x.recipe),b=c.equipment.find(x=>x.category==='necramech');const state=empty();state.goals=[a.id,b.id];
 state.frames[b.id]={done:false,parts:{[b.recipe.parts[0].id]:2}};state.stock.credits=0;
 const restored=restoreProgress(JSON.parse(JSON.stringify(state)),all);assert.deepEqual(restored,state);assert.ok(knownStock(restored,'credits'));assert.ok(!knownStock(restored,'/Lotus/unknown'));
 assert.equal(demand([a,b],restored).get('credits'),demand([a],restored).get('credits')+demand([b],restored).get('credits'));
 const noRecipe=c.equipment.find(x=>!x.recipe);assert.equal(demand([noRecipe],state).size,0);assert.doesNotThrow(()=>estimate([{...noRecipe,market:'example'}],state,{}));
});
