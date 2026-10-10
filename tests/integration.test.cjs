'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('game boots, offers a choice, advances time and hands off the family',async()=>{
 const els=new Map();
 const ctx=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{})});
 function node(selector){
  if(!els.has(selector))els.set(selector,{
   innerHTML:'',textContent:'',value:'',scrollTop:0,dataset:{},
   classList:(()=>{const values=new Set();return {add(...xs){xs.forEach(x=>values.add(x))},remove(...xs){xs.forEach(x=>values.delete(x))},toggle(x,force){const enable=force===undefined?!values.has(x):force;enable?values.add(x):values.delete(x);return enable},contains(x){return values.has(x)}}})(),
   getBoundingClientRect(){return {width:390,height:360,left:0,top:0}},
   getContext(){return ctx},
   showModal(){this.open=true},close(){this.open=false},focus(){},
   addEventListener(type,callback){(this.handlers??={})[type]=callback},setPointerCapture(){},setAttribute(){},appendChild(){},remove(){},
   get clientWidth(){return 390}
  });return els.get(selector);
 }
 const storage={};
 const errors=[];const documentHandlers={};const fakeIntervals=new Map();let nextTimer=1;
 const sandbox={
  console:{log(){},warn(){},error(e){errors.push(String(e))}},
  document:{querySelector:node,querySelectorAll(){return []},addEventListener(type,handler){documentHandlers[type]=handler},visibilityState:'visible'},
  localStorage:{getItem(k){return storage[k]||null},setItem(k,v){storage[k]=v}},
  location:{protocol:'https:'},navigator:{},devicePixelRatio:1,
  setTimeout,clearTimeout,setInterval(handler){const id=nextTimer++;fakeIntervals.set(id,handler);return id},clearInterval(id){fakeIntervals.delete(id)},ResizeObserver:class{observe(){}},
  requestAnimationFrame(f){f()},Intl,Date,Math,Blob,URL
 };
 sandbox.window=sandbox;
 for(const name of ['careers.js','education.js','medicine.js','human.js','economy.js','consequences.js','events.js','succession.js','relationships.js','living-context.js','living-psychology.js','living-decisions.js','living-storylines.js','living-impact.js','attention.js','calendar.js','timeline.js','app.js']){
  const source=fs.readFileSync(path.join(__dirname,'../public',name),'utf8');
  vm.runInNewContext(source,sandbox,{filename:name,timeout:2000});
 }
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(errors,[],'startup should not log errors');
 const api=sandbox.LEGACY_TEST;
 assert.ok(api,'integration hooks installed');
 let state=api.getState();assert.equal(state.year,2026);
 // Full-screen camera keeps the entire fitted graph within its unobstructed viewport.
 const treeCanvas=node('#tree-canvas'),originalRect=treeCanvas.getBoundingClientRect;
 for(const [width,height] of [[390,844],[844,390],[1440,900]]){
  treeCanvas.getBoundingClientRect=()=>({width,height,left:0,top:0,right:width,bottom:height});
  for(const zen of [false,true]){
   api.toggleTreeFullscreen(zen);api.fitScene();
   const v=api.treeViewport(),camera=api.getCamera();
   for(const n of api.getScene()){
    assert.ok((n.x-n.w/2)*camera.scale+camera.x>=v.x-1,'fit left');
    assert.ok((n.x+n.w/2)*camera.scale+camera.x<=v.x+v.w+1,'fit right');
    assert.ok((n.y-n.h/2)*camera.scale+camera.y>=v.y-1,'fit top');
    assert.ok((n.y+n.h/2)*camera.scale+camera.y<=v.y+v.h+1,'fit bottom');
   }
   api.centerPerson();
   const centered=api.getCamera(),selected=api.getScene().find(n=>n.p.id===api.getState().selectedId);
   assert.ok(Math.abs(selected.x*centered.scale+centered.x-v.x-v.w/2)<.01);
   assert.ok(Math.abs(selected.y*centered.scale+centered.y-v.y-v.h/2)<.01);
   api.zoomTree(1.24);
   const zoomed=api.getCamera();
   assert.ok(Math.abs(selected.x*zoomed.scale+zoomed.x-v.x-v.w/2)<.01,'zoom preserves visual anchor');
  }
 }
 api.toggleTreeFullscreen(false);
 assert.equal(node('#app').classList.contains('zen-tree'),false);
 treeCanvas.getBoundingClientRect=originalRect;
 api.fitScene();
 assert.ok(node('#selected-name').textContent,'selected person is discoverable without a long press');

 assert.equal(state.calendar.date,'2026-01-01');
 assert.equal(state.timeline.speedMinutes,15,'default is fifteen real minutes per game year');
 assert.match(node('#timeline-status').textContent,/Paused/);
 assert.match(node('#timeline-months').innerHTML,/Jan/);
 node('#modal-backdrop').classList.add('hidden'); // Matches initial hidden modal in index.html.
 api.timelineSpeed(1);
 assert.equal(state.timeline.speedMinutes,1);
 assert.equal(api.timelinePlay(),true);
 assert.equal(fakeIntervals.size,1);
 assert.match(node('#timeline-play').textContent,/Pause/);
 const accelerated=api.timelineAdvance(1000);
 assert.ok(accelerated>=5&&accelerated<=7,'one minute pacing should move about six days per second');
 assert.equal(state.year,2026);
 assert.ok(state.calendar.daysElapsed>=accelerated);
 assert.equal(api.timelinePause(),true);
 assert.equal(fakeIntervals.size,0);
 assert.match(node('#timeline-play').textContent,/Play/);
 // Returning to the Home Screen must stop play without background catch-up.
 assert.equal(api.timelinePlay(),true);
 sandbox.document.visibilityState='hidden';
 documentHandlers.visibilitychange();
 assert.equal(fakeIntervals.size,0);
 assert.match(node('#timeline-play').textContent,/Play/);
 sandbox.document.visibilityState='visible';
 api.timelineSpeed(15);
 // Time controls are modal: opening pauses, dismissal never silently resumes.
 assert.equal(api.timelinePlay(),true);
 const dateBeforePopup=api.getState().calendar.date;
 api.openTimeControls();
 assert.equal(node('#time-popup').open,true);
 assert.equal(fakeIntervals.size,0,'opening time settings pauses playback');
 assert.equal(api.timelinePlay(),false,'background playback cannot start while popup is open');
 assert.equal(api.getState().calendar.date,dateBeforePopup);
 api.timelineSpeed(30);
 assert.equal(api.getState().timeline.speedMinutes,30);
 api.closeTimeControls();
 assert.equal(node('#time-popup').open,false);
 assert.equal(fakeIntervals.size,0,'dismissal leaves time paused');
 api.openTimeControls();
 node('#time-popup-play').onclick();
 assert.equal(node('#time-popup').open,false);
 assert.equal(fakeIntervals.size,1,'explicit Play & close resumes playback');
 api.timelinePause();api.timelineSpeed(15);

 // Reveal navigation preserves playback; Time expands the same modal and pauses it.
 assert.equal(api.timelinePlay(),true);
 node('#reveal-menu').onclick();
 assert.equal(node('#time-popup').open,true);
 assert.equal(node('#time-popup').classList.contains('menu-only'),true);
 assert.equal(fakeIntervals.size,1,'navigation does not pause a running world');
 node('#time-menu').onclick();
 assert.equal(node('#time-popup').classList.contains('menu-only'),false);
 assert.equal(fakeIntervals.size,0,'Time expands and pauses playback');
 api.closeTimeControls();
 api.openRevealMenu();api.setTab('people');
 assert.equal(node('#time-popup').open,false,'choosing a view dismisses navigation');
 api.setTab('tree');
 node('#reveal-menu').handlers.pointerdown({clientX:20,clientY:100,pointerId:1});
 node('#reveal-menu').handlers.pointerup({clientX:22,clientY:40,pointerId:1});
 assert.equal(node('#time-popup').open,true,'swipe up reveals navigation');
 node('.sheet-grip').handlers.pointerdown({clientX:20,clientY:40,pointerId:2});
 node('.sheet-grip').handlers.pointerup({clientX:22,clientY:100,pointerId:2});
 assert.equal(node('#time-popup').open,false,'swipe down dismisses sheet');
 api.openRevealMenu();
 node('#time-popup').handlers.cancel({preventDefault(){}});
 assert.equal(node('#time-popup').open,false,'Escape dismisses sheet');

 // Reload never persists a playing flag.
 assert.equal(state.timeline.playing,undefined);
 const dateAfterFast=state.calendar.date;
 assert.ok(dateAfterFast>'2026-01-01');

 assert.match(node('#calendar-date').textContent,/January • \d+(st|nd|rd|th) • 2026/);
 assert.equal(node('#header-day-count').textContent,'DAY '+String(accelerated+1).padStart(3,'0')+' / 365');
 api.advanceCalendar('day',1);
 assert.equal(state.calendar.date,sandbox.LEGACY_CALENDAR.shiftDays(dateAfterFast,1));
 assert.equal(state.year,2026,'one day should not run the annual life simulator');
 api.advanceCalendar('month',1);
 assert.equal(state.calendar.date,sandbox.LEGACY_CALENDAR.shiftMonths(sandbox.LEGACY_CALENDAR.shiftDays(dateAfterFast,1),1));
 api.advanceCalendar('hour',1);
 assert.equal(state.calendar.minutes,600);
 assert.equal(state.year,2026);
 api.showCalendarDetails();
 assert.match(node('#modal-content').innerHTML,/Upcoming public holidays/);
 assert.match(node('#modal-content').innerHTML,/Family time zones/);
 node('#calendar-close').onclick();

 assert.equal(Object.keys(state.people).length,4);
 assert.equal(sandbox.LEGACY_ATTENTION.unread(state).length,0,'founding historical events should not trigger alerts');
 assert.ok(state.people[state.controlledId].needs?.physical>0);
 assert.equal(state.people[state.controlledId].finance?.cash,4500);
 assert.ok(Array.isArray(state.people[state.controlledId].medical?.conditions));
 assert.ok(Array.isArray(state.people[state.controlledId].schooling?.credentials));
 assert.ok(state.people[state.controlledId].career?.jobId);
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
 api.showPersonStats(state.controlledId,'health');
 assert.match(node('#modal-content').innerHTML,/Medical services/);
 assert.match(node('#modal-content').innerHTML,/Emergency treatment/);
 api.showPersonStats(state.controlledId,'education');
 assert.match(node('#modal-content').innerHTML,/Education &amp; qualifications/);
 assert.match(node('#modal-content').innerHTML,/Trade apprenticeship/);
 api.showPersonStats(state.controlledId,'career');
 assert.match(node('#modal-content').innerHTML,/Current occupation/);
 assert.match(node('#modal-content').innerHTML,/Carpenter/);
 api.showPersonStats(state.controlledId,'stats');
 assert.match(node('#modal-content').innerHTML,/Wellbeing/);
 assert.match(node('#modal-content').innerHTML,/Physical health/);
 assert.match(node('#modal-content').innerHTML,/Emotional sensitivity/);
 api.showPersonStats(state.controlledId,'stats',1);
 assert.match(node('#modal-content').innerHTML,/Career &amp; education/);
 assert.match(node('#modal-content').innerHTML,/Education debt/);
 api.showPersonStats(state.controlledId,'stats',2);
 assert.match(node('#modal-content').innerHTML,/Household economy/);
 assert.match(node('#modal-content').innerHTML,/Mortgage/);
 api.showPersonStats(state.controlledId,'family');
 assert.match(node('#modal-content').innerHTML,/Family connections/);
 assert.match(node('#modal-content').innerHTML,/Trust/);
 assert.match(node('#modal-content').innerHTML,/Conflict/);
 api.showPersonStats(state.controlledId,'actions');
 assert.match(node('#modal-content').innerHTML,/Grow family/);
 assert.match(node('#modal-content').innerHTML,/Buy a home/);
 assert.match(node('#modal-content').innerHTML,/Adjust budget/);
 api.showPersonStats(state.controlledId,'history');
 assert.match(node('#modal-content').innerHTML,/Family chronicle/);
 api.showPersonStats(state.controlledId,'stories');
 assert.match(node('#modal-content').innerHTML,/Family stories/);
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
 const beforeYearlyDate=state.calendar.date;
 api.advance(1);
 state=api.getState();
 assert.equal(state.year,2027);
 assert.equal(state.calendar.date,sandbox.LEGACY_CALENDAR.shiftYears(beforeYearlyDate,1),'yearly fast-forward should preserve the calendar month and day');
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
 // Serious health updates interrupt the year-advance flow with a real care decision.
 const beforeMedicine=sandbox.LEGACY_MEDICINE.annual;
 const beforeMortality=sandbox.LEGACY_HUMAN.deathRiskModifier;
 sandbox.LEGACY_HUMAN.deathRiskModifier=()=>0;
 sandbox.LEGACY_MEDICINE.annual=(person,...args)=>{
  if(person.id===state.controlledId)return {events:[{type:'health',message:'Diagnosed with pneumonia.'}],cause:null};
  return beforeMedicine(person,...args);
 };
 api.advance(1);
 assert.equal(state.pendingChoice?.kind,'medical');
 assert.match(node('#modal-content').innerHTML,/Your health needs attention/);
 assert.match(node('#modal-content').innerHTML,/emergency treatment/i);
 api.resolveLifeChoice('primary');
 assert.equal(state.pendingChoice,null);
 assert.ok(state.events.some(e=>e.type==='choice'&&e.message.includes('Visit a doctor')));
 sandbox.LEGACY_MEDICINE.annual=beforeMedicine;
 sandbox.LEGACY_HUMAN.deathRiskModifier=beforeMortality;
 // Stress test: grow a dynasty for 60 additional simulation years and resolve popups.
 const actions={launch:'work',direction:'stable',family:'quality',midlife:'balance',retirement:'continue',relationship:'solo'};
 for(let y=0;y<60;y++){
  const pending=state.pendingChoice;
  if(pending){
   const choice=pending.kind==='medical'?'primary':pending.kind==='living'?pending.event.options.find(o=>sandbox.LEGACY_LIVING_DECISIONS.preview(state.people[pending.personId],pending.event,o[0],state.people,state.year).ok)?.[0]||pending.event.options.at(-1)[0]:pending.kind==='followup'?'finish':pending.kind==='event'?pending.event.options[0][0]:actions[pending.kind]||'stable';
   api.resolveLifeChoice(choice);
  }
  if(state.pendingSuccession){
   const heir=state.pendingSuccession.candidateIds[0];
   if(!heir)break;
   api.chooseSuccessor(heir);
  }
  api.advance(1);
  assert.ok(Object.values(state.people).every(p=>Number.isFinite(p.wealth)),'all person net worth values must stay finite');
 }
 assert.ok(state.year>=2029);
 assert.ok(Object.values(state.people).every(p=>p.medical&&p.schooling&&p.career&&p.finance),'new engines persist across generations');
 // Living Decisions: modal, known costs, actual aftermath, and inspectable family history.
 state.pendingChoice=null;state.pendingSuccession=null;
 const lead=state.people[state.controlledId];
 const living={kind:'unemployed',key:'living-unemployed',title:'An employment crossroads.',text:'No current work. What now?',tag:'LIVING SITUATION',
  personIds:[lead.id],targetId:null,cause:'Loss of work',facts:{savings:lead.wealth},
  options:[['apply','Apply for work','Look for a new occupation.']]};
 state.pendingChoice={kind:'living',personId:lead.id,event:living,year:state.year};
 api.showLifeChoice();
 assert.match(node('#modal-content').innerHTML,/living-option-stack/);
 assert.match(node('#modal-content').innerHTML,/Known costs/);
 api.resolveLifeChoice('apply');
 assert.equal(state.pendingChoice,null);
 assert.match(node('#modal-content').innerHTML,/Weekly time committed/);
 assert.ok(state.decisionLedger.length>0);
 assert.ok(state.storylines.length>0);
 api.showPersonStats(lead.id,'stories');
 assert.match(node('#modal-content').innerHTML,/An employment crossroads/);
 api.showStoryDetails(lead.id,state.storylines.at(-1).id);
 assert.match(node('#modal-content').innerHTML,/Loss of work/);

 // New attention system: alerts appear only after events, remain visible, and open the right person.
 const Attention=sandbox.LEGACY_ATTENTION;
 Attention.dismissAll(state);
 api.addEvent(state.year,'health','Mia was diagnosed with pneumonia.',[lead.id]);
 api.render();
 assert.equal(Attention.unread(state).length,1);
 assert.match(node('#attention-name').textContent,/Check on|See what happened/);
 assert.equal(node('#attention-banner').classList.contains('hidden'),false);
 assert.equal(node('#attention-inbox').classList.contains('hidden'),false);
 assert.equal(node('#attention-count').textContent,'1');
 node('#attention-go').onclick();
 assert.equal(Attention.unread(state).length,0,'checking the named person clears their reminder');
 assert.match(node('#modal-content').innerHTML,/Family chronicle/);
 assert.match(node('#modal-content').innerHTML,/pneumonia/);
 assert.equal(node('#attention-banner').classList.contains('hidden'),true);
 const relative=Object.values(state.people).find(p=>p.id!==lead.id&&p.inFamily);
 api.addEvent(state.year,'death',relative.first+' died.',[relative.id]);
 api.render();
 node('#attention-inbox').onclick();
 assert.match(node('#modal-content').innerHTML,/Who needs attention/);
 assert.match(node('#modal-content').innerHTML,/Family loss/);
 assert.ok(node('#modal-content').classList.contains('attention-inbox-dialog'));
 // All reminders should be in one scrollable list, with no Prev / Next pages.
 for(let i=1;i<=9;i++)api.addEvent(state.year+i,'health',relative.first+' was diagnosed with condition '+i+'.',[relative.id]);
 api.showAttentionInbox();
 const inboxHtml=node('#modal-content').innerHTML;
 assert.match(inboxHtml,/aria-label="Unread family reminders — scroll to see more"/);
 assert.match(inboxHtml,/condition 1/);
 assert.match(inboxHtml,/condition 9/);
 assert.match(inboxHtml,/10 unread updates/);
 assert.doesNotMatch(inboxHtml,/id="attention-next"|id="attention-prev"|Page 1/);
 assert.match(css,/\.attention-inbox-items\{[^}]*overflow-y:auto/);
 node('#attention-close').onclick();
 assert.equal(node('#modal-content').classList.contains('attention-inbox-dialog'),false);
 node('#attention-dismiss').onclick();
 assert.equal(Attention.unread(state).length,9,'top banner dismisses one reminder without discarding the others');
 api.showAttentionInbox();
 node('#attention-clear').onclick();
 assert.equal(Attention.unread(state).length,0);
 assert.equal(node('#attention-inbox').classList.contains('hidden'),true);

 assert.deepEqual(errors,[],'simulation should not log errors');
});
