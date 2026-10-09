'use strict';
/* Autonomous family relationship model: fictional gameplay, not predictive psychology. */
(function(root){
 const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:50));
 function tie(a,b){
  if(!a.social||typeof a.social!=='object')a.social={};
  if(!b.social||typeof b.social!=='object')b.social={};
  if(!a.bonds)a.bonds={};if(!b.bonds)b.bonds={};
  function init(p,q){
   const old=clamp(p.bonds[q.id]??50);
   if(!p.social[q.id])p.social[q.id]={trust:clamp(52+(old-50)*.62),closeness:old,conflict:clamp(20-Math.max(0,old-50)*.14+Math.max(0,50-old)*.26),sharedYears:0,history:[]};
   const v=p.social[q.id];
   for(const k of ['trust','closeness','conflict','sharedYears'])if(!Number.isFinite(v[k]))v[k]=k==='sharedYears'?0:50;
   if(!Array.isArray(v.history))v.history=[];
   return v;
  }
  return [init(a,b),init(b,a)];
 }
 function refresh(a,b){
  const [ab,ba]=tie(a,b);
  a.bonds[b.id]=Math.round(clamp((ab.closeness+ab.trust)/2-ab.conflict*.12));
  b.bonds[a.id]=Math.round(clamp((ba.closeness+ba.trust)/2-ba.conflict*.12));
 }
 function affect(a,b,delta,year,reason='shared time'){
  const [ab,ba]=tie(a,b),size=Math.max(-30,Math.min(30,delta));
  for(const k of [ab,ba]){
   k.closeness=clamp(k.closeness+size*.65);
   k.trust=clamp(k.trust+size*.34);
   k.conflict=clamp(k.conflict-(size>0?size*.24:size*.46));
   if(year!==undefined){
    k.history.push({year,change:Math.round(size),reason});
    if(k.history.length>20)k.history.shift();
   }
  }
  refresh(a,b);
 }
 function fragility(a,b){
  const [ab,ba]=tie(a,b);
  const conflict=(ab.conflict+ba.conflict)/2,trust=(ab.trust+ba.trust)/2;
  return clamp(.008+(conflict-20)*.00036+(48-trust)*.0003,.003,.065);
 }
 function relation(a,b){
  const [ab]=tie(a,b);
  return {trust:Math.round(ab.trust),closeness:Math.round(ab.closeness),conflict:Math.round(ab.conflict),sharedYears:ab.sharedYears,
   history:ab.history.slice(-5)};
 }
 function annual(state,year,rnd,emit){
  const all=Object.values(state.people),map=state.people;
  const pairs=new Set(),childParents=new Map();
  for(const p of all){
   if(p.deathYear)continue;
   for(const id of [...(p.parentIds||[]),...(p.adoptiveParentIds||[])]){
    if(!map[id]||map[id].deathYear)continue;
    const key=[p.id,id].sort().join('|');pairs.add(key);
    if(!childParents.has(p.id))childParents.set(p.id,[]);
    childParents.get(p.id).push(map[id]);
   }
   for(const id of [...Object.keys(p.bonds||{}),...(p.partnerId?[p.partnerId]:[])]){
    if(id!==p.id&&map[id]&&!map[id].deathYear)pairs.add([p.id,id].sort().join('|'));
   }
  }
  let eventCount=0;
  const maybeEmit=(type,msg,ids)=>{if(eventCount++<5&&typeof emit==='function')emit(year,type,msg,ids);};
  const active=state.controlledId;
  for(const key of pairs){
   const [idA,idB]=key.split('|'),a=map[idA],b=map[idB];if(!a||!b)continue;
   const [ab,ba]=tie(a,b);
   const partnered=a.partnerId===b.id&&b.partnerId===a.id;
   const sameCity=a.city===b.city;
   const aStress=a.needs?.stress??40,bStress=b.needs?.stress??40;
   const highStress=(aStress+bStress)/2>72;
   const drift=(sameCity?partnered?1.6:.4:-1.25)+(highStress?-1.1:0);
   const variation=((rnd?.()??.5)-.5)*3;
   for(const t of [ab,ba]){
    t.closeness=clamp(t.closeness+drift+variation);
    t.trust=clamp(t.trust+drift*.21+(partnered?.25:0));
    t.conflict=clamp(t.conflict+(highStress?1.1: -.35)-(partnered&&sameCity?.3:0)+Math.abs(variation)*.1);
    t.sharedYears++;
   }
   refresh(a,b);
   const midpoint=(ab.trust+ba.trust)/2;
   // Autonomous help can come from NPCs; never spend the player's own money without consent.
   if(midpoint>65&&rnd()<.018){
    const donor=a.wealth>b.wealth?a:b,receiver=donor===a?b:a;
    if(donor.id!==active&&donor.wealth>28000&&receiver.wealth<5000){
     const amount=Math.min(1500,Math.floor(donor.wealth*.04));
     donor.wealth-=amount;receiver.wealth+=amount;affect(a,b,5,year,'family assistance');
     maybeEmit('family',donor.first+' provided '+receiver.first+' with family assistance worth $'+amount.toLocaleString()+'.',[donor.id,receiver.id]);
    }
   }
   if(ab.conflict>72&&rnd()<.015){
    affect(a,b,-5,year,'tension');maybeEmit('family',a.first+' and '+b.first+' struggled with unresolved tension.',[a.id,b.id]);
   }else if(ab.closeness<30&&midpoint>35&&rnd()<.02){
    affect(a,b,8,year,'reconciliation');maybeEmit('family',a.first+' and '+b.first+' began rebuilding their relationship.',[a.id,b.id]);
   }
  }
  // Upbringing reflects years of care and material security, not just the parents' situation at birth.
  for(const [id,parents] of childParents){
   const child=map[id],age=year-child.birthYear;
   if(age<0||age>=18||!child.familyStart||!parents.length)continue;
   const support=parents.reduce((sum,parent)=>{
    const t=tie(parent,child)[0];
    return sum+clamp(t.trust*.48+t.closeness*.52-t.conflict*.15);
   },0)/parents.length;
   const resource=parents.reduce((sum,p)=>sum+Math.max(0,p.wealth),0)/parents.length;
   const current=child.familyStart;
   current.support=Math.round(clamp(current.support*.88+support*.12));
   current.security=Math.round(clamp(current.security*.94+Math.min(25,resource/15000)*.06,0,25));
   if(child.needs&&support<25)child.needs.stress=clamp(child.needs.stress+1);
  }
  return {connections:pairs.size,events:Math.min(5,eventCount)};
 }
 root.LEGACY_RELATIONSHIPS={tie,affect,fragility,relation,annual};
})(typeof window==='undefined'?globalThis:window);
