'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../public/consequences.js');require('../public/events.js');
const E=globalThis.LEGACY_EVENTS;
const person=(id,birthYear=2000)=>({id,first:'Alex',birthYear,deathYear:null,sex:'male',parentIds:[],adoptiveParentIds:[],formerPartners:[],partnerId:null,jobLevel:0,education:0,wealth:900,bonds:{},traits:{conscientiousness:50}});
test('financial emergencies appear only for eligible situations',()=>{
 const p=person('p1');const e=E.propose({p,people:{p1:p},year:2025,rnd:()=>.5});
 assert.equal(e.key,'debt');assert.ok(e.options.length>=3);
 const result=E.resolve({p,people:{p1:p},year:2025,event:e,option:'budget',rnd:()=>.5});
 assert.match(result.result,/expense/);assert.equal(p.wealth,-200);assert.equal(p.lifeEventHistory.debt,2025);
 assert.equal(E.propose({p,people:{p1:p},year:2026,rnd:()=>.5}),null);
});
test('family support transfers money and strengthens bonds',()=>{
 const p=person('p1');p.wealth=10000;const parent=person('p2',1970);parent.wealth=30000;
 p.parentIds=[parent.id];const people={p1:p,p2:parent};
 const event={key:'debt',options:[['ask','Ask','Ask for help']]};
 const result=E.resolve({p,people,year:2030,event,option:'ask',rnd:()=>.5});
 assert.deepEqual(result.others,['p2']);assert.ok(p.bonds.p2>50);
 assert.ok(parent.wealth<30000);
});
test('accepting relocation changes location and cost',()=>{
 const p=person('p1');p.city='Boston';p.jobLevel=2;p.wealth=20000;
 const event={key:'offer',options:[['relocate','Move','Relocate']]};
 const result=E.resolve({p,people:{p1:p},year:2028,event,option:'relocate',rnd:()=>.1,cities:['Boston','Denver']});
 assert.equal(p.city,'Denver');assert.ok(p.wealth<=17000);
 assert.match(result.result,/Relocat|move/i);
});
test('invalid event option leaves state unchanged',()=>{
 const p=person('p1');const original=JSON.stringify(p);
 assert.equal(E.resolve({p,people:{p1:p},year:2028,event:{key:'debt',options:[['budget','Budget','X']]},option:'wrong',rnd:()=>0}),null);
 assert.equal(JSON.stringify(p),original);
});
