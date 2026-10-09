'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
require('../public/succession.js');const S=globalThis.LEGACY_SUCCESSION;
function p(id,parentIds=[],gen=0,deathYear=null){return {id,first:id,last:'Family',birthYear:2000+gen*20,deathYear,gen,parentIds,adoptiveParentIds:[],inFamily:true,wealth:15000,city:'Boston'};}
function world(){
 const ancestor=p('old',[],0,2073),child=p('child',['old'],1),grandchild=p('grandchild',['child'],2),sibling=p('sibling',[],0),estranged=p('extended',[],0);
 child.adoptiveParentIds=[];
 const people={old:ancestor,child,grandchild,sibling,extended:estranged};
 return {year:2073,people,controlledId:'old',selectedId:'old',pendingSuccession:null,successionLog:[]};
}
test('descendants of deceased person are prioritized and correctly labelled',()=>{
 const s=world(),d=S.descendants(s,'old');assert.equal(d.get('child'),1);assert.equal(d.get('grandchild'),2);
 const c=S.candidates(s,'old');assert.equal(c[0].id,'child');assert.equal(c[0].role,'Child');assert.equal(c[1].role,'Grandchild');
});
test('adopted descendants are eligible and deceased relatives are excluded',()=>{
 const s=world();s.people.child.parentIds=[];s.people.child.adoptiveParentIds=['old'];s.people.grandchild.deathYear=2060;
 const c=S.candidates(s,'old');assert.equal(c[0].id,'child');assert.ok(!c.some(p=>p.id==='grandchild'));
});
test('succession is pending and cannot select an invalid heir',()=>{
 const s=world(),pending=S.prepare(s,'old');assert.equal(pending.fromId,'old');
 const before=s.controlledId;assert.equal(S.choose(s,'fake'),null);assert.equal(s.controlledId,before);
 const transition=S.choose(s,'child');assert.equal(transition.to.id,'child');
 assert.equal(s.controlledId,'child');assert.equal(s.pendingSuccession,null);assert.equal(s.successionLog.length,1);
 assert.equal(s.people.child.wealth,15000);
});
test('a dynasty with no heirs can be recognized',()=>{
 const s=world();for(const p of Object.values(s.people)){if(p.id!=='old')p.deathYear=2065;}
 const prepared=S.prepare(s,'old');assert.deepEqual(prepared.candidateIds,[]);
 assert.equal(S.choose(s,'old'),null);
});
