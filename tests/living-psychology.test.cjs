'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/living-context.js');require('../public/living-psychology.js');
const P=globalThis.LEGACY_LIVING_PSYCHOLOGY;
const p=(id,wealth=50000)=>({id,first:id,wealth,bonds:{},traits:{agreeableness:80,conscientiousness:60,openness:45,extraversion:55,emotionality:40},needs:{stress:25,physical:70}});
test('motivations persist and reflect existing character traits',()=>{
 const r=p('r');const first=P.ensure(r);assert.equal(P.ensure(r),first);assert.ok(first.loyalty>45);
 assert.equal(P.goal(r,2030),'security');r.needs.stress=90;assert.equal(P.goal(r,2030),'stability');
});
test('independent relative can accept help and give money without forced control',()=>{
 const a=p('a',40000),b=p('b',400);a.bonds.b=90;b.bonds.a=90;
 const yes=P.negotiate({actor:a,target:b,people:{a,b},year:2030,action:'support',rnd:()=>0,controlledId:b.id});
 assert.equal(yes.accepted,true);assert.ok(yes.amount>0);assert.ok(a.wealth<40000);assert.ok(b.wealth>400);
 assert.equal(a.motivations.recentReactions[0].accepted,true);
});
test('controlled NPC refuses to spend money without player permission',()=>{
 const a=p('a',60000),b=p('b',0);
 const no=P.negotiate({actor:a,target:b,people:{a,b},year:2030,action:'support',rnd:()=>0,controlledId:'a'});
 assert.equal(no.accepted,false);assert.equal(a.wealth,60000);assert.equal(no.amount,0);
});
test('actual helpers are discovered from the family, not strangers',()=>{
 const p1=p('p1',0),p2=p('p2',50000),stranger=p('stranger',100000);
 p1.partnerId=p2.id;p2.partnerId=p1.id;
 assert.deepEqual(P.chooseHelpers(p1,{p1,p2,stranger},2040).map(x=>x.id),['p2']);
});
