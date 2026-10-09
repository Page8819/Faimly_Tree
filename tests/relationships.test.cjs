'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/relationships.js');const R=globalThis.LEGACY_RELATIONSHIPS;
const make=(id,wealth=10000,birthYear=2000)=>({id,first:id,wealth,birthYear,city:'New York',deathYear:null,parentIds:[],adoptiveParentIds:[],partnerId:null,bonds:{},social:{},needs:{stress:35},familyStart:{security:8,support:50},inFamily:true});
test('relationships track trust, closeness and conflict separately',()=>{
 const a=make('a'),b=make('b');
 let before=R.relation(a,b);R.affect(a,b,24,2027,'helped with childcare');
 const after=R.relation(a,b);
 assert.ok(after.trust>before.trust&&after.closeness>before.closeness&&after.conflict<before.conflict);
 assert.equal(a.social.b.history.at(-1).year,2027);
 assert.equal(b.social.a.history.at(-1).reason,'helped with childcare');
});
test('high-conflict partnership has higher break-up risk',()=>{
 const a=make('a'),b=make('b');
 a.partnerId=b.id;b.partnerId=a.id;R.tie(a,b);
 const baseline=R.fragility(a,b);
 a.social.b.conflict=100;b.social.a.conflict=100;
 a.social.b.trust=5;b.social.a.trust=5;
 assert.ok(R.fragility(a,b)>baseline);
});
test('childhood support adapts to actual parenting and remains persistent',()=>{
 const parent=make('parent',95000,1976),child=make('child',0,2020);
 child.parentIds=['parent'];const state={people:{parent,child},controlledId:'child'};
 R.affect(parent,child,26,2026,'caregiving');
 const before=child.familyStart.support;
 R.annual(state,2026,()=>.5);
 assert.ok(child.familyStart.support>before);
 assert.ok(child.familyStart.security>=8);
 assert.ok(R.relation(parent,child).sharedYears>=1);
});
test('autonomous support never spends controlled-person funds',()=>{
 const donor=make('donor',100000),recipient=make('recipient',-4000);
 R.affect(donor,recipient,30,2026);donor.social.recipient.trust=85;recipient.social.donor.trust=85;const state={people:{donor,recipient},controlledId:'donor'};
 const before=donor.wealth;R.annual(state,2027,()=>0);
 assert.equal(donor.wealth,before);
 state.controlledId='recipient';R.annual(state,2028,()=>0);
 assert.ok(donor.wealth<before);
 assert.ok(recipient.wealth>-4000);
});
test('legacy bonds are converted lazily and yearly history stays bounded',()=>{
 const a=make('a'),b=make('b');a.bonds.b=77;b.bonds.a=77;
 assert.ok(R.relation(a,b).trust>60);
 for(let y=2020;y<2070;y++)R.affect(a,b,1,y,'annual gathering');
 assert.ok(a.social.b.history.length<=20);
});
