'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/medicine.js');const M=globalThis.LEGACY_MEDICINE;
const person=()=>({birthYear:1980,wealth:15000,needs:{physical:80,mental:65,stress:45}});
test('medical record migrates from a legacy person and remains persistent',()=>{
 const p=person();assert.equal(M.ensure(p).conditions.length,0);
 const c=M.add(p,'diabetes',2028,true);assert.equal(c.id,'diabetes');
 assert.equal(M.add(p,'diabetes',2028,true),null);assert.equal(M.current(p).active.length,1);
});
test('preventive checkup reveals conditions; treatment modifies severity and finances',()=>{
 const p=person(),c=M.add(p,'hypertension',2027,false);
 let result=M.care(p,'checkup',2028,()=>0);assert.equal(result.ok,true);
 assert.equal(c.diagnosed,true);assert.equal(result.cost,110);
 result=M.care(p,'medication',2028,()=>0);assert.equal(result.helped,1);assert.ok(c.treated);
 assert.equal(p.wealth,15000-110-200);
 assert.equal(M.care(p,'checkup',2028,()=>0).ok,false);
});
test('untreated severe disease can cause a recorded condition-specific death',()=>{
 const p=person(),c=M.add(p,'heart',2055,true);c.stage=4;
 const outcome=M.annual(p,77,2056,()=>0);
 assert.match(outcome.cause,/heart disease/);
 assert.equal(M.annual(p,77,2056,()=>1).cause,null);
});
test('chronic illness persists, ordinary infection can recover, and age limits matter',()=>{
 const p=person();M.add(p,'asthma',2040,true);M.add(p,'infection',2040,true);
 M.annual(p,40,2041,()=>.5);
 assert.ok(M.conditions(p).some(c=>c.id==='asthma'));
 assert.ok(!M.conditions(p).some(c=>c.id==='infection'));
 const kid=person();M.annual(kid,5,2026,()=>1);assert.equal(M.current(kid).active.length,0);
});
