'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/living-context.js');require('../public/living-decisions.js');
const D=globalThis.LEGACY_LIVING_DECISIONS;
const p=(id,wealth=6000)=>({id,first:id,birthYear:1980,wealth,needs:{energy:65},career:{jobId:'service'},commitments:[],bonds:{}});
const setup=()=>{const r=p('r'),e=p('e');r.partnerId='e';e.partnerId='r';const s={year:2040,nextEvent:1,people:{r,e},decisionLedger:[]};return {r,e,s};};
test('preview describes guaranteed cost and uncertain health without promising recovery',()=>{
 const {r,e,s}=setup(),event={key:'living-care',kind:'care',targetId:'e',options:[['fund','Pay','Pay']]};
 const v=D.preview(r,event,'fund',s.people,2040);
 assert.equal(v.cashCost,2400);assert.equal(v.ok,true);assert.match(v.uncertain,/uncertain/);
});
test('commit applies action once, records exact before and after, and creates time commitment',()=>{
 const {r,e,s}=setup(),event={key:'living-care',kind:'care',cause:'arthritis',personIds:['r','e'],targetId:'e',options:[['fund','Pay','Pay']]};
 const done=D.commit({state:s,p:r,event,action:'fund',year:2040});
 assert.equal(done.ok,true);assert.equal(r.wealth,3600);
 assert.equal(s.decisionLedger.length,1);assert.equal(done.record.changes[0].delta,-2400);
 assert.equal(r.commitments[0].yearlyCost,350);
 assert.equal(D.preview(r,event,'fund',s.people,2040).ok,false);
});
test('resource budgets prevent impossible promises',()=>{
 const {r,e,s}=setup();r.wealth=0;
 const event={key:'living-care',kind:'care',targetId:e.id,options:[['fund','Pay','Pay']]};
 const res=D.commit({state:s,p:r,event,action:'fund',year:2040});
 assert.equal(res.ok,false);assert.equal(s.decisionLedger.length,0);
 r.wealth=9000;r.commitments.push({kind:'care:care',targetId:'e',hours:30,status:'active'});
 assert.equal(D.preview(r,{kind:'care',targetId:'e',options:[['care','Care','Care']]},'care',s.people,2040).ok,false);
});
test('old-world state gets an empty safe ledger and resource lists',()=>{
 const state={people:{r:p('r')}};
 delete state.people.r.commitments;assert.deepEqual(D.ensure(state),[]);
 assert.ok(Array.isArray(state.people.r.commitments));
});
