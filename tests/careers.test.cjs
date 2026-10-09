'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/careers.js');const C=globalThis.LEGACY_CAREERS;
const person=(credentials=['hs'])=>({birthYear:2000,education:1,schooling:{credentials},jobLevel:1,retired:false,needs:{energy:65,agency:60},
 medical:{conditions:[]},wealth:5000});
test('career catalog includes qualified pathways in multiple industries',()=>{
 const list=Object.values(C.jobs);assert.ok(list.length>=20);
 assert.ok(list.some(j=>j.sector==='Trades'));
 assert.ok(list.some(j=>j.sector==='Healthcare'));
 assert.ok(list.some(j=>j.sector==='Technology'));
});
test('education and prior experience gate professional jobs',()=>{
 const p=person(['hs']);
 assert.equal(C.canApply(p,'physician',29).ok,false);
 assert.equal(C.canApply(p,'carpenter',29).ok,false);
 p.schooling.credentials.push('trade');
 assert.equal(C.canApply(p,'carpenter',29).ok,true);
});
test('hiring gives named job and salary, promotions improve income',()=>{
 const p=person(['hs','trade']);
 const r=C.apply(p,'carpenter',27,2027,()=>0);
 assert.equal(r.ok,true);
 assert.equal(C.details(p,27).current.name,'Carpenter');
 const original=C.income(p);
 const promotion=C.promote(p,2028,()=>0);assert.ok(promotion.ok);
 assert.ok(C.income(p)>original);
 assert.equal(C.apply(p,'electrician',27,2027,()=>0).ok,false);
});
test('serious untreated condition reduces working capacity',()=>{
 const p=person();C.ensure(p);const baseline=C.income(p);
 p.medical.conditions.push({id:'pneumonia',status:'active',stage:4,treated:false});
 assert.ok(C.income(p)<baseline);
 p.medical.conditions[0].treated=true;
 assert.equal(C.income(p),baseline);
});
test('annual career progression is idempotent and preserves existing save paths',()=>{
 const p=person();const c=C.ensure(p),n=C.annual(p,28,2028,()=>.5,false);
 const exp=c.experience;C.annual(p,28,2028,()=>0,false);
 assert.equal(c.experience,exp);assert.ok(Array.isArray(n));
 const old={birthYear:1970,jobLevel:4,retired:false,schooling:{credentials:['hs']},medical:{conditions:[]}};
 assert.equal(C.details(old,60).current.name,'Store manager');
});
