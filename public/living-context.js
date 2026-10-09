'use strict';
/* Living Decisions: event eligibility is derived from saved character state, not invented diagnoses. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const cash=p=>Math.round(Number.isFinite(p?.wealth)?p.wealth:0);
 const label=p=>p?.first||'A relative';
 function relatives(p,people){
  const ids=new Set([...(p.parentIds||[]),...(p.adoptiveParentIds||[]),...(p.partnerId?[p.partnerId]:[]),...(p.formerPartners||[])]);
  for(const q of Object.values(people))if(q.id!==p.id&&[...(q.parentIds||[]),...(q.adoptiveParentIds||[])].includes(p.id))ids.add(q.id);
  return [...ids].map(id=>people[id]).filter(q=>q&&!q.deathYear);
 }
 function candidates(p,people,year){
  if(!p||p.deathYear)return [];
  const age=year-p.birthYear,kin=relatives(p,people),out=[];
  const offer=(kind,score,target,cause,title,text,options,facts)=>out.push({kind,score,targetId:target?.id||null,tag:'LIVING SITUATION',title,text,options,facts,cause,personIds:[p.id,...(target?[target.id]:[])],year});
  const ill=kin.filter(q=>(q.medical?.conditions||[]).some(c=>c.status==='active'&&c.stage>=2)).sort((a,b)=>Math.min(a.wealth,b.wealth)-Math.max(a.wealth,b.wealth))[0];
  if(ill&&age>=18){
   const active=ill.medical.conditions.find(c=>c.status==='active'&&c.stage>=2),d=root.LEGACY_MEDICINE?.catalog?.[active.id];
   const name=d?.name||'a serious condition';
   offer('care',10+Math.max(0,active.stage-2)*2,ill,'untreated '+name,
    label(ill)+' needs a care plan.',
    label(ill)+' is living with '+name.toLowerCase()+'. '+label(p)+' must balance available money, personal time, and other family responsibilities.',
    [['fund','Contribute to medical care','Commit some savings to treatment.'],['care','Help personally','Offer recurring hours of practical caregiving.'],['family','Ask family to share responsibility','Relatives may offer help, depending on their circumstances.'],['wait','Delay a commitment','Preserve resources now; care needs remain unresolved.']],
    {condition:active.id,stage:active.stage,ownSavings:cash(p),relativeSavings:cash(ill)});
  }
  const unemployed=age>=18&&age<65&&!p.retired&&!p.career?.jobId;
  if(unemployed)offer('unemployed',7,null,'currently unemployed','An employment crossroads.',
   label(p)+' does not have a current occupation. Work, training and short-term financial stability compete for attention.',
   [['apply','Apply for available work','Seek a job that fits existing qualifications.'],['study','Pursue vocational training','Commit time and money to future career options.'],['stabilize','Protect household resources','Reduce unnecessary spending while searching.']],{savings:cash(p),training:p.schooling?.credentials||[]});
  if(age>=21&&cash(p)<3000&&(p.finance?.consumerDebt||0)>2500)
   offer('debt',8,null,'high unsecured debt and low net worth','A household budget emergency.',
    'Living costs and debt have narrowed '+label(p)+"'s options. There is no painless response.",
    [['budget','Cut discretionary spending','Reduce living costs over the coming years.'],['support','Request family assistance','Seek help from someone who can afford it.'],['loan','Restructure the debt','Lower short-term pressure, at a longer-term cost.']],{savings:cash(p),debt:p.finance.consumerDebt});
  if(age>=28&&(p.finance?.mortgage||0)>0&&cash(p)<16000)
   offer('housing',6,null,'mortgage obligation and low reserves','Keeping the family home.',
    'Mortgage payments are straining '+label(p)+"'s financial reserves. Staying may require trade-offs.",
    [['cut','Reduce household expenses','Free cash for regular mortgage payments.'],['extra','Seek additional work','Trade time and energy for more income.'],['move','Consider selling and moving','Explore a less costly living arrangement.']],{mortgage:p.finance.mortgage,reserves:cash(p)});
  const strained=kin.filter(q=>(p.bonds?.[q.id]??50)<36).sort((a,b)=>(p.bonds?.[a.id]??50)-(p.bonds?.[b.id]??50))[0];
  if(strained&&age>=16)offer('conflict',5,strained,'existing low relationship trust','A family relationship is strained.',
   label(p)+' and '+label(strained)+' have grown distant. Their shared history influences whether they can rebuild trust.',
   [['talk','Reach out honestly','Try to restore communication.'],['mediate','Ask another relative to mediate','Invite family support for a difficult conversation.'],['space','Give the relationship space','Maintain boundaries without forcing an outcome.']],{bond:p.bonds?.[strained.id]??50});
  if(age>=60&&!p.retired&&(p.career?.jobId||p.jobLevel>0)&&cash(p)<35000)
   offer('retirement',6,null,'approaching retirement with modest savings','Retirement is not straightforward.',
   label(p)+' is approaching later life with limited financial reserves. Working longer may protect savings but reduce available time.',
   [['work','Keep working a little longer','Continue employment while health permits.'],['plan','Reduce spending and make a plan','Prepare a sustainable retirement budget.'],['retire','Retire despite the uncertainty','Gain time while accepting a change in income.']],{reserves:cash(p),age});
  return out;
 }
 function propose({p,people,year,rnd=()=>.5}){
  const list=candidates(p,people,year);
  if(!list.length)return null;
  const filtered=list.filter(c=>year-(p.livingCooldowns?.[c.kind]||0)>=5);
  if(!filtered.length)return null;
  filtered.sort((a,b)=>b.score-a.score);
  const best=filtered[0].score;
  const shortlist=filtered.filter(x=>x.score>=best-2);
  const chosen=shortlist[Math.floor(clamp(rnd(),0,.99999)*shortlist.length)]||filtered[0];
  return {...chosen,key:'living-'+chosen.kind};
 }
 // Stage 1 immediate implementation; richer negotiations, persistent costs and aftermath follow in subsequent stages.
 function resolve({p,event,option,people,year,rnd=()=>.5}){
  if(!event||!event.options?.some(o=>o[0]===option))return null;
  const q=people[event.targetId],other=q&&!q.deathYear?q:null;
  let text='',cost=0,relationship=0;
  switch(event.kind+':'+option){
   case 'care:fund':cost=Math.min(2400,Math.max(0,cash(p)));relationship=10;text='Contributed $'+cost.toLocaleString()+' toward care.';break;
   case 'care:care':relationship=14;text='Committed time to personal caregiving.';break;
   case 'care:family':relationship=4;text='Invited relatives to share the care responsibilities.';break;
   case 'care:wait':relationship=-4;text='Delayed arranging additional care.';break;
   case 'unemployed:apply':text='Began looking for work based on existing qualifications.';break;
   case 'unemployed:study':text='Decided to investigate training programs.';break;
   case 'unemployed:stabilize':p.finance&&(p.finance.budgetMode='careful');text='Adjusted household spending for a period without work.';break;
   case 'debt:budget':p.finance&&(p.finance.budgetMode='careful');text='Reduced discretionary household spending.';break;
   case 'debt:support':text='Reached out to relatives for financial assistance.';break;
   case 'debt:loan':text='Requested a debt repayment review; the obligation remains.';break;
   case 'housing:cut':p.finance&&(p.finance.budgetMode='careful');text='Tightened household spending to protect mortgage payments.';break;
   case 'housing:extra':text='Began seeking additional earnings.';break;
   case 'housing:move':text='Started evaluating whether to sell the home.';break;
   case 'conflict:talk':relationship=rnd()<.65?13:-4;text='Attempted to reopen communication.';break;
   case 'conflict:mediate':relationship=7;text='Asked for help facilitating a difficult family conversation.';break;
   case 'conflict:space':relationship=-2;text='Chose to maintain distance and boundaries.';break;
   case 'retirement:work':p.retired=false;text='Decided to keep working while possible.';break;
   case 'retirement:plan':p.finance&&(p.finance.budgetMode='careful');text='Adopted a more cautious retirement budget.';break;
   case 'retirement:retire':p.retired=true;text='Retired, with lower future employment income.';break;
   default:return null;
  }
  p.wealth-=cost;
  if(other&&relationship&&root.LEGACY_RELATIONSHIPS)root.LEGACY_RELATIONSHIPS.affect(p,other,relationship,year,'Living decision');
  p.livingCooldowns=p.livingCooldowns||{};p.livingCooldowns[event.kind]=year;
  return {result:text,others:other?[other.id]:[],impact:{wealth:-cost,relationship},storyKind:event.kind};
 }
 root.LEGACY_LIVING_CONTEXT={relatives,candidates,propose,resolve};
})(typeof window==='undefined'?globalThis:window);
