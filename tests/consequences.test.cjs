'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../public/consequences.js');
const C=globalThis.LEGACY_CONSEQUENCES;
const person=()=>({wealth:5000,education:0,lifePath:null,jobLevel:1});
test('enrollment milestones preserve decisions without duplicating education fees or qualifications',()=>{
 const p=person();C.apply(p,'college',2044,'Enrolled in bachelor program');
 assert.equal(p.lifePath.calling,'Academic student');
 assert.equal(p.lifePath.educationDebt,0);
 assert.equal(p.lifePath.skills,0);
 assert.equal(p.lifePath.decisions[0].year,2044);
 C.annual(p,25,2051);
 assert.equal(p.lifePath.educationDebt,0);
});
test('successful business changes future annual finances',()=>{
 const p=person();C.apply(p,'business',2045,'Venture succeeded');
 assert.equal(p.lifePath.enterprise,1);
 const prior=p.wealth;C.annual(p,26,2046);assert.ok(p.wealth>prior);
});
test('child upbringing records parents without overwriting identity',()=>{
 const p=person(),child=person();p.wealth=100000;C.apply(p,'quality',2045);
 C.childStart(child,[p]);assert.ok(child.familyStart.support>50);
 assert.equal(child.lifePath,null);C.annual(child,18,2060);
 assert.ok(child.wealth>5000);
});
test('older saves obtain default persistent fields',()=>{
 const p=person();delete p.lifePath;assert.equal(C.ensure(p).calling,'Undecided');
 assert.equal(C.careerOdds(p),.048);
});
