'use strict';
/* Resource-aware decisions with auditable transactions. All values are game abstractions. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const commitments={
  'care:care':{hours:12,yearlyCost:250,duration:3,description:'Personal caregiving'},
  'care:family':{hours:3,yearlyCost:100,duration:2,description:'Family care coordination'},
  'care:fund':{hours:1,yearlyCost:350,duration:2,description:'Help fund follow-up care'},
  'unemployed:apply':{hours:7,yearlyCost:120,duration:1,description:'Job search'},
  'unemployed:study':{hours:6,yearlyCost:350,duration:2,description:'Career training research'},
  'housing:extra':{hours:10,yearlyCost:80,duration:2,description:'Additional work hours'},
  'debt:loan':{hours:1,yearlyCost:900,duration:3,description:'Debt repayment plan'},
  'retirement:work':{hours:10,yearlyCost:0,duration:2,description:'Extended working life'},
  'conflict:talk':{hours:2,yearlyCost:0,duration:1,description:'Family reconciliation'}
 };
 function availableHours(p){
  const age=p._gameAge??30;
  const employed=!!p.career?.jobId&&!p.retired;
  const health=p.needs?.energy??65;
  const used=(p.commitments||[]).filter(x=>x.status==='active').reduce((sum,x)=>sum+x.hours,0);
  return Math.max(0,Math.round((age<18?12:employed?19:30)*(health<30?.55:1)-used));
 }
 function preview(p,event,action,people,year){
  const valid=event?.options?.find(x=>x[0]===action);
  if(!valid)return {ok:false,reason:'This option is not available.'};
  const code=event.kind+':'+action,config=commitments[code]||null;
  const affordable=Math.max(0,Math.round(p.wealth||0));
  const cashCost=code==='care:fund'?Math.min(2400,affordable):code==='debt:loan'?0:config?.yearlyCost||0;
  const hours=config?.hours||0;
  const target=people[event.targetId];
  const existing=(p.commitments||[]).some(x=>x.status==='active'&&x.kind===code&&x.targetId===(target?.id||null));
  const allowed=hours<=availableHours(p)&&!existing&&!(code==='care:fund'&&affordable===0);
  return {ok:allowed,reason:existing?'You already have an active commitment of this type.':hours>availableHours(p)?'Not enough free time for this commitment.':cashCost>affordable?'Insufficient available savings.':!allowed?'No funds are available for treatment.':'Available',
   cashCost,hours,annualCost:config?.yearlyCost||0,duration:config?.duration||0,
   guaranteed:[cashCost?'Upfront allocation: up to $'+cashCost.toLocaleString():'No required upfront cash transfer',hours?'Time: '+hours+' hours weekly':'No recurring weekly hours'],
   uncertain:event.kind==='care'?'Care outcomes and family responses remain uncertain.':event.kind==='conflict'?'Trust may improve or worsen.':'Future opportunities depend on character circumstances.'};
 }
 function ensure(state){
  if(!Array.isArray(state.decisionLedger))state.decisionLedger=[];
  for(const p of Object.values(state.people||{}))if(!Array.isArray(p.commitments))p.commitments=[];
  return state.decisionLedger;
 }
 function commit({state,p,event,action,year,rnd=()=>.5}){
  ensure(state);
  p._gameAge=year-p.birthYear;const view=preview(p,event,action,state.people,year);delete p._gameAge;
  if(!view.ok)return {ok:false,result:view.reason};
  const target=state.people[event.targetId]||null;
  const wealthBefore=Math.round(p.wealth||0),targetBefore=target?.wealth;
  const relBefore=target?(p.bonds?.[target.id]??50):null;
  const result=root.LEGACY_LIVING_CONTEXT.resolve({p,event,option:action,people:state.people,year,rnd});
  if(!result)return {ok:false,result:'Unable to apply this decision.'};
  const code=event.kind+':'+action;
  const cfg=commitments[code];
  if(cfg){
   p.commitments.push({id:'commit-'+state.nextEvent+'-'+(p.commitments.length+1),kind:code,storyKey:event.key,targetId:target?.id||null,startYear:year,endYear:year+cfg.duration,hours:cfg.hours,yearlyCost:cfg.yearlyCost,description:cfg.description,status:'active',yearsCompleted:0});
  }
  const delta=Math.round(p.wealth||0)-wealthBefore;
  const changes=[
   {label:'Personal net worth',before:wealthBefore,after:Math.round(p.wealth||0),delta},
  ];
  if(target&&targetBefore!==target.wealth)changes.push({label:'Relative net worth',before:targetBefore,after:target.wealth,delta:target.wealth-targetBefore});
  if(target)changes.push({label:'Relationship score',before:relBefore,after:p.bonds?.[target.id]??50,delta:(p.bonds?.[target.id]??50)-relBefore});
  if(cfg)changes.push({label:'Weekly time committed',before:0,after:cfg.hours,delta:cfg.hours,unit:'hours'});
  const record={id:'decision-'+(state.nextEvent++)+'-'+p.id,year,personId:p.id,kind:event.kind,action,participants:event.personIds||[p.id],
   cause:event.cause,context:event.facts||{},result:result.result,changes,
   optionLabel:event.options.find(x=>x[0]===action)?.[1]||action,
   commitmentId:cfg?p.commitments[p.commitments.length-1].id:null};
  state.decisionLedger.push(record);if(state.decisionLedger.length>450)state.decisionLedger.splice(0,state.decisionLedger.length-450);
  return {ok:true,...result,record,changes,preview:view};
 }
 root.LEGACY_LIVING_DECISIONS={availableHours,preview,ensure,commit,commitments};
})(typeof window==='undefined'?globalThis:window);
