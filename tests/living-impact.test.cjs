'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/living-impact.js');const I=globalThis.LEGACY_LIVING_IMPACT;
test('impact comparison reports actual changes but never invents unchanged values',()=>{
 const state={people:{p:{id:'p',wealth:6000,needs:{stress:40,energy:65,mental:70},commitments:[],career:{jobId:'service'}}}};
 const p=state.people.p,first=I.snapshot(state,p,null);
 p.wealth-=1400;p.commitments.push({status:'active',hours:12,yearlyCost:350});
 const delta=I.compare(first,I.snapshot(state,p,null));
 assert.deepEqual(delta.map(x=>x.field),['wealth','commitmentHours','yearlyCommitmentCost']);
 assert.equal(delta.find(x=>x.field==='wealth').delta,-1400);
});
test('active story markers and family legacy queries distinguish archived and active arcs',()=>{
 const state={storylines:[{id:'a',status:'active',participants:['p','q'],urgency:3,startedYear:2030},{id:'b',status:'resolved',participants:['p'],startedYear:2025}],
 storylineHistory:[{id:'c',status:'resolved',participants:['p'],startedYear:2017}],
 decisionLedger:[{id:'d',participants:['p'],kind:'care'}]};
 assert.deepEqual(I.activeFor(state,'p').map(x=>x.id),['a']);
 const legacy=I.lineage(state,'p');
 assert.equal(legacy.active,1);assert.equal(legacy.stories,3);assert.equal(legacy.decisions,1);
 assert.equal(I.activeFor(state,'q').length,1);assert.equal(I.activeFor(state,'stranger').length,0);
});
