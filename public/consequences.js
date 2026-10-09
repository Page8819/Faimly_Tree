'use strict';
/* Persistent, game-balanced life paths. These are gameplay effects, not demographic forecasts. */
(function(root){
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function ensure(p){
  if(!p.lifePath||typeof p.lifePath!=='object')p.lifePath={};
  const x=p.lifePath;
  if(!x.calling)x.calling='Undecided';
  for(const k of ['skills','momentum','community','discipline','educationDebt','enterprise','familyTime']){
   if(!Number.isFinite(x[k]))x[k]=0;
  }
  if(!Array.isArray(x.decisions))x.decisions=[];
  return x;
 }
 function remember(x,action,year){
  x.decisions.push({year,action});
  if(x.decisions.length>45)x.decisions.splice(0,x.decisions.length-45);
 }
 function apply(p,action,year,outcome=''){
  const x=ensure(p);remember(x,action,year);
  const good=!/struggl|did not|lost|underperform|failed|without success/i.test(outcome);
  switch(action){
   case 'college':x.calling='Academic student';break;
   case 'trade':x.calling='Trade apprentice';x.discipline++;break;
   case 'work':x.calling='Workforce';x.momentum++;break;
   case 'promotion':x.momentum=clamp(x.momentum+(good?2:0),-6,12);break;
   case 'business':x.calling='Entrepreneur';x.enterprise=good?clamp(x.enterprise+1,0,3):Math.max(0,x.enterprise-1);x.momentum+=good?1:-1;break;
   case 'stable':x.discipline=clamp(x.discipline+2,0,12);break;
   case 'financial':case 'quality':case 'mentor':x.community=clamp(x.community+2,0,12);x.familyTime=clamp(x.familyTime+2,0,12);break;
   case 'balance':x.familyTime=clamp(x.familyTime+3,0,12);break;
   case 'independent':case 'solo':x.discipline=clamp(x.discipline+1,0,12);break;
   case 'retrain':x.calling='Retraining';break;
   case 'invest':x.discipline=clamp(x.discipline+1,0,12);break;
   case 'continue':x.momentum=clamp(x.momentum+1,-6,12);break;
   case 'retire':x.enterprise=Math.max(0,x.enterprise-1);break;
   case 'friends':x.community=clamp(x.community+1,0,12);break;
   case 'meet':if(good)x.community=clamp(x.community+1,0,12);break;
   case 'career':x.momentum=clamp(x.momentum+1,-6,12);break;
   case 'educate':x.skills=clamp(x.skills+1,0,12);break;
   case 'support':x.community=clamp(x.community+1,0,12);break;
   case 'move':x.community=Math.max(0,x.community-1);break;
  }
 }
 function careerOdds(p){
  const x=ensure(p);
  return clamp(.048+x.skills*.0025+x.momentum*.003+x.discipline*.001, .018,.14);
 }
 function annual(p,a,year){
  const x=ensure(p);
  if(a<18)return 0;
  if(a===18&&!x.launched){
   x.launched=true;
   const start=p.familyStart;
   if(start){
    const deposit=clamp(start.security*125+start.support*15,0,7000);
    p.wealth+=Math.round(deposit);
    if(start.support>=70&&p.education<2)p.education=2;
   }
  }
  if(x.educationDebt>0){
   const interest=Math.round(x.educationDebt*.045);
   // The base living-cost model includes principal payments; interest reduces net worth.
   const principal=Math.min(x.educationDebt,Math.round(Math.max(150,x.educationDebt*.1)));
   x.educationDebt-=principal;
   p.wealth-=interest;
  }
  if(p.retired)return 0;
  const bonus=Math.round(x.skills*155+x.momentum*205+x.discipline*90+x.enterprise*1250);
  if(a>=18&&a<=70)p.wealth+=bonus;
  return bonus;
 }
 function childStart(child,parents){
  const adults=parents.filter(Boolean),ave=(fn)=>adults.length?adults.reduce((s,p)=>s+fn(p),0)/adults.length:0;
  child.familyStart={
   security:clamp(Math.round(ave(p=>p.wealth)/15000),0,25),
   support:clamp(Math.round(ave(p=>50+ensure(p).familyTime*3+ensure(p).community*2)),0,100),
   roleModel:adults.map(p=>ensure(p).calling).join(' / ')||'Unknown'
  };
 }
 function describe(p){
  const x=ensure(p),start=p.familyStart;
  const elements=[x.calling!=='Undecided'?'Path: '+x.calling:'Path: not yet chosen'];
  if(x.skills>0)elements.push('Skills '+x.skills);
  if(x.enterprise>0)elements.push('Active venture '+x.enterprise);
  if(x.educationDebt>0)elements.push('Education debt $'+Math.round(x.educationDebt).toLocaleString());
  if(x.community>2)elements.push('Strong community ties');
  if(start)elements.push('Family upbringing: '+(start.security>=6?'financially secure':start.support>=65?'supportive':'modest resources'));
  return elements.join(' · ');
 }
 root.LEGACY_CONSEQUENCES={ensure,apply,careerOdds,annual,childStart,describe};
})(typeof window==='undefined'?globalThis:window);
