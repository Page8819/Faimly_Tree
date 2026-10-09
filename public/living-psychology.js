'use strict';
/* NPCs retain independent goals and may refuse assistance. All choices use game rules. */
(function(root){
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:50));
 function ensure(p){
  if(!p.motivations||typeof p.motivations!=='object'){
   const t=p.traits||{},n=p.needs||{};
   p.motivations={
    loyalty:Math.round(clamp(45+(t.agreeableness??50)*.35-17)),
    ambition:Math.round(clamp((t.openness??50)*.55+(t.conscientiousness??50)*.45)),
    independence:Math.round(clamp(40+(t.openness??50)*.25-(t.agreeableness??50)*.08)),
    riskTolerance:Math.round(clamp((t.openness??50)*.72+(100-(t.emotionality??50))*.28)),
    pride:Math.round(clamp((t.extraversion??50)*.3+(t.conscientiousness??50)*.7)),
    resilience:Math.round(clamp(n.resilience??55)),
    recentReactions:[],goal:'security'
   };
  }
  if(!Array.isArray(p.motivations.recentReactions))p.motivations.recentReactions=[];
  return p.motivations;
 }
 function goal(p,year){
  const m=ensure(p),age=year-p.birthYear;
  const stress=p.needs?.stress??40;
  if(stress>70||p.wealth<1500)m.goal='stability';
  else if(age<25)m.goal='independence';
  else if(p.medical?.conditions?.some(c=>c.status==='active'&&c.stage>=3))m.goal='health';
  else if(age>65)m.goal='family';
  else if(m.ambition>60)m.goal='achievement';
  else m.goal='security';
  return m.goal;
 }
 function willingness(actor,target,{cost=0,time=0,year,rnd=()=>.5}){
  const m=ensure(actor),bond=actor.bonds?.[target.id]??50,resources=Math.max(0,actor.wealth||0);
  const pressure=(actor.needs?.stress??40);
  const perceivedNeed=(target.needs?.physical??70)<45?10:0;
  const personalCost=Math.min(55,(cost/Math.max(1,resources))*35)+(time*2.5);
  const score=clamp(15+m.loyalty*.32+bond*.35+perceivedNeed-m.independence*.08-pressure*.15-personalCost);
  return {score,accept:rnd()<clamp(score/100,.08,.94),goal:goal(actor,year)};
 }
 function negotiate({actor,target,people,year,action,rnd=()=>.5,controlledId=null}){
  if(!actor||!target||actor.deathYear||target.deathYear)return {accepted:false,text:'The relative is unavailable.',others:[]};
  const m=ensure(actor);
  const isFinancial=['support','fund','family'].includes(action);
  const cost=isFinancial?Math.min(1200,Math.max(0,Math.round(actor.wealth*.05))):0;
  const assessment=willingness(actor,target,{cost,time:action==='care'?14:4,year,rnd});
  let accepted=assessment.accept;
  // The controlled character's approval is never taken automatically.
  if(actor.id===controlledId)accepted=false;
  const transferred=accepted&&isFinancial?cost:0;
  if(transferred){actor.wealth-=transferred;target.wealth+=transferred;}
  if(accepted&&root.LEGACY_RELATIONSHIPS)root.LEGACY_RELATIONSHIPS.affect(actor,target,action==='care'?12:7,year,'voluntary family assistance');
  else if(!accepted&&root.LEGACY_RELATIONSHIPS)root.LEGACY_RELATIONSHIPS.affect(actor,target,-2,year,'declined request');
  const text=accepted?
   actor.first+' agreed to '+(action==='care'?'help with caregiving time':transferred?'contribute $'+transferred.toLocaleString():'help with this responsibility')+'.':
   actor.first+' could not commit right now. '+(assessment.score<35?'Their resources and obligations made it difficult.':'They chose to protect other priorities.');
  m.recentReactions.push({year,toId:target.id,action,accepted,reason:assessment.goal,amount:transferred});
  if(m.recentReactions.length>25)m.recentReactions.shift();
  return {accepted,text,amount:transferred,others:[actor.id,target.id],score:assessment.score};
 }
 function chooseHelpers(p,people,year){
  const family=root.LEGACY_LIVING_CONTEXT?.relatives(p,people)||[];
  return family.filter(x=>x.id!==p.id&&!x.deathYear&&x.wealth>0).sort((a,b)=>{
   const wa=(a.bonds?.[p.id]??50)+Math.min(50,a.wealth/1000);
   const wb=(b.bonds?.[p.id]??50)+Math.min(50,b.wealth/1000);
   return wb-wa;
  }).slice(0,4);
 }
 root.LEGACY_LIVING_PSYCHOLOGY={ensure,goal,willingness,negotiate,chooseHelpers};
})(typeof window==='undefined'?globalThis:window);
