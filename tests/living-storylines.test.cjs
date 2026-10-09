'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/living-storylines.js');const S=globalThis.LEGACY_STORYLINES;
const make=()=>{
 const r={id:'r',first:'Robert',wealth:8600,birthYear:1960,commitments:[{id:'c1',kind:'care:care',storyKey:'living-care',startYear:2030,endYear:2033,hours:12,yearlyCost:250,status:'active'}],needs:{stress:35,energy:60},bonds:{}};
 const e={id:'e',first:'Elaine',wealth:1200,birthYear:1964,commitments:[],medical:{conditions:[]},bonds:{}};
 return {year:2030,controlledId:'r',people:{r,e},pendingChoice:null};
};
test('a decision opens one persistent multi-year storyline',()=>{
 const s=make(),record={id:'d1',year:2030,personId:'r',result:'Will provide care.'},event={kind:'care',key:'living-care',targetId:'e',personIds:['r','e'],title:'Elaine needs help',cause:'arthritis'};
 const a=S.fromDecision(s,record,event);const b=S.fromDecision(s,{...record,id:'d2'},event);
 assert.equal(a,b);assert.equal(s.storylines.length,1);assert.deepEqual(a.decisionIds,['d1','d2']);
 assert.equal(S.latest(s,'e')[0].id,a.id);
});
test('annual resource commitments charge once and offer follow-up',()=>{
 const s=make();S.fromDecision(s,{id:'d1',year:2030,personId:'r',result:'Offer time.'},{kind:'care',key:'living-care',targetId:'e',personIds:['r','e'],cause:'arthritis',title:'Care'});
 const before=s.people.r.wealth,first=S.annual(s,2031,()=>.5);
 assert.equal(s.people.r.wealth,before-250);assert.equal(first.kind,'followup');
 S.annual(s,2031,()=>.5);assert.equal(s.people.r.wealth,before-250);
 const response=S.decide(s,first.storyId,'r','adjust',2031);assert.equal(response.ok,true);
 assert.ok(s.people.r.commitments[0].hours<12);
});
test('followup completion cancels obligations without erasing narrative history',()=>{
 const s=make(),arc=S.fromDecision(s,{id:'d1',year:2030,personId:'r',result:'Care'}, {key:'living-care',kind:'care',targetId:'e',personIds:['r','e'],title:'Care'});
 const response=S.decide(s,arc.id,'r','finish',2031);assert.equal(response.ok,true);
 assert.equal(arc.status,'resolved');assert.equal(s.people.r.commitments[0].status,'cancelled');
 assert.ok(S.latest(s,'r')[0].history.some(x=>x.type==='resolved')===false); // outcome is recorded separately
 assert.ok(arc.outcome);
});
test('death resolves a storyline and never charges deceased characters',()=>{
 const s=make(),arc=S.fromDecision(s,{id:'d1',year:2030,personId:'r',result:'Care'}, {key:'living-care',kind:'care',targetId:'e',personIds:['r','e']});
 s.people.r.deathYear=2031;S.annual(s,2031,()=>.5);
 assert.equal(arc.status,'resolved');assert.equal(s.people.r.wealth,8600);
});
