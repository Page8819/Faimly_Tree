'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/attention.js');
const A=globalThis.LEGACY_ATTENTION;
const world=()=>({
 year:2113,
 people:{
  p1:{id:'p1',first:'Mia',inFamily:true,deathYear:null},
  p2:{id:'p2',first:'Alex',inFamily:true,deathYear:null},
  p3:{id:'p3',first:'Other',inFamily:false,deathYear:null}
 },
 events:[],nextEvent:1
});
function event(state,type,message,personIds,year=state.year){
 const e={id:state.nextEvent++,type,message,year,personIds};
 state.events.push(e);A.add(state,e);return e;
}
test('important events create persistent alerts only for relevant family members',()=>{
 const s=world();
 event(s,'health','Mia was diagnosed with pneumonia.',['p1','p3']);
 assert.equal(A.unread(s).length,1);
 assert.equal(A.unread(s)[0].personId,'p1');
 assert.equal(A.unread(s)[0].priority,4);
 assert.equal(A.counts(s).get('p1').count,1);
 assert.equal(A.counts(s).has('p3'),false);
});
test('routine annual records and ordinary choices do not flood the inbox',()=>{
 const s=world();
 event(s,'choice','Alex chose to maintain stability.',['p2']);
 event(s,'milestone','One more year has passed.',['p1']);
 event(s,'health','Primary care visit cost $150.',['p1']);
 event(s,'career','Alex completed a job application.',['p2']);
 assert.equal(A.unread(s).length,0);
});
test('multiple events for one person in a year are grouped, showing highest urgency',()=>{
 const s=world();
 event(s,'career','Alex was hired as a carpenter.',['p2']);
 event(s,'relationship','Alex and Mia separated.',['p2','p1']);
 event(s,'death','Alex died at age 40.',['p2']);
 const alert=A.unread(s,'p2')[0];
 assert.equal(A.unread(s,'p2').length,1);
 assert.equal(alert.priority,4);
 assert.equal(alert.kind,'loss');
 assert.equal(alert.eventIds.length,3);
 assert.equal(A.unread(s,'p1').length,1);
});
test('review and dismissal preserve the underlying chronicle and do not revive old alerts',()=>{
 const s=world();event(s,'birth','Mia had a child.',['p1','p2']);
 let alert=A.unread(s)[0],count=s.events.length;
 assert.equal(A.dismiss(s,alert.id),true);
 assert.equal(A.dismiss(s,alert.id),false);
 assert.equal(A.unread(s).length,0);
 event(s,'health','Mia developed symptoms of an illness.',['p1'],2114);
 assert.equal(A.readPerson(s,'p1'),1);
 assert.equal(A.unread(s).length,0);
 assert.equal(s.events.length,count+1);
});
test('older saves start with an empty inbox, and new alerts survive serialization',()=>{
 const s=world();
 event(s,'death','Alex died.',['p2']);
 const clone=JSON.parse(JSON.stringify(s));delete clone.attention;
 A.ensure(clone);assert.equal(A.unread(clone).length,0);
 event(clone,'relationship','Mia and Alex separated.',['p1','p2'],2114);
 const restored=JSON.parse(JSON.stringify(clone));
 assert.equal(A.unread(restored).length,2);
 assert.equal(A.dismissAll(restored),2);
 assert.equal(A.unread(restored).length,0);
});
test('historical setup can be muted; large alert lists are bounded',()=>{
 const s=world();A.ensure(s).enabled=false;
 event(s,'birth','Mia was born.',['p1'],2026);
 assert.equal(A.unread(s).length,0);
 A.ensure(s).enabled=true;
 for(let year=2027;year<2227;year++)event(s,'health','Mia diagnosed with asthma.',['p1'],year);
 assert.ok(s.attention.items.length<=120);
 assert.equal(A.unread(s)[0].year,2226);
});
