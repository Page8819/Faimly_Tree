'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/medicine.js');require('../public/living-context.js');const L=globalThis.LEGACY_LIVING_CONTEXT;
const p=(id,age=40,wealth=10000)=>({id,first:id,birthYear:2030-age,wealth,jobLevel:1,parentIds:[],adoptiveParentIds:[],formerPartners:[],bonds:{},medical:{conditions:[]},finance:{consumerDebt:0,mortgage:0},career:{jobId:'service'}});
test('illness of actual relative produces a named care situation',()=>{
 const robert=p('robert',69,8600),elaine=p('elaine',67,1000);robert.partnerId='elaine';elaine.partnerId='robert';
 elaine.medical.conditions.push({id:'arthritis',status:'active',stage:3});
 const e=L.propose({p:robert,people:{robert,elaine},year:2030,rnd:()=>0});
 assert.equal(e.kind,'care');assert.equal(e.targetId,'elaine');assert.match(e.text,/arthritis/i);
 assert.deepEqual(e.personIds,['robert','elaine']);
});
test('unemployed and indebted character triggers circumstances rather than generic prompts',()=>{
 const alex=p('alex',28,-2000);alex.career.jobId=null;alex.finance.consumerDebt=7000;
 const options=L.candidates(alex,{alex},2030);
 assert.ok(options.some(x=>x.kind==='debt'));assert.ok(options.some(x=>x.kind==='unemployed'));
});
test('result debits only affordable amount and references affected person',()=>{
 const parent=p('parent',70,1400),daughter=p('daughter',65);parent.partnerId='daughter';
 const e={kind:'care',targetId:'daughter',options:[['fund','Pay','Pay']]};
 const r=L.resolve({p:parent,event:e,option:'fund',people:{parent,daughter},year:2030});
 assert.equal(r.impact.wealth,-1400);assert.equal(parent.wealth,0);assert.deepEqual(r.others,['daughter']);
 assert.equal(L.resolve({p:parent,event:e,option:'unknown',people:{parent,daughter},year:2030}),null);
});
test('cooldowns prevent repeating the same crisis annually',()=>{
 const a=p('a',34);a.career.jobId=null;const o={p:a,people:{a},year:2030};
 const first=L.propose(o);assert.equal(first.kind,'unemployed');
 L.resolve({p:a,event:first,option:'apply',people:{a},year:2030});
 assert.equal(L.propose({...o,year:2031}),null);
});
