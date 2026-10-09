'use strict';
/* Impact reporting reads actual before/after state; never fabricates improvements. */
(function(root){
 function snapshot(state,p,targetId){
  const other=state.people[targetId]||null;
  return {wealth:Math.round(p.wealth||0),stress:Math.round(p.needs?.stress??50),energy:Math.round(p.needs?.energy??50),
   wellbeing:Math.round(p.needs?.mental??50),bond:other?Math.round(p.bonds?.[other.id]??50):null,
   commitmentHours:(p.commitments||[]).filter(c=>c.status==='active').reduce((n,c)=>n+c.hours,0),
   yearlyCommitmentCost:(p.commitments||[]).filter(c=>c.status==='active').reduce((n,c)=>n+c.yearlyCost,0),
   career:p.career?.jobId||'Unemployed',housing:p.finance?.propertyValue||0,
   relativeWealth:other?Math.round(other.wealth||0):null};
 }
 function compare(before,after){
  const names={wealth:'Personal wealth',stress:'Stress',energy:'Energy',wellbeing:'Mental wellbeing',bond:'Relationship score',
   commitmentHours:'Weekly time committed',yearlyCommitmentCost:'Annual commitments',housing:'Property value',relativeWealth:'Relative wealth'};
  const rows=[];
  for(const [field,label] of Object.entries(names)){
   const a=before[field],b=after[field];if(a===null||b===null||a===b)continue;
   const money=['wealth','yearlyCommitmentCost','housing','relativeWealth'].includes(field);
   rows.push({field,label,before:a,after:b,delta:b-a,format:money?'money':field==='commitmentHours'?'hours':'number'});
  }
  if(before.career!==after.career)rows.push({field:'career',label:'Occupation',before:before.career,after:after.career,format:'text'});
  return rows;
 }
 function activeFor(state,id){
  return (state.storylines||[]).filter(s=>s.status==='active'&&s.participants?.includes(id)).sort((a,b)=>b.urgency-a.urgency||b.startedYear-a.startedYear);
 }
 function allFor(state,id){
  return [...(state.storylines||[]),...(state.storylineHistory||[])].filter(s=>s.participants?.includes(id)).sort((a,b)=>b.startedYear-a.startedYear);
 }
 function lineage(state,id){
  const stories=allFor(state,id),ledger=(state.decisionLedger||[]).filter(r=>r.participants?.includes(id));
  return {active:stories.filter(s=>s.status==='active').length,stories:stories.length,decisions:ledger.length,linkedDecisions:ledger.slice(-15).reverse()};
 }
 root.LEGACY_LIVING_IMPACT={snapshot,compare,activeFor,allFor,lineage};
})(typeof window==='undefined'?globalThis:window);
