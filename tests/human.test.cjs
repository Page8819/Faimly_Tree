'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/human.js');
const H=globalThis.LEGACY_HUMAN;
const make=()=>({birthYear:2000,traits:{openness:65,conscientiousness:63,agreeableness:48,emotionality:52}});
test('legacy person receives bounded persisted needs',()=>{
 const p=make();const n=H.ensure(p,25);
 assert.ok(n.physical>0&&n.physical<=100);
 assert.deepEqual(H.snapshot(p,25),n);
 assert.equal(H.ensure(p,65),n,'no reinitialization on aging');
});
test('needs advance at most once annually and respond to hardship and support',()=>{
 const p=make();const before=H.snapshot(p,28);
 const once=H.annual(p,{age:28,year:2028,financialPressure:80,support:10,rnd:()=>.5});
 const snapshot={...once};H.annual(p,{age:28,year:2028,financialPressure:0,support:100,rnd:()=>.5});
 assert.deepEqual(p.needs,snapshot);
 assert.ok(p.needs.stress>=before.stress);
});
test('quality time lowers stress, business creates pressure, all needs remain bounded',()=>{
 const p=make();const stress=H.ensure(p,25).stress;
 H.effect(p,'quality');assert.ok(p.needs.stress<stress);
 H.effect(p,'business');assert.ok(p.needs.stress>stress);
 for(let i=0;i<150;i++)H.annual(p,{age:25+i,year:2025+i,financialPressure:200,support:0,rnd:()=>1});
 for(const value of Object.values(p.needs))assert.ok(value>=0&&value<=100);
 assert.ok(H.careerModifier(p)>=.75&&H.careerModifier(p)<=1.2);
 assert.ok(H.deathRiskModifier(p)>=.88&&H.deathRiskModifier(p)<=1.16);
});
