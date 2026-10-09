'use strict';
/* Persistent multi-year story arcs; all progress and pending followups are save-compatible. */
(function(root){
 function ensure(state){
  if(!Array.isArray(state.storylines))state.storylines=[];
  if(!Array.isArray(state.storylineHistory))state.storylineHistory=[];
  return state.storylines;
 }
 function fromDecision(state,record,event){
  ensure(state);if(!record||!event)return null;
  const previous=state.storylines.find(s=>s.ownerId===record.personId&&s.kind===event.kind&&s.targetId===(event.targetId||null)&&s.status==='active');
  if(previous){
   previous.decisionIds.push(record.id);
   previous.history.push({year:record.year,type:'decision',text:record.result});
   previous.nextReviewYear=Math.min(previous.nextReviewYear,record.year+1);
   return previous;
  }
  const arc={id:'story-'+record.id,kind:event.kind,ownerId:record.personId,targetId:event.targetId||null,
   participants:[...new Set(event.personIds||[record.personId])],
   cause:event.cause,startedYear:record.year,nextReviewYear:record.year+1,
   status:'active',urgency:event.kind==='care'||event.kind==='debt'?3:2,
   initialFacts:event.facts||{},decisionIds:[record.id],
   title:event.title,history:[{year:record.year,type:'origin',text:event.cause},{year:record.year,type:'decision',text:record.result}],
   outcome:null,lastTickYear:record.year,followups:0};
  state.storylines.push(arc);
  if(state.storylines.length>350){
   const index=state.storylines.findIndex(s=>s.status!=='active');
   if(index>=0){const [old]=state.storylines.splice(index,1);state.storylineHistory.push(old);}
  }
  if(state.storylineHistory.length>200)state.storylineHistory.splice(0,state.storylineHistory.length-200);
  return arc;
 }
 function latest(state,personId){
  ensure(state);
  return [...state.storylines,...state.storylineHistory].filter(s=>s.participants.includes(personId)).sort((a,b)=>b.startedYear-a.startedYear).slice(0,30);
 }
 function open(state,id,personId){
  const s=ensure(state).find(x=>x.id===id);
  return s&&s.status==='active'&&s.participants.includes(personId)?s:null;
 }
 function followup(state,story){
  const owner=state.people[story.ownerId],target=state.people[story.targetId];
  if(!owner)return null;
  const name=owner.first,other=target?.first;
  const label=story.kind==='care'?(other||'Your relative')+"'s ongoing care":
   story.kind==='debt'?'Household debt commitments':story.kind==='housing'?'The family home':
   story.kind==='conflict'?'The strained relationship':story.kind==='unemployed'?'The search for work':
   story.kind==='retirement'?'Retirement planning':'A previous decision';
  const active=(owner.commitments||[]).filter(c=>c.storyKey==='living-'+story.kind&&c.status==='active');
  const time=active.reduce((sum,c)=>sum+c.hours,0);
  const amount=active.reduce((sum,c)=>sum+c.yearlyCost,0);
  const context='Last year, '+name+' made a decision about '+label.toLowerCase()+'. '+
   'Current savings: $'+Math.round(owner.wealth||0).toLocaleString()+'. '+
   (active.length?'Ongoing commitments: '+time+' hours per week and $'+amount.toLocaleString()+' per year.':'No regular resource commitment remains.');
  return {kind:'followup',storyId:story.id,tag:'ONGOING FAMILY STORY',title:label+' — what now?',text:context,
   options:[['continue','Keep the current plan','Continue the commitments already made.'],
    ['adjust','Adjust the responsibilities','Reduce time or expense and revise the plan.'],
    ['finish','Close this chapter','End the remaining commitments; outcomes may still have consequences.']]};
 }
 function annual(state,year,rnd=()=>.5,emit=()=>{}){
  ensure(state);
  const events=[];let first=null;
  // Costs and effort are charged once per simulated year even when time advancement is interrupted.
  for(const p of Object.values(state.people||{})){
   if(!Array.isArray(p.commitments))p.commitments=[];
   for(const c of p.commitments){
    if(c.status!=='active'||c.lastChargedYear===year||year<=c.startYear)continue;
    if(p.deathYear){c.status='ended';continue;}
    if(year>c.endYear){c.status='completed';continue;}
    c.lastChargedYear=year;c.yearsCompleted=(c.yearsCompleted||0)+1;
    const cost=Math.max(0,Math.round(c.yearlyCost||0));
    p.wealth=Math.max(-100000,Math.round((p.wealth||0)-cost));
    if(p.needs){
     p.needs.stress=Math.min(100,Math.max(0,Math.round(p.needs.stress+(c.hours>=8?3:1))));
     p.needs.energy=Math.min(100,Math.max(0,Math.round(p.needs.energy-(c.hours>=10?2:0))));
    }
    const target=state.people[c.targetId];
    if(target&&!target.deathYear&&c.kind==='care:care'&&root.LEGACY_RELATIONSHIPS)root.LEGACY_RELATIONSHIPS.affect(p,target,2,year,'continuing care');
    if(target&&!target.deathYear&&c.kind==='care:fund'){
     const untreated=target.medical?.conditions?.find(v=>v.status==='active'&&v.diagnosed&&!v.treated);
     if(untreated&&rnd()<.5)untreated.treated=true;
    }
   }
  }
  for(const arc of state.storylines){
   if(arc.status!=='active'||arc.lastTickYear===year)continue;
   arc.lastTickYear=year;
   const owner=state.people[arc.ownerId],target=state.people[arc.targetId];
   if(!owner||owner.deathYear){arc.status='resolved';arc.outcome='Ended following the character’s death.';arc.history.push({year,type:'resolved',text:arc.outcome});continue;}
   if(target&&target.deathYear&&arc.kind==='care'){arc.status='resolved';arc.outcome='Caregiving ended after the relative’s death.';arc.history.push({year,type:'resolved',text:arc.outcome});continue;}
   const elapsed=year-arc.startedYear;
   if(elapsed>=8){arc.status='resolved';arc.outcome='This chapter gradually closed after several years.';arc.history.push({year,type:'resolved',text:arc.outcome});continue;}
   if(arc.nextReviewYear<=year&&arc.ownerId===state.controlledId&&!state.pendingChoice&&!first){
    first=followup(state,arc);arc.nextReviewYear=year+1;
   }
   if(elapsed>0&&elapsed%3===0)arc.history.push({year,type:'milestone',text:'The consequences of this decision continued to shape the household.'});
   if(arc.history.length>38)arc.history.splice(0,arc.history.length-38);
  }
  return first;
 }
 function decide(state,storyId,ownerId,action,year){
  const arc=open(state,storyId,ownerId);
  if(!arc||!['continue','adjust','finish'].includes(action))return {ok:false,result:'This storyline is no longer active.'};
  const owner=state.people[arc.ownerId],related=(owner.commitments||[]).filter(c=>c.status==='active'&&c.storyKey==='living-'+arc.kind);
  let result='';
  if(action==='continue'){
   for(const c of related)c.endYear=Math.max(c.endYear,year+1);
   result='Continued the plan for another year, with its existing costs and obligations.';
  }else if(action==='adjust'){
   for(const c of related){c.hours=Math.max(1,Math.round(c.hours*.65));c.yearlyCost=Math.round(c.yearlyCost*.7);c.endYear=year+1;}
   result='Reduced time and future expenses, while keeping some responsibilities.';
  }else{
   for(const c of related)c.status='cancelled';
   arc.status='resolved';arc.outcome='The family chose to close this chapter, ending its ongoing commitments.';
   result=arc.outcome;
  }
  arc.followups++;arc.nextReviewYear=year+2;
  arc.history.push({year,type:'followup',text:result,action});
  if(arc.followups>=4&&arc.status==='active'){arc.status='resolved';arc.outcome='The family completed several years of decisions and moved on.';arc.history.push({year,type:'resolved',text:arc.outcome});}
  return {ok:true,result,others:arc.targetId?[arc.targetId]:[],arc};
 }
 root.LEGACY_STORYLINES={ensure,fromDecision,latest,followup,annual,decide,open};
})(typeof window==='undefined'?globalThis:window);
