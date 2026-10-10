'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
const code=source.slice(source.indexOf('const TREE_LIMIT='),source.indexOf('function layoutGraph(){'));
function harness(count=2000){
 const people={};for(let i=0;i<count;i++){const id='p'+i;people[id]={id,first:'Person',last:String(i),gen:Math.floor(Math.log2(i+1)),parentIds:i?['p'+Math.floor((i-1)/2)]:[],adoptiveParentIds:[],partnerId:null,birthYear:1900+i};}
 const nodes=new Map();const node=s=>{if(!nodes.has(s))nodes.set(s,{classList:{toggle(){}},setAttribute(){}});return nodes.get(s)};
 const state={people,selectedId:'p0'};
 const c={state,scope:'focus',scene:[],needsFit:false,persons:()=>Object.values(state.people),get:id=>state.people[id]||null,partner:p=>state.people[p.partnerId]||null,$:node,$$:()=>[],full:p=>p.first+' '+p.last,toast(){}};
 vm.createContext(c);vm.runInContext(code+'\nfunction layoutGraph(){scene=visiblePeople().map(p=>({...p,p}));}',c);return c;
}
test('branches expand one relationship step, collapse, and preserve all 2,000 people',()=>{
 const c=harness(),before=JSON.stringify(c.state.people);c.setTreeScope('branches');
 assert.deepEqual(Array.from(c.scene,p=>p.id),['p0','p1','p2']);
 c.expandBranch('p1');assert.ok(c.scene.some(p=>p.id==='p3'));assert.ok(!c.scene.some(p=>p.id==='p7'));
 c.expandBranch('p3');assert.ok(c.scene.some(p=>p.id==='p7'));
 c.collapseBranch('p1');assert.deepEqual(Array.from(c.scene,p=>p.id),['p0','p1','p2']);
 assert.equal(JSON.stringify(c.state.people),before);
});
test('expansion is bounded and starting at a deep person reaches omitted relatives',()=>{
 const c=harness();c.setTreeScope('branches');
 for(let i=0;i<30;i++)for(const p of [...c.scene])c.expandBranch(p.id);
 assert.ok(c.scene.length<=60);assert.equal(Object.keys(c.state.people).length,2000);
 c.state.selectedId='p1999';c.setTreeScope('branches');assert.ok(c.scene.some(p=>p.id==='p1999'));assert.ok(c.scene.some(p=>p.id==='p999'));
 c.setTreeScope('focus');assert.ok(c.visiblePeople().length<=60);
});
test('adoption, shared relatives, and malformed cycles cannot duplicate or loop',()=>{
 const c=harness(12);c.state.people.p3.adoptiveParentIds=['p0'];c.state.people.p0.parentIds=['p3'];c.setTreeScope('branches');c.expandBranch('p3');
 const ids=Array.from(c.scene,p=>p.id);assert.ok(ids.includes('p3'));assert.equal(new Set(ids).size,ids.length);
});
test('wide families expand in batches and focus remains bounded',()=>{
 const c=harness();for(const p of Object.values(c.state.people))if(p.id!=='p0')p.parentIds=['p0'];
 c.setTreeScope('branches');assert.equal(c.scene.length,13);c.expandBranch('p0');assert.equal(c.scene.length,25);
 c.collapseBranch('p0');assert.equal(c.scene.length,1);c.setTreeScope('focus');assert.equal(c.visiblePeople().length,60);
});
test('2,000-person branch selection benchmark',t=>{
 const c=harness();c.setTreeScope('branches');const start=performance.now();for(let i=0;i<100;i++)c.visiblePeople();
 t.diagnostic('Average branch indexing/selection: '+((performance.now()-start)/100).toFixed(2)+' ms; 2,000 stored people, '+c.scene.length+' visible. Node benchmark, not iPhone frame timing.');
});
