'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/education.js');const E=globalThis.LEGACY_EDUCATION;
const person=(education=0,wealth=12000)=>({birthYear:2000,education,wealth,needs:{mental:60},lifePath:{skills:0,educationDebt:0}});
test('legacy education level maps into credentials without losing old records',()=>{
 const p=person(3);assert.ok(E.has(p,'bachelor'));assert.ok(E.has(p,'hs'));assert.equal(E.ensure(p).current,null);
});
test('prerequisites and age restrictions are enforced',()=>{
 const p=person(0);assert.equal(E.canEnroll(p,'medicine',23).ok,false);
 assert.equal(E.canEnroll(p,'ged',15).ok,false);
 assert.equal(E.canEnroll(p,'ged',18).ok,true);
});
test('apprenticeships take years and cost money while granting recognized qualification',()=>{
 const p=person(1,10000);const enrolled=E.enroll(p,'trade',18,2026);
 assert.equal(enrolled.ok,true);assert.equal(p.schooling.current.years,3);
 E.annual(p,19,2027,()=>.9);E.annual(p,20,2028,()=>.9);
 assert.equal(E.has(p,'trade'),false);
 const result=E.annual(p,21,2029,()=>.9);
 assert.ok(result.some(x=>x.includes('Completed')));assert.ok(E.has(p,'trade'));assert.equal(p.education,2);
});
test('school can be delayed by illness and never completes twice in one year',()=>{
 const p=person(1),r=E.enroll(p,'it',22,2030);assert.ok(r.ok);
 p.medical={conditions:[{id:'pneumonia',status:'active',stage:3,treated:false}]};
 assert.ok(E.annual(p,23,2031,()=>0).some(x=>x.includes('delayed')));
 assert.deepEqual(E.annual(p,23,2031,()=>1),[]);
 assert.equal(E.has(p,'it'),false);
 assert.ok(E.annual(p,24,2032,()=>.8).some(x=>x.includes('Completed')));
});
test('college debt is explicit and has a finite upper bound per enrollment',()=>{
 const p=person(1,2000);E.enroll(p,'bachelor',19,2026);
 assert.ok(p.lifePath.educationDebt>0);assert.ok(p.wealth>=0);
 assert.equal(E.canEnroll(p,'associate',20).ok,false);
});
