'use strict';
/* Circumstance-driven interactive storylines. Fictional gameplay probabilities, not forecasts. */
(function(root){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const money=x=>'$'+Math.abs(Math.round(x)).toLocaleString('en-US');
 function context(p,people,year){
  const rel=Object.values(people).filter(q=>q&&q.id!==p.id&&!q.deathYear&&(
   (p.parentIds||[]).includes(q.id)||(p.adoptiveParentIds||[]).includes(q.id)||
   (q.parentIds||[]).includes(p.id)||(q.adoptiveParentIds||[]).includes(p.id)||
   p.partnerId===q.id||(p.formerPartners||[]).includes(q.id)));
  return {rel,year,age:year-p.birthYear};
 }
 const templates={
  setback:{
   eligible:(p,c)=>c.age>=22&&c.age<=65&&p.jobLevel>=2&&!p.retired,
   weight:2,
   build:()=>({tag:'WORK & SECURITY',title:'Your workplace is changing.',text:'Budget cuts could put your current position at risk. There is no perfect choice.',options:[
    ['seek','Look for a new position','Spend time job hunting and pursuing a new role.'],
    ['train','Retrain for stability','Invest $2,000 in skills to reduce future career risk.'],
    ['wait','Stay and negotiate','Keep your current position and hope the organization stabilizes.']]})
  },
  debt:{
   eligible:(p,c)=>c.age>=18&&c.age<=68&&p.wealth<18000,
   weight:3,
   build:()=>({tag:'A DIFFICULT MONTH',title:'An unexpected expense.',text:'A major repair and unpaid bills arrive at the same time. Your savings may not cover everything.',options:[
    ['budget','Cut spending','Sacrifice comfort to keep the bill smaller.'],
    ['borrow','Finance the expense','Take a bigger immediate financial hit to protect your daily routine.'],
    ['ask','Ask family for help','Reach out to a relative, if one can offer support.']]})
  },
  kin:{
   eligible:(p,c)=>c.age>=20&&c.rel.length>0,
   weight:3,
   build:(p,c)=>({tag:'FAMILY RESPONSIBILITY',title:'Someone close needs support.',text:(c.rel[0]?.first||'A relative')+' is going through a difficult period. Your response may affect this relationship for years.',options:[
    ['give','Offer financial assistance','Contribute what you can afford toward their needs.'],
    ['visit','Make time for them','Offer companionship and practical help.'],
    ['distance','Set boundaries','Protect your own responsibilities and resources.']]})
  },
  offer:{
   eligible:(p,c)=>c.age>=24&&c.age<=59&&!p.retired&&p.jobLevel>=1,
   weight:2,
   build:(p)=>({tag:'AN OPPORTUNITY',title:'A career offer arrives.',text:'A new employer has noticed your experience. The opportunity may mean relocation or additional pressure.',options:[
    ['relocate','Accept and relocate','Spend $3,000 moving; a promotion is possible.'],
    ['negotiate','Negotiate locally','Try to improve your current position without moving.'],
    ['decline','Decline the offer','Preserve your current relationships and stability.']]})
  },
  reconcile:{
   eligible:(p,c)=>c.rel.some(q=>(p.bonds?.[q.id]??50)<35),
   weight:2,
   build:()=>({tag:'OLD WOUNDS',title:'A damaged relationship.',text:'A relative you have grown distant from reaches out. Reconciliation takes effort and cannot be guaranteed.',options:[
    ['repair','Try to reconcile','Make the first effort toward repairing trust.'],
    ['limited','Keep careful boundaries','Stay in touch without returning to how things were.'],
    ['avoid','Do not reconnect','Leave the relationship as it is.']]})
  },
  enterprise:{
   eligible:(p,c)=>c.age>=23&&c.age<=60&&p.wealth>8500&&!(p.lifePath?.enterprise>0),
   weight:1.5,
   build:()=>({tag:'THE ENTREPRENEURIAL SPARK',title:'Could you build something of your own?',text:'An affordable business opportunity has appeared. Time and money are limited, and the outcome is uncertain.',options:[
    ['pilot','Run a small pilot','Risk $3,000 to test customer demand before expanding.'],
    ['research','Research first','Spend $500 investigating viability and building skills.'],
    ['pass','Keep your current plan','Save your cash and continue on your established path.']]})
  },
  caregiving:{
   eligible:(p,c)=>c.age>=35&&c.rel.some(q=>((p.parentIds||[]).includes(q.id)||(p.adoptiveParentIds||[]).includes(q.id))&&c.year-q.birthYear>=65),
   weight:2,
   build:()=>({tag:'FAMILY ACROSS GENERATIONS',title:'An older relative needs your help.',text:'An aging family member asks for assistance. You must decide how to balance money, time, and obligations.',options:[
    ['care','Help personally','Give substantial time and strengthen a family bond.'],
    ['pay','Help cover the costs','Spend up to $3,000 to arrange practical assistance.'],
    ['delegate','Share the responsibility','Offer some help, while preserving your own commitments.']]})
  }
 };
 function propose({p,people,year,rnd}){
  const c=context(p,people,year),hist=p.lifeEventHistory||{};
  const options=Object.entries(templates).filter(([key,t])=>t.eligible(p,c)&&year-(hist[key]||0)>=9);
  if(!options.length)return null;
  const sum=options.reduce((s,[,t])=>s+t.weight,0);
  let roll=rnd()*sum;let selected=options[options.length-1];
  for(const entry of options){roll-=entry[1].weight;if(roll<=0){selected=entry;break;}}
  const [key,t]=selected;
  return {key,...t.build(p,c)};
 }
 function resolve({p,people,year,event,option,rnd}){
  if(!event||!templates[event.key]||!Array.isArray(event.options)||!event.options.some(o=>o[0]===option))return null;
  p.lifeEventHistory=p.lifeEventHistory||{};p.lifeEventHistory[event.key]=year;
  const c=context(p,people,year),x=root.LEGACY_CONSEQUENCES.ensure(p);
  const kin=c.rel.sort((a,b)=>a.wealth-b.wealth)[0];
  const estranged=c.rel.find(q=>(p.bonds?.[q.id]??50)<35);
  const older=c.rel.find(q=>((p.parentIds||[]).includes(q.id)||(p.adoptiveParentIds||[]).includes(q.id))&&year-q.birthYear>=65);
  const change=amount=>{p.wealth=clamp(Math.round(p.wealth+amount),-100000,1000000000);};
  const bond=(q,amount)=>{if(!q)return;q.bonds=q.bonds||{};p.bonds=p.bonds||{};p.bonds[q.id]=clamp((p.bonds[q.id]??50)+amount,0,100);q.bonds[p.id]=clamp((q.bonds[p.id]??50)+amount,0,100);};
  const succeed=()=>rnd()<clamp(.55+(p.traits?.conscientiousness-50)/350+x.skills*.015,.15,.88);
  const resultIds=[],involve=q=>{if(q)resultIds.push(q.id);};
  let result='';
  switch(event.key+':'+option){
   case 'setback:seek':if(succeed()){p.jobLevel=clamp(p.jobLevel+1,0,6);result='Found a better job after a difficult search.';}else{p.jobLevel=Math.max(1,p.jobLevel-1);change(-3200);result='The search took longer than expected; career progress and savings suffered.';}break;
   case 'setback:train':change(-2000);x.skills=clamp(x.skills+2,0,12);x.momentum++;result='Spent $2,000 acquiring new skills, improving future opportunities.';break;
   case 'setback:wait':if(rnd()<.38){p.jobLevel=Math.max(1,p.jobLevel-1);result='The workplace cuts reached your role; career level decreased.';}else result='Your position remained secure for now.';break;
   case 'debt:budget':change(-1100);x.discipline=clamp(x.discipline+1,0,12);result='Reduced spending and covered the expense with a $1,100 financial setback.';break;
   case 'debt:borrow':change(-3700);result='Borrowing helped cover the emergency, but reduced net worth by $3,700.';break;
   case 'debt:ask':if(kin&&kin.wealth>=1000){const amount=Math.min(2500,Math.max(0,kin.wealth*.08));kin.wealth-=amount;change(amount-1500);bond(kin,12);involve(kin);result=kin.first+' helped with '+money(amount)+'. The family grew closer.';}else{change(-1600);result='No one could provide meaningful financial help; the expense was absorbed personally.';}break;
   case 'kin:give':if(kin){let amt=Math.min(2500,Math.max(0,p.wealth));change(-amt);kin.wealth+=amt;bond(kin,18);involve(kin);result='Helped '+kin.first+' with '+money(amt)+' and strengthened family trust.';}else result='No relative was available to receive support.';break;
   case 'kin:visit':bond(kin,25);x.familyTime=clamp(x.familyTime+2,0,12);involve(kin);result='Shared time and practical help with '+(kin?.first||'family')+'.';break;
   case 'kin:distance':bond(kin,-8);involve(kin);result='Maintained personal boundaries, but the relationship became more distant.';break;
   case 'offer:relocate':change(-3000);if(succeed()){p.jobLevel=Math.min(6,p.jobLevel+1);x.momentum+=2;result='Relocated for the new position and advanced a career, spending $3,000 on the move.';}else{result='The move cost $3,000 and the expected promotion did not happen.';}break;
   case 'offer:negotiate':if(succeed()){change(3500);x.momentum++;result='Won a $3,500 compensation improvement without moving.';}else result='Negotiations failed, but the existing job was preserved.';break;
   case 'offer:decline':x.discipline=clamp(x.discipline+1,0,12);result='Declined the offer and maintained stability.';break;
   case 'reconcile:repair':bond(estranged,succeed()?28:8);involve(estranged);result=succeed()?'Rebuilt trust with '+(estranged?.first||'a relative')+'.':'Made an imperfect but meaningful attempt to reconnect.';break;
   case 'reconcile:limited':bond(estranged,12);involve(estranged);result='Maintained cautious contact, slowly building trust.';break;
   case 'reconcile:avoid':bond(estranged,-8);involve(estranged);result='Chose not to reopen the relationship.';break;
   case 'enterprise:pilot':change(-3000);if(succeed()){x.enterprise=1;x.calling='Entrepreneur';result='The $3,000 pilot attracted customers; a small venture now has recurring earning potential.';}else result='The $3,000 pilot did not find sufficient demand.';break;
   case 'enterprise:research':change(-500);x.skills=clamp(x.skills+1,0,12);result='Spent $500 researching the opportunity and gaining useful knowledge.';break;
   case 'enterprise:pass':x.discipline=clamp(x.discipline+1,0,12);result='Protected savings and stayed with the existing plan.';break;
   case 'caregiving:care':bond(older,24);x.familyTime=clamp(x.familyTime+2,0,12);involve(older);result='Provided personal assistance and deepened a relationship with '+(older?.first||'an older relative')+'.';break;
   case 'caregiving:pay':{const cost=Math.min(3000,Math.max(0,p.wealth));change(-cost);bond(older,12);involve(older);result='Contributed '+money(cost)+' to care and other practical help.';}break;
   case 'caregiving:delegate':bond(older,5);involve(older);result='Shared the responsibilities while preserving time for other commitments.';break;
   default:return null;
  }
  return {result,others:resultIds};
 }
 root.LEGACY_EVENTS={propose,resolve};
})(typeof window==='undefined'?globalThis:window);
