'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('game boots, offers a choice, advances time and hands off the family',async()=>{
 const els=new Map();
 const ctx=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{})});
 function node(selector){
  if(!els.has(selector))els.set(selector,{
   innerHTML:'',textContent:'',value:'',scrollTop:0,dataset:{},
   classList:(()=>{const values=new Set();return {add(x){values.add(x)},remove(x){values.delete(x)},toggle(x,force){const enable=force===undefined?!values.has(x):force;enable?values.add(x):values.delete(x);return enable},contains(x){return values.has(x)}}})(),
   getBoundingClientRect(){return {width:390,height:360,left:0,top:0}},
   getContext(){return ctx},
   addEventListener(type,callback){(this.handlers??={})[type]=callback},setPointerCapture(){},setAttribute(){},appendChild(){},remove(){},
   get clientWidth(){return 390}
  });return els.get(selector);
 }
 const storage={};
 const errors=[];
 const sandbox={
  console:{log(){},warn(){},error(e){errors.push(String(e))}},
  document:{querySelector:node,querySelectorAll(){return []},addEventListener(){},visibilityState:'visible'},
  localStorage:{getItem(k){return storage[k]||null},setItem(k,v){storage[k]=v}},
  location:{protocol:'https:'},navigator:{},devicePixelRatio:1,
  setTimeout,clearTimeout,ResizeObserver:class{observe(){}},
  requestAnimationFrame(f){f()},Intl,Date,Math,Blob,URL
 };
 sandbox.window=sandbox;
 for(const name of ['human.js','consequences.js','events.js','succession.js','app.js']){
  const source=fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
  vm.runInNewContext(source,sandbox,{filename:name,timeout:2000});
 }
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(errors,[],'startup should not log errors');
 const api=sandbox.LEGACY_TEST;
 assert.ok(api,'integration hooks installed');
 let state=api.getState();assert.equal(state.year,2026);
 assert.equal(Object.keys(state.people).length,4);
 assert.ok(state.people[state.controlledId].needs?.physical>0);
 // The immersive view hides the permanent sidebar and uses a character sheet.
 const css=fs.readFileSync(path.join(__dirname,'../public/styles.css'),'utf8');
 assert.match(css,/\.app\.immersive-tree\{grid-template-rows/);
 assert.match(css,/#profile-panel\{display:none!important\}/);
 api.showPersonStats(state.controlledId);
 assert.match(node('#modal-content').innerHTML,/Family overview/);
 assert.match(node('#modal-content').innerHTML,/person-sheet-tabs/);
 assert.doesNotMatch(node('#modal-content').innerHTML,/person-sheet-scroll/);
 assert.ok(node('#modal-backdrop').classList.contains('person-profile-backdrop'));
 assert.ok(node('#modal-content').classList.contains('person-profile-dialog'));
 api.showPersonStats(state.controlledId,'stats');
 assert.match(node('#modal-content').innerHTML,/Wellbeing/);
 assert.match(node('#modal-content').innerHTML,/Physical health/);
 assert.match(node('#modal-content').innerHTML,/Emotional sensitivity/);
 api.showPersonStats(state.controlledId,'stats',1);
 assert.match(node('#modal-content').innerHTML,/Career, learning &amp; finances/);
 assert.match(node('#modal-content').innerHTML,/Education debt/);
 api.showPersonStats(state.controlledId,'family');
 assert.match(node('#modal-content').innerHTML,/Family connections/);
 api.showPersonStats(state.controlledId,'actions');
 assert.match(node('#modal-content').innerHTML,/Grow family/);
 api.showPersonStats(state.controlledId,'history');
 assert.match(node('#modal-content').innerHTML,/Family chronicle/);
 // Clicks within the panel stay open; taps on the dark backdrop close it.
 node('#modal-backdrop').handlers.click({target:{id:'modal-content'}});
 assert.equal(node('#modal-backdrop').classList.contains('hidden'),false);
 node('#modal-backdrop').handlers.click({target:{id:'modal-backdrop'}});
 assert.equal(node('#modal-backdrop').classList.contains('hidden'),true);
 assert.equal(node('#modal-backdrop').classList.contains('person-profile-backdrop'),false);
 api.showPersonStats(state.controlledId);
 node('#person-sheet-close').onclick();
 assert.equal(node('#modal-backdrop').classList.contains('hidden'),true);
 assert.match(css,/padding-top:max\(66px,calc\(env\(safe-area-inset-top,0px\) \+ 12px\)\)/);
 assert.match(css,/\.person-sheet-screen\{[^}]*overflow:hidden/);
 // Hold on a real rendered canvas node: long press opens stats, tap selects.
 const scene=api.getScene(),cam=api.getCamera(),first=scene[0],canvas=node('#tree-canvas');
 assert.ok(first&&canvas.handlers?.pointerdown&&canvas.handlers?.pointerup);
 const position={clientX:cam.x+first.x*cam.scale,clientY:cam.y+first.y*cam.scale};
 const evt=(pointerId)=>({pointerId,...position,preventDefault(){}});
 node('#modal-content').innerHTML='unchanged';
 canvas.handlers.pointerdown(evt(1));
 await new Promise(resolve=>setTimeout(resolve,575));
 assert.match(node('#modal-content').innerHTML,/Family overview/);
 canvas.handlers.pointerup(evt(1));
 node('#person-sheet-close').onclick();
 // Dragging must cancel the long-press action and never open a character sheet.
 node('#modal-content').innerHTML='unchanged';
 canvas.handlers.pointerdown(evt(2));
 canvas.handlers.pointermove({pointerId:2,clientX:position.clientX+30,clientY:position.clientY+30});
 await new Promise(resolve=>setTimeout(resolve,560));
 assert.equal(node('#modal-content').innerHTML,'unchanged');
 canvas.handlers.pointerup({pointerId:2,clientX:position.clientX+30,clientY:position.clientY+30});
 api.advance(1);
 state=api.getState();
 assert.equal(state.year,2027);
 assert.equal(state.pendingChoice?.kind,'direction');
 assert.match(node('#modal-content').innerHTML,/Where does your ambition lead/);
 api.resolveLifeChoice('stable');
 assert.equal(state.pendingChoice,null);
 assert.equal(state.events.at(-1).type,'choice');
 assert.ok(state.people[state.controlledId].lifePath.decisions.length);
 // Simulate a later controlled character death to verify succession UI and handoff.
 const original=state.controlledId;state.people[original].deathYear=state.year;
 api.advance(1);
 assert.equal(state.pendingSuccession.fromId,original);
 assert.match(node('#modal-content').innerHTML,/Choose the next generation/);
 const selected=state.pendingSuccession.candidateIds[0];
 assert.ok(selected);
 api.chooseSuccessor(selected);
 assert.equal(state.controlledId,selected);
 assert.equal(state.pendingSuccession,null);
 assert.equal(state.events.at(-1).type,'succession');
 assert.deepEqual(errors,[],'simulation should not log errors');
});
