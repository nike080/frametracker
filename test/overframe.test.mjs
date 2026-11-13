import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {overframeUrl} from '../public/overframe.js';
const {frames} = JSON.parse(readFileSync(new URL('../public/catalog.json',import.meta.url)));
test('every catalog frame has a shared family page on Overframe',()=>{
 for(const frame of frames){
  assert.match(overframeUrl(frame), /^https:\/\/overframe\.gg\/items\/arsenal\/\d+\/[a-z0-9-]+\/$/,frame.name);
  const base=frames.find(x=>x.name===frame.name.replace(/ (Prime|Umbra)$/, ''));
  if(base) assert.equal(overframeUrl(frame),overframeUrl(base));
 }
 assert.equal(overframeUrl({name:'Unknown Prime'}),null);
});
