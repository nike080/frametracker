import test from 'node:test';
import assert from 'node:assert/strict';
import { homeView } from '../public/home.js';
import { empty, collected, restoreProgress, demand } from '../public/model.js';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url)));
const all=[...catalog.frames,...catalog.equipment];
test('home separates mixed collection progress and aggregates weapon subcategories once',()=>{
 const categories=['warframes','primary','secondary','melee','archwing','archgun','archmelee','necramech','pets'];
 const frames=categories.map((category,i)=>({category,id:'/Lotus/'+i,name:category,recipe:null}));
 const state=empty();for(const i of [0,1,3,5,8])state.frames[frames[i].id]={done:true,parts:{}};
 const render=language=>homeView({language,frames,state,collected,availability:{frames:{}},name:x=>x.name}).render();
 const html=render('en');assert.match(html,/5<small> \/ 9/);assert.match(html,/Overall collection/);
 const card=id=>html.split('data-collection-progress="'+id+'"')[1].split('</article>')[0];
 assert.match(card('warframes'),/1 \/ 1/);assert.match(card('weapons'),/2 \/ 3/);assert.match(card('archwing'),/1 \/ 3/);assert.match(card('necramech'),/0 \/ 1/);assert.match(card('pets'),/1 \/ 1/);
 for(const id of categories.filter(x=>x!=='warframes'))assert.ok(html.includes('href="#'+id+'"'));
 assert.match(render('ru'),/Общая коллекция/);assert.match(render('ru'),/Питомцы/);
 const emptyHtml=homeView({language:'en',frames:[],state:empty(),collected,availability:{frames:{}},name:x=>x.name}).render();assert.doesNotMatch(emptyHtml,/NaN|Infinity|max="0"/);
});
test('companions include animals and sentinels, persist ownership, and share recipes and stock',()=>{
 const pets=catalog.equipment.filter(x=>x.category==='pets');assert.equal(pets.length,39);
 for(const name of ['Smeeta Kavat','Panzer Vulpaphyla','Carrier Prime','Lambeo Moa'])assert.ok(pets.some(x=>x.name===name));
 const pet=pets.find(x=>x.name==='Carrier Prime');assert.equal(pet.recipe.parts.length,3);
 const state=empty();state.frames[pet.id]={done:true,parts:{}};state.goals=[pet.id];state.stock.credits=0;
 assert.deepEqual(restoreProgress(JSON.parse(JSON.stringify(state)),all),state);assert.equal(demand([pet],state).size,0);
 assert.ok(pets.some(x=>!x.recipe));
});
