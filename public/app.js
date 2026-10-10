'use strict';
/* LEGACY v0.1 — local-first, deterministic prototype. Demographic probabilities and
   inheritance are gameplay approximations, NOT medically or statistically validated. */
(() => {
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const firstM=['Alexander','James','Oliver','Noah','Ethan','Liam','Elijah','Lucas','Henry','Daniel','Theodore','Benjamin','Leo','Marcus','Samuel','Nathan','Julian','Miles','Isaac','Andrew','Caleb','William','David','Adrian','Owen','Arthur','Gabriel','Felix','Jonah','Jack'];
const firstF=['Emma','Ava','Mia','Sophia','Olivia','Charlotte','Isabella','Amelia','Ella','Grace','Evelyn','Harper','Abigail','Lily','Maya','Zoe','Nora','Chloe','Hannah','Ruby','Ivy','Luna','Hazel','Clara','Sadie','Eleanor','Alice','Stella','Aria','Lucy'];
const lastNames=['Parker','Hayes','Bennett','Brooks','Rivera','Carter','Reed','Turner','Hughes','Morgan','Coleman','Foster','Mitchell','Ellis','Taylor','Harris','Sanders','Young','Price','Campbell','Bailey','Bell','Watson','Ross','Cooper','Wood'];
const cities=Object.keys(LEGACY_CALENDAR.LOCATIONS);
const jobs=['Student','Service worker','Skilled worker','Professional','Senior professional','Executive'];
const personalities=['Curious','Thoughtful','Ambitious','Practical','Sociable','Independent','Patient','Sensitive','Adventurous','Methodical'];
const VERSION=1;
const MAX_PEOPLE=2000; // Prototype safety limit; future builds need cohort aggregation.
let state=null,db=null,currentTab='tree',scope='focus',camera={x:0,y:0,scale:1},scene=[],sceneEdges=[],needsFit=true,toastHandle=0,saveHandle=0,busy=false;
const canvas=$('#tree-canvas'),ctx=canvas.getContext('2d');
const SEED_START=2654435769;
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0||SEED_START}
function rnd(){let x=state.rng>>>0||SEED_START;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng/4294967296}
function pick(a){return a[Math.floor(rnd()*a.length)]}
function chance(p){return rnd()<p}
function int(a,b){return Math.floor(rnd()*(b-a+1))+a}
function id(){return 'p'+(state.nextId++)}
function age(p){const birthday=(p.birthDate||String(p.birthYear)+'-01-01').slice(5);
 const today=state.calendar?.date?.slice(5)||'01-01';return state.year-p.birthYear-(today<birthday?1:0);
}
function alive(p){return !p.deathYear}
function persons(){return Object.values(state.people)}
function get(id){return state.people[id]||null}
function kids(p){return persons().filter(q => q.parentIds?.includes(p.id)||q.adoptiveParentIds?.includes(p.id))}
function partner(p){return p.partnerId?get(p.partnerId):null}
function full(p){return p?`${p.first} ${p.last}`:'Unknown'}
function fmtN(v){return new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(v)}
function money(v){return (v<0?'-':'')+'$'+fmtN(Math.abs(Math.round(v)))}
function yearSpan(p){return `${p.birthYear}–${p.deathYear||'present'}`}
function ages(p){return alive(p)?`Age ${age(p)}`:`Lived ${p.deathYear-p.birthYear} years`}
function initials(p){return (p.first?.[0]||'?')+(p.last?.[0]||'')}
function hue(id){let n=Number(String(id).replace(/\D/g,''))||1;return (154+n*43)%360}
function gradient(p){let h=hue(p.id);return `--c1:hsl(${h},29%,38%);--c2:hsl(${(h+40)%360},27%,18%)`}
function makeTraits(parentIds){let base={};for(let k of ['openness','conscientiousness','extraversion','agreeableness','emotionality']){const ps=parentIds.map(get).filter(Boolean);let m=ps.length?ps.reduce((v,p)=>v+p.traits[k],0)/ps.length:50;base[k]=Math.max(5,Math.min(95,Math.round(50+(m-50)*.43+int(-29,29))))}return base}
function createPerson({first,last,sex,birthYear,birthDate,gen=0,parentIds=[],adoptiveParentIds=[],inFamily=true,city='New York',education,jobLevel,wealth}){
 const p={id:id(),first,last,sex,birthYear,birthDate:birthDate||String(birthYear)+'-01-01',birthDatePrecision:birthDate?'day':'year',deathYear:null,gen,parentIds:[...parentIds],adoptiveParentIds:[...adoptiveParentIds],inFamily,city,
 partnerId:null,partnerSince:null,formerPartners:[],education:education??(birthYear<=state.year-25?int(1,3):0),jobLevel:jobLevel??(birthYear<=state.year-20?int(1,3):0),wealth:wealth??int(300,6500),
 traits:makeTraits(parentIds),bonds:{},eyeTint:pick(['hazel','brown','brown','blue','green']),hairTint:pick(['brown','black','blond','auburn']),memory:[]};
 LEGACY_HUMAN.ensure(p,state.year-birthYear);LEGACY_ECONOMY.ensure(p);LEGACY_MEDICINE.ensure(p);LEGACY_EDUCATION.ensure(p);LEGACY_CAREERS.ensure(p);LEGACY_LIVING_PSYCHOLOGY.ensure(p);state.people[p.id]=p;return p;
}
function addEvent(year,type,message,personIds=[]){const event={id:state.nextEvent++,year,date:year===state.year?(state.calendar?.date||String(year)+'-01-01'):String(year)+'-01-01',type,message,personIds:[...new Set(personIds.filter(Boolean))]};state.events.push(event);LEGACY_ATTENTION.add(state,event);return event;}
function bond(a,b,value){LEGACY_RELATIONSHIPS.affect(a,b,value,state.year,'family interaction')}
function linkCouple(a,b,type='partner',withEvent=true){
 if(a.partnerId||b.partnerId||a.id===b.id)return false;
 a.partnerId=b.id;b.partnerId=a.id;a.partnerSince=b.partnerSince=state.year;bond(a,b,int(14,27));
 if(withEvent)addEvent(state.year,'relationship',`${full(a)} and ${full(b)} began a life together.`,[a.id,b.id]);return true;
}
function unlinkCouple(a,b,reason='separated'){
 if(!a||!b||a.partnerId!==b.id)return;
 a.partnerId=null;b.partnerId=null;
 if(!a.formerPartners.includes(b.id))a.formerPartners.push(b.id);
 if(!b.formerPartners.includes(a.id))b.formerPartners.push(a.id);
 a.partnerSince=null;b.partnerSince=null;bond(a,b,-28);
 addEvent(state.year,reason==='widowed'?'death':'relationship',reason==='widowed'?`${full(a)} was widowed after the death of ${full(b)}.`:`${full(a)} and ${full(b)} separated.`,[a.id,b.id]);
}
function birth(a,b,adopted=false){
 if(state.nextId>MAX_PEOPLE)return null;
 const sex=chance(.5)?'female':'male', first=pick(sex==='female'?firstF:firstM);
 let familyParent=a.inFamily?a:(b?.inFamily?b:a),last=familyParent.last;
 const gen=Math.max(a.gen,b?.gen??a.gen)+1;
 const p=createPerson({first,last,sex,birthYear:state.year,birthDate:state.calendar?.date,gen,parentIds:adopted?[]:b?[a.id,b.id]:[a.id],adoptiveParentIds:adopted?(b?[a.id,b.id]:[a.id]):[],city:a.city,inFamily:!!(a.inFamily||b?.inFamily),education:0,jobLevel:0,wealth:0});
 LEGACY_CONSEQUENCES.childStart(p,[a,b]);bond(p,a,30);if(b)bond(p,b,30);const siblings=[...new Map([...kids(a),...(b?kids(b):[])].filter(q=>q.id!==p.id).map(q=>[q.id,q])).values()];for(const sibling of siblings)bond(p,sibling,12);
 if(!adopted&&b){p.eyeTint=chance(.47)?a.eyeTint:b.eyeTint;p.hairTint=chance(.47)?a.hairTint:b.hairTint}
 addEvent(state.year,adopted?'adoption':'birth',adopted?`${full(p)} joined the family through adoption.`:`${full(p)} was born to ${full(a)}${b?' and '+full(b):''}.`,[p.id,a.id,b?.id]);return p;
}
function newWorld(name='Alex Morgan',sex='male',startYear=2026){
 timelinePause();
 const clean=String(name).trim().replace(/\s+/g,' ');let spl=clean.split(' ');const first=spl.shift()||'Alex',last=spl.join(' ')||'Morgan';
 state={version:VERSION,year:startYear,calendar:{date:String(startYear)+'-01-01',minutes:9*60,daysElapsed:0,dailyJournal:[]},mode:'individual',realism:'realistic',founderId:null,selectedId:null,controlledId:null,rootId:null,nextId:1,nextEvent:1,rng:hash(clean+startYear),familyName:last,people:{},events:[],attention:{enabled:false,items:[]},pendingChoice:null,pendingSuccession:null,successionLog:[],remainingYears:0,createdAt:new Date().toISOString()};
 let father=createPerson({first:'Robert',last,sex:'male',birthYear:startYear-53,gen:0,education:2,jobLevel:3,wealth:80000});
 let mother=createPerson({first:'Elaine',last,sex:'female',birthYear:startYear-51,gen:0,education:3,jobLevel:3,wealth:92000});
 father.partnerId=mother.id;mother.partnerId=father.id;father.partnerSince=mother.partnerSince=startYear-27;bond(father,mother,30);
 let founder=createPerson({first,last,sex,birthYear:startYear-24,gen:1,parentIds:[father.id,mother.id],education:2,jobLevel:1,wealth:4500});
 let sister=createPerson({first:'Maya',last,sex:'female',birthYear:startYear-21,gen:1,parentIds:[father.id,mother.id],education:2,jobLevel:1,wealth:1500});
 bond(founder,father,25);bond(founder,mother,23);bond(sister,mother,25);bond(sister,father,25);bond(founder,sister,19);
 state.founderId=founder.id;state.rootId=father.id;state.selectedId=founder.id;state.controlledId=founder.id;
 addEvent(startYear-27,'relationship',`${full(father)} and ${full(mother)} became partners.`,[father.id,mother.id]);
 addEvent(startYear-24,'birth',`${full(founder)} was born.`,[founder.id,father.id,mother.id]);
 addEvent(startYear-21,'birth',`${full(sister)} was born.`,[sister.id,father.id,mother.id]);
 addEvent(startYear,'milestone',`The ${last} family's story begins.`,[founder.id]);
 LEGACY_ATTENTION.ensure(state).enabled=true;
 LEGACY_CALENDAR.ensure(state);
 currentTab='tree';scope='focus';needsFit=true;return state;
}
function annualDeathProbability(a){if(a<1)return .004;if(a<15)return .0002;if(a<30)return .0007;if(a<40)return .0013;if(a<50)return .0027;if(a<60)return .006;if(a<70)return .014;if(a<80)return .037;if(a<90)return .09;return Math.min(.5,.17+(a-90)*.012)}
function die(p,cause='Natural causes'){p.deathYear=state.year;p.deathDate=state.calendar?.date||String(state.year)+'-01-01';p.causeOfDeath=cause;const q=partner(p);if(q){p.partnerId=null;q.partnerId=null;p.partnerSince=null;q.partnerSince=null;if(!p.formerPartners.includes(q.id))p.formerPartners.push(q.id);if(!q.formerPartners.includes(p.id))q.formerPartners.push(p.id)}
 const heirs=[...(q&&alive(q)?[q]:[]),...kids(p).filter(alive)];if(p.wealth>1000&&heirs.length){let amount=p.wealth*.85/heirs.length;for(let h of heirs)h.wealth+=amount;p.wealth*=.15;addEvent(state.year,'inheritance',`${full(p)}'s estate passed to ${heirs.length} surviving family member${heirs.length>1?'s':''}.`,[p.id,...heirs.map(x=>x.id)])}
 addEvent(state.year,'death',`${full(p)} died at age ${age(p)}. Cause: ${cause}.`,[p.id]);
}
function meetPartner(p){if(p.partnerId||!alive(p)||age(p)<18||state.nextId>MAX_PEOPLE)return null;
 const a=age(p),sex=chance(.86)?(p.sex==='female'?'male':'female'):p.sex,offset=int(-5,5),bYear=state.year-Math.max(18,Math.min(79,a+offset));
 const other=createPerson({first:pick(sex==='female'?firstF:firstM),last:pick(lastNames),sex,birthYear:bYear,gen:p.gen,inFamily:false,city:p.city,wealth:int(2500,28000)});
 linkCouple(p,other);return other;
}
function maybeRelocate(p){if(chance(.012)){const from=p.city;let next=pick(cities);if(next!==from){p.city=next;addEvent(state.year,'move',`${full(p)} moved from ${from} to ${next}.`,[p.id]);const q=partner(p);if(q&&chance(.75))q.city=next;}}}
function incomeFor(p){return LEGACY_CAREERS.income(p)}
function yearlyEconomy(p){
 const a=age(p);if(a<18)return;
 LEGACY_CONSEQUENCES.annual(p,a,state.year);
 const npc=p.id!==state.controlledId;
 const untreated=p.medical?.conditions?.find(c=>c.status==='active'&&!c.treated&&c.stage>=2);
 if(npc&&untreated&&chance(.33)){
  const service=LEGACY_MEDICINE.catalog[untreated.id]?.care||'primary';
  const r=LEGACY_MEDICINE.care(p,service,state.year,rnd);
  if(r.ok)addEvent(state.year,'health',full(p)+': '+r.message,[p.id]);
 }
 for(const message of LEGACY_EDUCATION.annual(p,a,state.year,rnd))addEvent(state.year,'education',full(p)+' '+message,[p.id]);
 if(npc&&a>=18&&a<=38&&!p.schooling?.current&&chance(.065)){
  const programs=['ged','trade','cdl','culinary','it','emt','associate','bachelor','nursing','engineer','master','law','medicine'];
  const eligible=programs.filter(k=>LEGACY_EDUCATION.canEnroll(p,k,a).ok);
  if(eligible.length){
   const result=LEGACY_EDUCATION.enroll(p,pick(eligible),a,state.year);
   if(result.ok)addEvent(state.year,'education',full(p)+' '+result.message,[p.id]);
  }
 }
 for(const message of LEGACY_CAREERS.annual(p,a,state.year,rnd,npc))addEvent(state.year,'career',full(p)+' '+message,[p.id]);
 const dependentChildren=kids(p).filter(c=>alive(c)&&age(c)<18).length;
 const q=partner(p);
 return LEGACY_ECONOMY.annual(p,{age:a,year:state.year,income:p.retired?LEGACY_CAREERS.income(p,{includeRetired:true}):incomeFor(p),city:p.city,dependents:dependentChildren,hasPartner:!!(q&&alive(q)),rnd});
}
function simulateOneYear(){state.year++;
 const start=persons();
 for(const p of start){
  if(!alive(p))continue;
  const parents=[...(p.parentIds||[]),...(p.adoptiveParentIds||[])].map(get).filter(Boolean);
  const result=LEGACY_MEDICINE.annual(p,age(p),state.year,rnd,parents);
  for(const event of result.events)addEvent(state.year,'health',full(p)+': '+event.message,[p.id]);
  if(result.cause){die(p,result.cause);continue;}
  if(chance(annualDeathProbability(age(p))*LEGACY_HUMAN.deathRiskModifier(p))){
   const a=age(p);
   const cause=a<1?'Complications of infancy':a<35?pick(['Accidental injury','Severe infection']):a<65?pick(['Cardiovascular event','Accidental injury','Undiagnosed illness']):pick(['Cardiovascular event','Pneumonia','Age-related frailty']);
   die(p,cause);
  }
  if(alive(p)&&p.id===state.controlledId&&state.mode==='individual'&&!state.pendingChoice){
   const newCondition=result.events.find(e=>e.message.startsWith('Developed symptoms')||e.message.startsWith('Diagnosed with'));
   if(newCondition){
    state.pendingChoice={personId:p.id,kind:'medical',year:state.year,event:{
     tag:'MEDICAL DECISION',title:'Your health needs attention.',
     text:newCondition.message+' How should '+p.first+' respond?',
     options:[['primary','Visit a doctor','Arrange primary care and an examination.'],['specialist','See a specialist','Seek specialist assessment for more serious symptoms.'],['emergency','Get emergency treatment','Choose more intensive care at a higher cost.'],['wait','Wait and monitor','Postpone formal care; the illness may progress.']]
    }};
   }
  }
 }
 for(const p of start){if(!alive(p))continue;const bonds=Object.values(p.bonds||{});const support=bonds.length?bonds.reduce((t,v)=>t+v,0)/bonds.length:50;LEGACY_HUMAN.annual(p,{age:age(p),year:state.year,rnd,financialPressure:Math.min(90,Math.max(0,-p.wealth/700)),support});yearlyEconomy(p);if(age(p)>19&&age(p)<65)maybeRelocate(p);
  if(!p.partnerId&&age(p)>=19&&age(p)<=57&&chance(age(p)<40?.14:.055))meetPartner(p);
 }
 const pairKey=(a,b)=>[a,b].sort().join('|');
 const biologicalCounts=new Map(),adoptionCounts=new Map();
 for(const child of persons()){if(child.parentIds.length===2){const k=pairKey(...child.parentIds);biologicalCounts.set(k,(biologicalCounts.get(k)||0)+1)}if(child.adoptiveParentIds.length===2){const k=pairKey(...child.adoptiveParentIds);adoptionCounts.set(k,(adoptionCounts.get(k)||0)+1)}}
 const couples=[];
 for(const p of persons()){const q=partner(p);if(q&&p.id<q.id&&alive(p)&&alive(q))couples.push([p,q]);}
 for(const [p,q] of couples){if(!p.partnerId||!q.partnerId)continue;
  const years=state.year-(p.partnerSince??state.year);
  const tension=((p.needs?.stress||35)+(q.needs?.stress||35)>145)?.009:0;
  if(years>2&&chance(LEGACY_RELATIONSHIPS.fragility(p,q)+tension)){unlinkCouple(p,q);continue;}
  const f=p.sex==='female'?p:q.sex==='female'?q:null;
  const m=p.sex==='male'?p:q.sex==='male'?q:null;
  const parentsKids=biologicalCounts.get(pairKey(p.id,q.id))||0;
  if(f&&m&&age(f)>=19&&age(f)<=43&&age(m)>=19&&age(m)<=69){let rate=parentsKids===0?.19:parentsKids===1?.15:parentsKids===2?.10:parentsKids===3?.03:.004;
   if(rate&&parentsKids<5&&chance(rate))birth(f,m);
  } else if(age(p)>24&&age(q)>24&&age(p)<49&&age(q)<49){const adoptKids=adoptionCounts.get(pairKey(p.id,q.id))||0;
   if(adoptKids<2&&chance(.055))birth(p,q,true);
  }
 }
 LEGACY_RELATIONSHIPS.annual(state,state.year,rnd,(year,type,message,ids)=>addEvent(year,type,message,ids));
 const nextStory=LEGACY_STORYLINES.annual(state,state.year,rnd);
 if(nextStory&&!state.pendingChoice)state.pendingChoice={personId:state.controlledId,kind:'followup',year:state.year,event:nextStory};
 const active=get(state.controlledId);
 if(state.mode==='individual'&&active&&!alive(active)&&!state.pendingSuccession){
  LEGACY_SUCCESSION.prepare(state,active.id);
 }
}
function related(p){const ps=new Set([...(p.parentIds||[]),...(p.adoptiveParentIds||[])]);const siblingIds=ps.size?persons().filter(q=>q.id!==p.id&&[...(q.parentIds||[]),...(q.adoptiveParentIds||[])].some(id=>ps.has(id))).map(q=>q.id):[];let ids=[...ps,...kids(p).map(v=>v.id),...siblingIds,...(p.partnerId?[p.partnerId]:[]),...(p.formerPartners||[])];return [...new Set(ids)].map(get).filter(Boolean)}

const LIFE_CHOICES={
 launch:{tag:'COMING OF AGE',title:'Your future begins today.',text:'Adulthood brings opportunity—and responsibility. How will you start building your own life?',options:[['college','Go to college','Enroll in a multi-year degree program, with tuition and possible student debt.'],['trade','Learn a trade','Enter a multi-year apprenticeship with tuition and practical training.'],['work','Start working','Build savings and career experience immediately.']]},
 direction:{tag:'CROSSROADS',title:'Where does your ambition lead?',text:'An opportunity could change your career and finances. Do you take a risk or protect what you have?',options:[['promotion','Pursue a promotion','A better career is possible, but not guaranteed.'],['business','Start a business','Risk $7,500 on a new venture with an uncertain payoff.'],['stable','Choose stability','Focus on saving money and protecting your personal life.']]},
 family:{tag:'FAMILY MATTERS',title:'Family needs your attention.',text:'Other people rely on you, but you also have a life of your own. Where will your effort go?',options:[['financial','Help financially','Share up to $2,500 with a relative who needs it.'],['quality','Spend time together','Strengthen an important family relationship.'],['independent','Focus on yourself','Preserve your resources and pursue independence.']]},
 midlife:{tag:'A NEW CHAPTER',title:'It is time to reconsider your path.',text:'Life has changed. What kind of future will you prepare for?',options:[['retrain','Retrain for a new career','Pay $4,000 to develop skills that may pay off.'],['invest','Build a financial cushion','Make a long-term investment with an uncertain result.'],['balance','Prioritize your wellbeing','Ease the pressure and rebuild family connections.']]},
 retirement:{tag:'LATER YEARS',title:'What will the next chapter look like?',text:'Work, security, and family may mean different things now. You get to decide how to spend these years.',options:[['retire','Retire from work','Leave full-time work and rely on a modest retirement income.'],['continue','Keep working','Continue building savings while you can.'],['mentor','Invest in the next generation','Spend time and resources helping younger relatives.']]},
 relationship:{tag:'HEART & HOME',title:'An unexpected connection.',text:'Someone new could change the shape of your future family. How open are you to a relationship?',options:[['meet','Explore the connection','Take a chance on a possible new partner.'],['friends','Build friendships','Enjoy new connections without a commitment.'],['solo','Stay independent','Put your own goals first for now.']]}
};
function maybeLifeChoice(){
 if(state.pendingChoice||state.pendingSuccession)return false;
 const p=get(state.mode==='individual'?state.controlledId:state.selectedId);
 if(!p||!alive(p))return false;
 const a=age(p),last=Number(p.lastLifeChoiceYear)||0;
 if(a<18||a>75||state.year-last<4)return false;
 let kind=({18:'launch',25:'direction',35:'family',50:'midlife',65:'retirement'})[a]||null;
 if(!kind&&chance(state.realism==='casual'?.12:state.realism==='strict'?.08:.10)){
  const available=[];
  if(a>=19&&a<=58)available.push('direction');
  if(a>=22&&a<=70&&related(p).some(alive))available.push('family');
  if(a>=18&&a<=54&&!p.partnerId)available.push('relationship');
  if(a>=38&&a<=63)available.push('midlife');
  if(available.length)kind=pick(available);
 }
 if(!kind&&chance(.60)){
  const e=LEGACY_LIVING_CONTEXT.propose({p,people:state.people,year:state.year,rnd});
  if(e){state.pendingChoice={personId:p.id,kind:'living',year:state.year,event:e};return true;}
 }
 if(!kind&&chance(state.realism==='casual'?.30:.24)){
  const event=LEGACY_EVENTS.propose({p,people:state.people,year:state.year,rnd});
  if(event){state.pendingChoice={personId:p.id,kind:'event',year:state.year,event};return true;}
 }
 if(!kind)return false;
 state.pendingChoice={personId:p.id,kind,year:state.year};
 return true;
}

function showLivingDecision(){
 const pending=state.pendingChoice,p=get(pending?.personId),event=pending?.event;
 if(!p||!event)return;
 const context=Object.entries(event.facts||{}).filter(([k,v])=>['string','number'].includes(typeof v)).slice(0,3);
 const contextHtml=context.length?'<div class="living-facts">'+context.map(([key,value])=>'<div><small>'+esc(key.replace(/([A-Z])/g,' $1'))+'</small><strong>'+esc(typeof value==='number'&&(/savings|debt|mortgage|reserves/i).test(key)?money(value):value)+'</strong></div>').join('')+'</div>':'';
 const options=event.options.map((o,i)=>{
  let preview=null;
  if(pending.kind==='living'){
   p._gameAge=age(p);preview=LEGACY_LIVING_DECISIONS.preview(p,event,o[0],state.people,state.year);delete p._gameAge;
  }
  const known=preview?((preview.cashCost?'Upfront '+money(preview.cashCost):'No upfront charge')+(preview.hours?' · '+preview.hours+' hr/week':'')):'Long-term consequences may change';
  return '<button class="living-option" data-life-option="'+esc(o[0])+'" '+(preview&&!preview.ok?'disabled':'')+'><span class="living-option-index">'+(i+1)+'</span><span class="living-option-copy"><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small><em>'+esc(preview&&!preview.ok?preview.reason:known)+'</em></span><span class="living-option-arrow">→</span></button>';
 }).join('');
 showModal('<div class="living-choice-sheet"><div class="eyebrow">'+esc(event.tag||'LIVING DECISION')+' · '+state.year+'</div><div class="living-character">'+esc(full(p))+' · Age '+age(p)+'</div><h2>'+esc(event.title)+'</h2><p class="living-summary">'+esc(event.text)+'</p>'+contextHtml+'<div class="living-option-stack">'+options+'</div><p class="living-disclaimer">Known costs are shown above. Other people and future outcomes cannot be guaranteed.</p></div>');
 $('#modal-content').classList.add('living-decision-dialog');$('#modal-backdrop').classList.add('living-decision-backdrop');
 $('#toast').classList.add('hidden');
 $$('[data-life-option]').forEach(b=>b.onclick=()=>resolveLifeChoice(b.dataset.lifeOption));
}

function showLifeChoice(){
 const pending=state.pendingChoice;if(!pending)return;
 const p=get(pending.personId),choice=['event','medical','living','followup'].includes(pending.kind)?pending.event:LIFE_CHOICES[pending.kind];
 if(!p||!choice){state.pendingChoice=null;saveSoon();return;}
 if(['living','followup'].includes(pending.kind)){showLivingDecision();return;}
 $('#toast').classList.add('hidden');
 showModal('<div class="eyebrow">LIFE DECISION / '+esc(choice.tag)+'</div><div class="life-choice-meta">'+esc(full(p))+' · Age '+age(p)+' · '+state.year+'</div><h2>'+esc(choice.title)+'</h2><p>'+esc(choice.text)+'</p><div class="life-choice-options">'+choice.options.map((o,i)=>'<button class="life-choice-option" data-life-option="'+esc(o[0])+'"><span class="life-choice-number">0'+(i+1)+'</span><span><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small></span><span class="life-choice-arrow">→</span></button>').join('')+'</div><p class="modal-note">Your decision changes this person’s life and is remembered in the family chronicle.</p>');
 $$('.life-choice-option').forEach(b=>b.onclick=()=>resolveLifeChoice(b.dataset.lifeOption));
}
function resolveLifeChoice(action){
 const pending=state.pendingChoice;if(!pending)return;
 const p=get(pending.personId),template=['event','medical','living','followup'].includes(pending.kind)?pending.event:LIFE_CHOICES[pending.kind];
 if(!p||!template)return;
 const option=template.options.find(o=>o[0]===action);if(!option)return;
 const impactful=['living','followup'].includes(pending.kind);
 const targetId=pending.kind==='living'?pending.event?.targetId:
  pending.kind==='followup'?state.storylines?.find(x=>x.id===pending.event?.storyId)?.targetId:null;
 const beforeImpact=impactful?LEGACY_LIVING_IMPACT.snapshot(state,p,targetId):null;
 const fortune=state.realism==='casual'?.82:state.realism==='strict'?.52:.67;
 const changeMoney=amount=>{p.wealth=Math.max(-100000,Math.round(p.wealth+amount));};
 const kin=related(p).filter(alive).filter(q=>q.id!==p.id).sort((a,b)=>a.wealth-b.wealth);
 let result='',others=[];
 if(pending.kind==='medical'){
  if(action==='wait')result='Chose to monitor symptoms without an immediate medical appointment.';
  else{
   const visit=LEGACY_MEDICINE.care(p,action,state.year,rnd);
   result=visit.message;
  }
 }else if(pending.kind==='living'){
  const story=LEGACY_LIVING_DECISIONS.commit({state,p,event:pending.event,action,year:state.year,rnd});
  if(!story.ok){toast(story.result);showLifeChoice();return;}
  result=story.result;others=story.others||[];
  LEGACY_STORYLINES.fromDecision(state,story.record,pending.event);
 }else if(pending.kind==='followup'){
  const story=LEGACY_STORYLINES.decide(state,pending.event.storyId,p.id,action,state.year);
  if(!story.ok){toast(story.result);return;}
  result=story.result;others=story.others||[];
 }else if(pending.kind==='event'){
  const story=LEGACY_EVENTS.resolve({p,people:state.people,year:state.year,event:pending.event,option:action,rnd,cities});
  if(!story)return;
  result=story.result;others=story.others||[];
 }else switch(action){
 case 'college':{const target=LEGACY_EDUCATION.has(p,'hs')?'bachelor':'ged';const r=LEGACY_EDUCATION.enroll(p,target,age(p),state.year);result=r.ok?r.message:r.message+' Explore other programs in the School tab.';}break;
 case 'trade':{const target=LEGACY_EDUCATION.has(p,'hs')?'trade':'ged';const r=LEGACY_EDUCATION.enroll(p,target,age(p),state.year);result=r.message;}break;
 case 'work':{const c=LEGACY_CAREERS.details(p,age(p));const r=c.current?{ok:true,message:'Continued in '+c.current.name+'.'}:LEGACY_CAREERS.apply(p,'service',age(p),state.year,()=>0);if(r.ok)changeMoney(4500);result=r.ok?r.message+' Built $4,500 in initial savings.':r.message;}break;
 case 'promotion':{const r=LEGACY_CAREERS.promote(p,state.year,()=>chance(fortune)?0:1);if(r.ok)changeMoney(3000);result=r.message;}break;
 case 'business':changeMoney(-7500);if(chance(Math.max(.2,fortune-.12+(p.traits.openness-50)/300))){const gains=int(12000,28000);changeMoney(gains);result='The new venture succeeded, returning '+money(gains)+' after the initial investment.';}else result='The new venture struggled and the $7,500 startup investment was lost.';break;
 case 'stable':changeMoney(3500);result='Chose a steadier path and accumulated $3,500 in savings.';break;
 case 'financial':if(kin.length){const q=kin[0],amount=Math.max(0,Math.min(2500,p.wealth));changeMoney(-amount);q.wealth+=amount;bond(p,q,14);others=[q.id];result=amount?'Shared '+money(amount)+' with '+full(q)+', strengthening their relationship.':'Had little money to spare, but reached out and strengthened a family bond.';}else result='Tried to help family, but no living close relatives were available.';break;
 case 'quality':if(kin.length){const q=kin[0];bond(p,q,22);others=[q.id];result='Spent meaningful time with '+full(q)+' and became closer.';}else result='Made room for future friendships and connections.';break;
 case 'independent':changeMoney(1800);if(kin.length){bond(p,kin[0],-5);others=[kin[0].id];}result='Prioritized personal goals and built an additional $1,800 in savings.';break;
 case 'retrain':{const target=LEGACY_EDUCATION.has(p,'hs')?'it':'ged';const r=LEGACY_EDUCATION.enroll(p,target,age(p),state.year);result=r.message;}break;
 case 'invest':changeMoney(-3500);{const returns=chance(fortune)?int(4500,10000):int(0,2000);changeMoney(returns);result=returns>=3500?'A long-term investment paid off, returning '+money(returns)+'.':'The investment underperformed, returning only '+money(returns)+'.';}break;
 case 'balance':if(kin.length){bond(p,kin[0],18);others=[kin[0].id];}result='Chose a less pressured life and focused on relationships.';break;
 case 'retire':p.retired=true;result='Retired from full-time work. Future income will be lower, with more time for family.';break;
 case 'continue':p.retired=false;changeMoney(4500);result='Continued working and added $4,500 to retirement savings.';break;
 case 'mentor':{const q=kin.find(v=>age(v)<age(p));if(q){const amount=Math.max(0,Math.min(1500,p.wealth));changeMoney(-amount);q.wealth+=amount;bond(p,q,20);others=[q.id];result='Passed on experience and '+money(amount)+' to '+full(q)+'.';}else result='Shared a lifetime of experience with the community.';}break;
 case 'meet':if(!p.partnerId&&chance(fortune)){const q=meetPartner(p);if(q){others=[q.id];result='A new relationship began with '+full(q)+'.';}else result='No new partnership formed.';}else result='The connection did not turn into a lasting relationship.';break;
 case 'friends':if(kin.length){bond(p,kin[0],10);others=[kin[0].id];}result='Built meaningful connections while remaining single.';break;
 case 'solo':changeMoney(1200);result='Stayed independent and saved $1,200 toward personal goals.';break;
 default:return;
 }
 LEGACY_CONSEQUENCES.apply(p,action,state.year,result);LEGACY_HUMAN.effect(p,action);
 p.lastLifeChoiceYear=state.year;
 state.pendingChoice=null;
 addEvent(state.year,'choice',full(p)+' chose: '+option[1]+'. '+result,[p.id,...others]);
 needsFit=true;render();saveSoon();
 const left=Math.max(0,Math.min(100,Number(state.remainingYears)||0));
 if(impactful){
  const changes=LEGACY_LIVING_IMPACT.compare(beforeImpact,LEGACY_LIVING_IMPACT.snapshot(state,p,targetId)).slice(0,6);
  const rows=changes.length?changes.map(v=>{
   const format=n=>v.format==='money'?money(n):v.format==='hours'?n+' hr':String(n);
   return '<div class="living-change"><small>'+esc(v.label)+'</small><strong>'+esc(format(v.before))+' → '+esc(format(v.after))+'</strong></div>';
  }).join(''):'<p class="living-empty">No immediate numerical changes. The decision affects future opportunities or commitments.</p>';
  showModal('<div class="living-outcome-sheet"><div class="eyebrow">YOUR DECISION · '+state.year+'</div><h2>'+esc(option[1])+'</h2><p>'+esc(result)+'</p><div class="living-changes">'+rows+'</div><p class="living-disclaimer">These are actual game-state changes. Long-term consequences will emerge as time advances.</p><div class="modal-actions">'+(left?'<button class="primary" id="life-continue">Continue '+left+' year'+(left===1?'':'s')+' →</button>':'')+'<button class="secondary" id="life-finish">'+(left?'Stop here':'Return to family')+'</button></div></div>');
  $('#modal-content').classList.add('living-decision-dialog');$('#modal-backdrop').classList.add('living-decision-backdrop');
 }else showModal('<div class="eyebrow">THE CONSEQUENCES / '+state.year+'</div><h2>'+esc(option[1])+'</h2><p>'+esc(result)+'</p><p class="modal-note">Saved to your family chronicle. Personal wealth: '+money(p.wealth)+' · Education level: '+p.education+'.</p><div class="modal-actions">'+(left?'<button class="primary" id="life-continue">Continue '+left+' year'+(left===1?'':'s')+' →</button>':'')+'<button class="secondary" id="life-finish">'+(left?'Stop here':'Return to family')+'</button></div>');
 if(left)$('#life-continue').onclick=()=>{const years=left;state.remainingYears=0;closeModal();advance(years,true);};
 $('#life-finish').onclick=()=>{state.remainingYears=0;saveSoon();closeModal();};
}

function decide(action){
 const p=get(state.selectedId);if(!p||!alive(p))return;
 if(state.mode==='individual'&&p.id!==state.controlledId){toast('Take control of this person before making life decisions.');return;}
 if(action==='partner'){
  if(p.partnerId||age(p)<18){toast('A relationship is not available at this life stage.');return}
  if(state.realism==='strict'&&!chance(.68)){addEvent(state.year,'relationship',`${full(p)} met someone, but the connection did not last.`,[p.id]);toast('They met someone, but it did not become a relationship.');}
  else{const q=meetPartner(p);toast(q?`${p.first} and ${q.first} are now partners.`:'No relationship formed.');}
 } else if(action==='child'){
  const q=partner(p);if(!q||age(p)<18){toast('A partner and adulthood are required.');return}
  const f=p.sex==='female'?p:q.sex==='female'?q:null;
  const m=p.sex==='male'?p:q.sex==='male'?q:null;
  const eligible=!!(f&&m&&age(f)>=18&&age(f)<=43&&age(m)>=18&&age(m)<=69);
  if(eligible){if(chance(state.realism==='casual'?.8:.43)){const baby=birth(f,m);if(!baby){toast('Prototype population limit reached. Export this family to preserve it.');return}toast(`${baby.first} was born! The tree has grown.`);needsFit=true}else{addEvent(state.year,'milestone',`${full(p)} and ${full(q)} hoped to welcome a child.`,[p.id,q.id]);toast('No birth this year. You can try again.')}}
  else if(age(p)>=21&&age(q)>=21){const baby=birth(p,q,true);if(!baby){toast('Prototype population limit reached. Export this family to preserve it.');return}toast(`${baby.first} joined the family through adoption.`);needsFit=true}
  else toast('Neither a biological birth nor adoption is available currently.');
 } else if(action==='career'){
  showPersonStats(p.id,'career');return;
 } else if(action==='educate'){
  showPersonStats(p.id,'education');return;
 } else if(action==='move'){
  if(age(p)<18){toast('Must be an adult to move independently.');return}
  const old=p.city;let next=cities[(cities.indexOf(old)+1+int(0,3))%cities.length];p.city=next;p.wealth-=2100;
  addEvent(state.year,'move',`${full(p)} relocated from ${old} to ${next}.`,[p.id]);toast(`Moved to ${next}.`);
 } else if(action==='home'){
  const other=partner(p);const bought=LEGACY_ECONOMY.purchaseHome(p,{age:age(p),partnerHome:!!(other&&other.finance?.propertyValue>0)});
  if(bought.ok)addEvent(state.year,'housing',full(p)+' '+bought.message,[p.id,other?.id]);
  toast(bought.message);
 } else if(action==='budget'){
  const mode=LEGACY_ECONOMY.changeBudget(p);
  addEvent(state.year,'economy',full(p)+' switched to a '+mode+' household budget.',[p.id]);
  toast('Household budget: '+mode+'. Future expenses will change.');
 } else if(action==='support'){
  if(p.wealth<1000){toast('Requires at least $1,000 in savings.');return}
  const rel=related(p).filter(alive).filter(q=>q.id!==p.id);
  if(!rel.length){toast('No available relatives to support.');return}
  rel.sort((a,b)=>a.wealth-b.wealth);const q=rel[0];p.wealth-=1000;q.wealth+=1000;bond(p,q,12);
  addEvent(state.year,'family',`${full(p)} supported ${full(q)} with $1,000.`,[p.id,q.id]);toast(`${q.first} received family support.`);
 }
 LEGACY_CONSEQUENCES.apply(p,action,state.year);LEGACY_HUMAN.effect(p,action);
 saveSoon();render();
}

function renderAttention(){
 if(!state)return;
 const notices=LEGACY_ATTENTION.unread(state);
 const banner=$('#attention-banner'),inbox=$('#attention-inbox');
 banner.classList.toggle('hidden',!notices.length);
 inbox.classList.toggle('hidden',!notices.length);
 if(!notices.length)return;
 const top=notices[0],p=get(top.personId);
 if(!p)return;
 $('#attention-label').textContent=top.label.toUpperCase()+' · '+top.year;
 $('#attention-name').textContent=alive(p)?'Check on '+p.first:'See what happened to '+p.first;
 $('#attention-message').textContent=top.message;
 $('#attention-count').textContent=String(notices.length);
 inbox.setAttribute('aria-label',notices.length+' important family update'+(notices.length===1?'':'s')+'. Open attention inbox.');
 $('#attention-go').onclick=()=>reviewAttentionPerson(top.personId);
 $('#attention-dismiss').onclick=()=>{
  if(LEGACY_ATTENTION.dismiss(state,top.id)){
   renderAttention();if(currentTab==='tree')drawGraph();if(currentTab==='people')renderPeople();saveSoon();
  }
 };
 inbox.onclick=()=>showAttentionInbox();
}
function reviewAttentionPerson(id){
 if(state.pendingChoice||state.pendingSuccession)return;
 if(!get(id))return;
 showPersonStats(id,'history');
}
function showAttentionInbox(){
 if(state.pendingChoice||state.pendingSuccession)return;
 const items=LEGACY_ATTENTION.unread(state);
 const cards=items.map(a=>{
  const p=get(a.personId);
  if(!p)return '';
  return '<button class="attention-list-item" data-attention-person="'+esc(p.id)+'"><span class="attention-list-dot '+(a.priority>=4?'urgent':'')+'">!</span><span class="attention-list-copy"><strong>'+esc(full(p))+'</strong><small>'+esc(a.label)+' · '+a.year+'</small><em>'+esc(a.message)+'</em></span><span class="attention-list-arrow">→</span></button>';
 }).join('');
 showModal('<div class="attention-inbox-sheet"><div class="attention-inbox-title"><div><div class="eyebrow">FAMILY UPDATES</div><h2>Who needs attention?</h2></div><button class="attention-inbox-close" id="attention-close" aria-label="Close updates" type="button">✕</button></div><p class="attention-inbox-intro">Important changes stay here until you review the person or dismiss the reminder.</p><div class="attention-inbox-items" role="region" aria-label="Unread family reminders — scroll to see more" tabindex="0">'+(items.length?cards:'<p class="person-page-empty">Everyone is up to date.</p>')+'</div><div class="attention-inbox-foot"><span>'+items.length+' unread update'+(items.length===1?'':'s')+'</span><span class="attention-scroll-hint">'+(items.length>4?'Swipe to see more ↓':'')+'</span></div><div class="attention-inbox-bottom"><button id="attention-clear" '+(!items.length?'disabled':'')+'>Dismiss all reminders</button></div></div>');
 $('#modal-content').classList.add('attention-inbox-dialog');
 $('#modal-backdrop').classList.add('attention-inbox-backdrop');
 $('#attention-close').onclick=closeModal;
 $('#attention-clear').onclick=()=>{
  LEGACY_ATTENTION.dismissAll(state);
  saveSoon();renderAttention();if(currentTab==='tree')drawGraph();if(currentTab==='people')renderPeople();
  showAttentionInbox();
 };
 $$('[data-attention-person]').forEach(b=>b.onclick=()=>reviewAttentionPerson(b.dataset.attentionPerson));
}

function showToast(msg){toast(msg)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.classList.add('hidden'),2600)}
function renderStats(){const all=persons(),living=all.filter(alive),family=all.filter(p=>p.inFamily),gs=family.map(p=>p.gen),generation=gs.length?Math.max(...gs)+1:1;
 const wealth=living.reduce((v,p)=>v+p.wealth,0);
 $('#header-year').textContent=state.year;
 renderCalendar();
 $('#stats').innerHTML=[['LIVING RELATIVES',fmtN(living.length),'↗'],['RECORDED LIVES',fmtN(all.length),''],['GENERATIONS',String(generation),''],['FAMILY NET WORTH',money(wealth),'']].map(s=>`<div class="stat"><div class="stat-label">${s[0]}</div><div class="stat-value">${s[1]} ${s[2]?`<small>${s[2]}</small>`:''}</div></div>`).join('');
 $('#world-title').textContent=`THE ${state.familyName.toUpperCase()} FAMILY`;
 $('#tree-heading').textContent=`The ${state.familyName} family`;
 $('#time-copy').textContent=`${fmtN(all.length)} lives woven across ${generation} generations.`;
 $$('.mode-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
}


/* Simulation is explicitly started by the player; it never catches up in the background. */
let timelineRunning=false,timelineInterval=null,timelineLastReal=0,timelineFractionMs=0,timelineLastSaved=0;
function renderTimeline(){
 if(!state)return;
 const settings=LEGACY_TIMELINE.ensure(state);
 const c=LEGACY_CALENDAR.ensure(state);
 const date=LEGACY_CALENDAR.parse(c.date);
 const yearDays=LEGACY_CALENDAR.leap(date.year)?366:365;
 const dayMs=settings.speedMinutes*60000/yearDays;
 const fraction=Math.max(0,Math.min(.999,timelineFractionMs/dayMs));
 const percentage=Math.round(LEGACY_TIMELINE.progress(c.date,fraction)*10000)/100;
 const progress=$('#timeline-track');
 progress.setAttribute('aria-valuenow',String(Math.round(percentage)));
 progress.setAttribute('aria-valuetext',Math.round(percentage)+' percent through '+date.year);
 $('#timeline-fill').setAttribute('style','width:'+percentage+'%');
 const months=LEGACY_TIMELINE.months(c.date);
 $('#timeline-months').innerHTML=months.map(m=>'<span class="'+(m.active?'active':m.passed?'passed':'')+'">'+m.label+'</span>').join('');
 $('#timeline-speed').value=String(settings.speedMinutes);
 $('#time-summary').textContent=(timelineRunning?'Running':'Paused')+' · 1 year / '+settings.speedMinutes+' min';
 $('#timeline-play').textContent=timelineRunning?'Ⅱ Pause':'▶ Play';
 $('#timeline-play').setAttribute('aria-label',timelineRunning?'Pause living timeline':'Play living timeline');
 const secondsRemaining=LEGACY_TIMELINE.remaining(c.date,settings.speedMinutes);
 $('#timeline-status').textContent=timelineRunning?
  'Running · '+(secondsRemaining>=60?Math.ceil(secondsRemaining/60)+' min':Math.ceil(secondsRemaining)+' sec')+' to next year':
  'Paused · manual time controls remain available';
}
function timelinePause(){
 const wasRunning=timelineRunning;
 timelineRunning=false;
 if(timelineInterval!==null&&typeof clearInterval==='function')clearInterval(timelineInterval);
 timelineInterval=null;timelineLastReal=0;timelineFractionMs=0;
 if(state){renderTimeline();if(wasRunning)saveSoon();}
 return wasRunning;
}
function timelineAdvance(elapsedMs){
 if(!state||busy||state.pendingChoice||state.pendingSuccession)return 0;
 if(typeof document!=='undefined'&&document.visibilityState==='hidden')return 0;
 if(!$('#modal-backdrop').classList.contains('hidden'))return 0;
 if(state.nextId>MAX_PEOPLE){timelinePause();return 0;}
 const c=LEGACY_CALENDAR.ensure(state);
 const settings=LEGACY_TIMELINE.ensure(state);
 const step=LEGACY_TIMELINE.step({date:c.date,elapsedMs:Math.max(0,Math.min(1200,elapsedMs)),remainderMs:timelineFractionMs,
  speedMinutes:settings.speedMinutes,maxDays:16});
 timelineFractionMs=step.remainderMs;
 if(step.days)advanceCalendar('day',step.days,true);
 if(state.pendingChoice||state.pendingSuccession){timelinePause();return step.days;}
 if(Date.now()-timelineLastSaved>5000){
  timelineLastSaved=Date.now();saveGame();
 }
 renderTimeline();
 return step.days;
}
function timelinePlay(){
 if(timelineRunning)return timelinePause();
 if(!state||busy||state.pendingChoice||state.pendingSuccession)return false;
 if(typeof document!=='undefined'&&document.visibilityState==='hidden')return false;
 if(!$('#modal-backdrop').classList.contains('hidden')||$('#time-popup').open)return false;
 if(state.nextId>MAX_PEOPLE){toast('Prototype person limit reached.');return false;}
 if(typeof setInterval!=='function')return false;
 timelineRunning=true;timelineLastReal=Date.now();timelineLastSaved=Date.now();timelineFractionMs=0;
 timelineInterval=setInterval(()=>{
  if(!timelineRunning)return;
  if(typeof document!=='undefined'&&document.visibilityState==='hidden'){timelinePause();return;}
  const now=Date.now(),delta=Math.max(0,Math.min(1200,now-timelineLastReal));
  timelineLastReal=now;
  timelineAdvance(delta);
 },200);
 renderTimeline();return true;
}
function timelineSpeed(value){
 if(!state)return;
 LEGACY_TIMELINE.ensure(state).speedMinutes=LEGACY_TIMELINE.validSpeed(value);
 timelineFractionMs=0;timelineLastReal=Date.now();
 renderTimeline();saveSoon();
}

function calendarTime(minutes){
 const h=Math.floor(minutes/60),m=Math.round(minutes%60);
 return (h%12||12)+':'+String(m).padStart(2,'0')+(h<12?' AM':' PM');
}
function renderCalendar(){
 const c=LEGACY_CALENDAR.ensure(state),parsed=LEGACY_CALENDAR.parse(c.date);
 renderTimeline();
 const p=get(state.selectedId)||get(state.controlledId);
 const summary=p?LEGACY_CALENDAR.schedule(p,state,LEGACY_CAREERS.jobs):null;
 const count=LEGACY_CALENDAR.dayOfYear(parsed.year,parsed.month,parsed.day);
 $('#header-day-count').textContent='DAY '+String(count).padStart(3,'0')+' / '+(LEGACY_CALENDAR.leap(parsed.year)?366:365);
 $('#calendar-date').textContent=LEGACY_CALENDAR.dateLabel(c.date);
 $('#calendar-weekday').textContent=LEGACY_CALENDAR.weekdayLabel(c.date)+' · Day '+count+' of '+(LEGACY_CALENDAR.leap(parsed.year)?366:365)+' · '+c.daysElapsed.toLocaleString()+' days elapsed';
 $('#calendar-clock').textContent=summary?((summary.date!==c.date?summary.date+' · ':'')+calendarTime(summary.minutes)+' '+summary.abbreviation+' · '+p.city):calendarTime(c.minutes);
 $('#calendar-work').textContent=summary?(summary.sector+' · '+summary.reason+(summary.scheduled?' · '+calendarTime(summary.start)+'–'+calendarTime(summary.end):'')):'No selected character';
 $('#calendar-holiday').textContent=summary?.holiday||'';
 $('#calendar-detail').setAttribute('aria-label','Open calendar details for '+c.date);
}
function showCalendarDetails(){
 if(state.pendingChoice||state.pendingSuccession)return;
 const c=LEGACY_CALENDAR.ensure(state),p=get(state.selectedId)||get(state.controlledId),info=p?LEGACY_CALENDAR.schedule(p,state,LEGACY_CAREERS.jobs):null;
 if(!p)return;
 const upcoming=[];let date=c.date;
 for(let i=0;i<=100&&upcoming.length<4;i++){
  const title=LEGACY_CALENDAR.holiday(date,p.city);
  if(title)upcoming.push({date,title});
  date=LEGACY_CALENDAR.shiftDays(date,1);
 }
 const locations=persons().filter(x=>alive(x)).reduce((a,q)=>{if(!a.includes(q.city))a.push(q.city);return a},[]).slice(0,4);
 const clocks=locations.map(city=>{
  const t=LEGACY_CALENDAR.atPerson(state,{city});
  return '<div class="calendar-modal-row"><span>'+esc(city)+'</span><strong>'+calendarTime(t.minutes)+' '+esc(t.abbreviation)+'</strong></div>';
 }).join('');
 const holidays=upcoming.map(item=>'<div class="calendar-modal-row"><span>'+esc(item.title)+'</span><strong>'+esc(item.date)+'</strong></div>').join('')||'<p>No modeled holidays in the next 100 days.</p>';
 const reports=c.dailyJournal.slice(-3).reverse().map(e=>'<div class="calendar-modal-row"><span>'+esc(e.date)+' · '+esc(e.sector||'Work')+'</span><strong>'+e.hours+' planned hr</strong></div>').join('');
 const here=LEGACY_CALENDAR.cityInfo(p.city);
 showModal('<div class="calendar-modal"><div class="eyebrow">WORLD CLOCK · '+esc(here.country)+'</div><h2>'+esc(LEGACY_CALENDAR.dateLabel(c.date))+'</h2><p>'+esc(LEGACY_CALENDAR.weekdayLabel(c.date))+' · '+calendarTime(info.minutes)+' '+esc(info.abbreviation)+' · '+esc(p.city)+'</p><div class="calendar-modal-section"><h3>'+esc(full(p))+' · '+esc(info.sector)+'</h3><div class="calendar-modal-row"><span>Today</span><strong>'+esc(info.reason)+'</strong></div><div class="calendar-modal-row"><span>Standard shift</span><strong>'+esc(info.scheduled?calendarTime(info.start)+'–'+calendarTime(info.end):'No shift today')+'</strong></div><div class="calendar-modal-row"><span>Holiday</span><strong>'+esc(info.holiday||'None')+'</strong></div></div><div class="calendar-modal-section"><h3>Upcoming public holidays</h3>'+holidays+'</div><div class="calendar-modal-section"><h3>Family time zones</h3>'+clocks+'</div><div class="calendar-modal-actions"><button id="calendar-close" class="primary">Return to family</button></div></div>');
 $('#calendar-close').onclick=closeModal;
}
function calendarDayLog(){
 const c=LEGACY_CALENDAR.ensure(state);
 const entry=LEGACY_CALENDAR.dayReport(state,LEGACY_CAREERS.jobs);
 if(entry&&entry.personId){
  const p=get(entry.personId);
  if(p&&entry.hours){
   if(!p.workHours)p.workHours={};
   const n=p.workHours[String(state.year)]||{scheduledHours:0,scheduledDays:0,holidayDays:0};
   n.scheduledHours+=entry.hours;n.scheduledDays++;p.workHours[String(state.year)]=n;
   for(const y of Object.keys(p.workHours))if(+y<state.year-2)delete p.workHours[y];
  }else if(p&&entry.holiday){
   if(!p.workHours)p.workHours={};
   const n=p.workHours[String(state.year)]||{scheduledHours:0,scheduledDays:0,holidayDays:0};
   n.holidayDays++;p.workHours[String(state.year)]=n;
  }
 }
 // A known birthday occurs on the actual calendar day, not automatically on January 1.
 for(const p of persons()){
  if(!alive(p)||p.birthDatePrecision!=='day'||p.birthYear>=state.year)continue;
  if(p.birthDate.slice(5)===c.date.slice(5))addEvent(state.year,'birthday',full(p)+' celebrated a birthday.',[p.id]);
 }
}
function advanceCalendar(unit,amount=1,quiet=false){
 if(!quiet)timelinePause();
 if(busy||state.pendingChoice||state.pendingSuccession)return;
 if(state.nextId>MAX_PEOPLE){toast('2,000-person prototype limit reached.');return;}
 const c=LEGACY_CALENDAR.ensure(state);
 busy=true;const start=c.date;let elapsed=0;
 try{
  if(unit==='hour'){
   const oldYear=state.year;
   LEGACY_CALENDAR.updateFromInstant(state,c.instant+3600000*amount);
   if(+c.date.slice(0,4)>oldYear){simulateOneYear();if(!state.pendingChoice&&!state.pendingSuccession)maybeLifeChoice();}
   if(c.date!==start)calendarDayLog();
   elapsed=1;
  }else{
   const destination=unit==='month'?LEGACY_CALENDAR.shiftMonths(c.date,amount):LEGACY_CALENDAR.shiftDays(c.date,amount);
   const duration=Math.round((Date.parse(destination+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
   for(let i=0;i<duration;i++){
    c.date=LEGACY_CALENDAR.shiftDays(c.date,1);LEGACY_CALENDAR.reanchor(state);c.daysElapsed++;elapsed++;
    if(+c.date.slice(0,4)>state.year){simulateOneYear();if(!state.pendingChoice&&!state.pendingSuccession)maybeLifeChoice();}
    calendarDayLog();
    if(state.pendingChoice||state.pendingSuccession||state.nextId>MAX_PEOPLE)break;
   }
  }
  needsFit=false;render();saveSoon();
  if(state.pendingSuccession)showSuccession();
  else if(state.pendingChoice)showLifeChoice();
  else if(!quiet)toast(elapsed===1&&unit==='hour'?'1 hour passed · '+LEGACY_CALENDAR.dateLabel(c.date):elapsed+' calendar day'+(elapsed===1?'':'s')+' passed · '+LEGACY_CALENDAR.dateLabel(c.date));
 }catch(e){console.error(e);toast('Calendar error. The last saved game remains available.');}
 finally{busy=false;}
}

function renderProfile(){const p=get(state.selectedId);if(!p)return;
 $('#selected-name').textContent=full(p);
 $('#selected-avatar').textContent=initials(p);
 $('#selected-meta').textContent=ages(p)+' · '+p.city;
 $('#selected-person').setAttribute('aria-label','Open '+full(p)+"'s life and decisions");
 const parents=p.parentIds.map(get).filter(Boolean),adopters=p.adoptiveParentIds.map(get).filter(Boolean),children=kids(p),q=partner(p);
 const mine=state.mode==='family'||(p.id===state.controlledId);
 const canAct=alive(p)&&mine;
 const events=state.events.filter(e=>e.personIds.includes(p.id)).slice(-5).reverse();
 const job=age(p)<18?'Growing up':age(p)>=67?'Retired':jobs[Math.min(p.jobLevel,5)];
 const education=['Early learning','Secondary','Vocational / college','Higher education','Advanced education'][Math.min(p.education,4)]||'Education';
 const distinctRel=(list,label)=>list.map(v=>`<button class="relation-chip" data-person="${esc(v.id)}" title="Open ${esc(full(v))}">${esc(v.first)} · ${label}</button>`).join('');
 const summary=`${esc(p.first)} ${alive(p)?'lives':'lived'} in ${esc(p.city)}. ${p.traits.openness>65?'Naturally curious':p.traits.conscientiousness>65?'Careful and determined':p.traits.extraversion>65?'Outgoing and sociable':'Quietly building a life'}, ${p.first} ${p.partnerId?'shares life with '+esc(q?.first||'a partner'):children.length?'has a family story with '+children.length+' child'+(children.length===1?'':'ren'):'is making a path of their own'}.`;
 $('#profile-content').innerHTML=`
 <div class="profile-head"><div class="profile-kicker"><span>PERSON / ${esc(p.id.toUpperCase())}${p.id===state.controlledId&&state.mode==='individual'?' · PLAYING':''}</span><span>${esc(yearSpan(p))}</span></div>
 <div class="profile-card"><div class="portrait" style="${gradient(p)}"><span>${esc(initials(p))}</span></div><div><div class="profile-name">${esc(full(p))}</div><div class="profile-meta">${ages(p)} · Generation ${p.gen+1}<br>${esc(p.city)}</div><span class="pill ${alive(p)?'':'dead'}">${alive(p)?'● LIVING':'◆ REMEMBERED'}</span></div></div>
 <p class="profile-summary">${summary}</p></div>
 <div class="profile-stats"><div class="profile-stat"><small>Occupation</small><strong>${esc(job)}</strong></div><div class="profile-stat"><small>Personal wealth</small><strong>${money(p.wealth)}</strong></div><div class="profile-stat"><small>Education</small><strong>${esc(education)}</strong></div><div class="profile-stat"><small>Children</small><strong>${children.length} ${children.length===1?'child':'children'}</strong></div></div>
 <div class="panel-block"><div class="block-title">Life path & legacy</div><div class="identity">${esc(LEGACY_CONSEQUENCES.describe(p))}</div></div>
  <div class="panel-block"><div class="block-title">Family connections <span class="block-sub">${children.length+parents.length+adopters.length+(q?1:0)} direct ties</span></div><div class="relation-row">${distinctRel(parents,'parent')}${distinctRel(adopters,'adoptive parent')}${q?distinctRel([q],'partner'):''}${distinctRel(children,'child')}${!parents.length&&!adopters.length&&!q&&!children.length?'<span class="empty-note">No direct relatives recorded yet.</span>':''}</div></div>
 <div class="panel-block"><div class="block-title">Life decisions <span class="block-sub">${state.mode==='individual'?'individual':'family'} control</span></div>${state.mode==='individual'&&p.id!==state.controlledId&&alive(p)?'<button class="action special" id="take-control" style="width:100%;margin-bottom:9px">▶ Live as '+esc(p.first)+'</button>':''}<div class="actions-grid">
 ${[['partner','♥ Find partner'],['child','✦ Grow family'],['career','↑ Career'],['educate','◈ Education'],['move','⌁ Relocate'],['support','♡ Support kin']].map(([a,l])=>`<button class="action ${a==='child'?'special':''}" data-action="${a}" ${canAct?'':'disabled'}>${l}</button>`).join('')}
 </div>${!alive(p)?'<div class="identity">This life has ended. Their history remains part of the family.</div>':state.mode==='individual'?'<div class="identity">Individual Control · Direct the currently selected life.</div>':'<div class="identity">Family Control · Direct anyone in the tree.</div>'}</div>
 <div class="panel-block"><div class="block-title">Personality & appearance</div>${[['Curiosity',p.traits.openness],['Discipline',p.traits.conscientiousness],['Sociability',p.traits.extraversion],['Cooperation',p.traits.agreeableness],['Emotional sensitivity',p.traits.emotionality]].map(([label,value])=>`<div class="trait-row"><span>${label}</span><span class="trait-track"><span class="trait-fill" style="width:${Math.max(0,Math.min(100,value))}%"></span></span><span>${value}</span></div>`).join('')}<div class="identity">${esc(p.eyeTint)} eyes · ${esc(p.hairTint)} hair · illustrative inheritance model</div></div>
 <div class="panel-block"><div class="block-title">Life record <span class="block-sub">${events.length} recent events</span></div>${events.length?events.map(e=>`<div class="event-mini"><span class="event-mini-year">${e.year}</span><span>${esc(e.message)}</span></div>`).join(''):'<div class="empty-note">New milestones will appear here.</div>'}</div>
 <div class="profile-footer-note">Character traits, finances, and demographics are simplified for this prototype. The simulation is not a scientific prediction of real lives.</div>`;
 $$('#profile-content [data-person]').forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.person)));
 $$('#profile-content [data-action]').forEach(b=>b.addEventListener('click',()=>decide(b.dataset.action)));
 const take=$('#take-control');if(take)take.onclick=()=>{state.controlledId=p.id;saveSoon();renderProfile();toast(`You are now living as ${p.first}.`)};
}

/* Immersive genealogy: select with a tap, hold to open an accessible full-profile sheet. */
/* Fixed-height character record: each tab is a complete screen, never a scrolling document. */
function showPersonStats(id,tab='overview',page=0){
 if(state.pendingChoice||state.pendingSuccession)return;
 const p=get(id);if(!p)return;
 const reviewed=LEGACY_ATTENTION.readPerson(state,id);
 selectPerson(id);
 if(reviewed){renderAttention();if(currentTab==='tree')drawGraph();if(currentTab==='people')renderPeople();saveSoon();}
 const allowed=['overview','health','education','career','stats','family','stories','actions','history'];
 if(!allowed.includes(tab))tab='overview';
 const parents=(p.parentIds||[]).map(get).filter(Boolean);
 const adopters=(p.adoptiveParentIds||[]).map(get).filter(Boolean);
 const children=kids(p),q=partner(p),life=p.lifePath||{},needs=LEGACY_HUMAN.snapshot(p,age(p)),finance=LEGACY_ECONOMY.statement(p),career=LEGACY_CAREERS.details(p,age(p));
 const history=state.events.filter(e=>e.personIds?.includes(p.id)).slice().reverse();
 const rel=related(p).filter(Boolean).map(person=>{
  const parent=parents.some(x=>x.id===person.id)||adopters.some(x=>x.id===person.id);
  const child=children.some(x=>x.id===person.id);
  const pParents=new Set([...(p.parentIds||[]),...(p.adoptiveParentIds||[])]);const sharedParents=[...(person.parentIds||[]),...(person.adoptiveParentIds||[])].filter(parentId=>pParents.has(parentId));const type=parent?'Parent':child?'Child':sharedParents.length?'Sibling':q?.id===person.id?'Partner':p.formerPartners?.includes(person.id)?'Former partner':'Family';
  return {person,type,strength:Math.round(p.bonds?.[person.id]??50),social:LEGACY_RELATIONSHIPS.relation(p,person)};
 });
 const occupation=age(p)<16?'Growing up':p.retired?'Retired':career.current?.name||'Seeking work';
 const school=LEGACY_EDUCATION.details(p,age(p));const education=school.current?'Studying: '+school.current.name:school.credentials.at(-1)?.name||'No qualifications yet';
 const metric=(label,value)=>'<div class="person-page-metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';
 const title=t=>'<h3 class="person-page-title">'+esc(t)+'</h3>';
 const trait=(label,value)=>'<div class="person-page-trait"><span>'+esc(label)+'</span><div class="person-page-track"><div style="width:'+Math.max(0,Math.min(100,Number(value)||0))+'%"></div></div><b>'+Math.round(value||0)+'</b></div>';
 let body='';
 if(tab==='overview'){
  const overview=[
   ['Occupation',occupation],['Personal wealth',money(p.wealth)],
   ['Education',education],['Children',String(children.length)]
  ];
  body='<div class="person-overview-identity"><div class="person-page-avatar" style="'+gradient(p)+'">'+esc(initials(p))+'</div><div><strong>'+esc(full(p))+'</strong><small>'+esc(ages(p))+' · Generation '+(p.gen+1)+' · '+esc(p.city)+'</small><span class="person-page-status '+(alive(p)?'':'is-deceased')+'">'+(alive(p)?'● LIVING':'◆ REMEMBERED')+'</span></div></div>'+
  '<div class="person-page-metrics">'+overview.map(([a,b])=>metric(a,b)).join('')+'</div>'+
  title('Life path & legacy')+'<p class="person-page-description">'+esc(LEGACY_CONSEQUENCES.describe(p))+'</p>'+
  title('Family overview')+'<div class="person-page-summary">'+parents.length+' biological parent'+(parents.length===1?'':'s')+' · '+adopters.length+' adoptive parent'+(adopters.length===1?'':'s')+' · '+children.length+' child'+(children.length===1?'':'ren')+' · '+(q?'Partnered':'No current partner')+'</div>';
 }else if(tab==='health'){
  const info=LEGACY_MEDICINE.current(p),cases=info.active,log=info.history;
  const size=3,which=Math.max(0,Math.min(page,Math.ceil((cases.length+1)/size)));
  if(which===0){
   const cards=[
    ['Physical wellbeing',needs.physical+' / 100'],['Mental wellbeing',needs.mental+' / 100'],
    ['Active conditions',String(cases.length)],['Medical insurance',info.insurance]
   ];
   const services=Object.entries(LEGACY_MEDICINE.services).map(([key,v])=>'<button class="person-health-care" data-medical-care="'+key+'" '+(!alive(p)||state.mode==='individual'&&state.controlledId!==p.id?'disabled':'')+'><strong>'+esc(v.label)+'</strong><small>'+money(v.cost)+' before coverage</small></button>').join('');
   body=title('Health record')+'<div class="person-page-metrics">'+cards.map(([a,b])=>metric(a,b)).join('')+'</div>'+
    '<p class="person-page-description">'+(p.causeOfDeath?'Recorded cause of death: '+esc(p.causeOfDeath):'Health conditions develop over time. Care may help, but results are uncertain.')+'</p>'+
    title('Medical services')+'<div class="person-medical-services">'+services+'</div>';
  }else{
   const offset=(which-1)*size;
   body=title('Ailments & medical history')+
    '<div class="person-page-history">'+(cases.length?cases.slice(offset,offset+size).map(c=>'<div class="person-page-event"><b>'+c.since+'</b><span>'+esc(c.diagnosed?c.name:'Undiagnosed symptoms')+' · '+esc(c.diagnosed?'Stage '+c.stage:'Not yet diagnosed')+'</span></div>').join(''):'<p class="person-page-empty">No active ailments recorded.</p>')+'</div>'+
    title('Recent care')+'<p class="person-page-description">'+esc(log.at(-1)?.message||'No previous medical visits.')+'</p>';
  }
  body+=pageControls('health',which,Math.max(1,Math.ceil(cases.length/3)+1));
 }else if(tab==='education'){
  const info=LEGACY_EDUCATION.details(p,age(p)),available=info.programs,perPage=4;
  const pages=Math.max(1,Math.ceil(available.length/perPage));page=Math.max(0,Math.min(page,pages-1));
  const credentialNames=info.credentials.map(c=>c.name);
  const header=info.current?'Current: '+info.current.name+' · '+info.current.progress+' / '+info.current.years+' years':'Not currently enrolled';
  body=title('Education & qualifications')+'<div class="person-page-description">'+esc(credentialNames.length?credentialNames.join(' · '):'No formal qualifications yet')+'</div>'+
  title('Current studies')+'<div class="person-page-summary">'+esc(header)+'</div>'+
  title('Choose an education pathway')+'<div class="person-path-cards">'+available.slice(page*perPage,(page+1)*perPage).map(prog=>
    '<button class="person-path-card" data-education-id="'+prog.id+'" '+(!alive(p)||state.mode==='individual'&&state.controlledId!==p.id||!prog.eligibility.ok?'disabled':'')+'><span><strong>'+esc(prog.name)+'</strong><small>'+esc(prog.category)+' · '+prog.years+'yr · '+money(prog.cost)+'</small></span><small>'+esc(prog.eligibility.ok?'Enroll →':prog.eligibility.reason)+'</small></button>').join('')+'</div>'+pageControls('education',page,pages);
 }else if(tab==='career'){
  const shift=LEGACY_CALENDAR.schedule(p,state,LEGACY_CAREERS.jobs);
  const list=career.opportunities,perPage=4,pages=Math.max(1,Math.ceil(list.length/perPage));page=Math.max(0,Math.min(page,pages-1));
  body=title('Current occupation')+'<div class="person-page-metrics">'+[
   ['Position',career.current?.name||'Unemployed'],['Estimated yearly income',money(career.salary)],
   ['Experience',career.experience+' years'],['Career grade',career.grade+' / 5']
  ].map(([a,b])=>metric(a,b)).join('')+'</div>'+
   '<p class="person-page-description">'+esc(p.city)+' · '+calendarTime(shift.minutes)+' '+esc(shift.abbreviation)+' · '+esc(shift.reason)+(shift.scheduled?' · '+calendarTime(shift.start)+'–'+calendarTime(shift.end):'')+(shift.holiday?' · '+esc(shift.holiday):'')+'<br>Tenure: '+career.tenure+' years · Performance: '+career.performance+'/100. Shifts are modeled by occupation and location.</p>'+
   title('Explore real occupations')+'<div class="person-path-cards">'+list.slice(page*perPage,(page+1)*perPage).map(j=>
    '<button class="person-path-card" data-career-id="'+j.id+'" '+(!alive(p)||state.mode==='individual'&&state.controlledId!==p.id||!j.eligibility.ok?'disabled':'')+'><span><strong>'+esc(j.name)+'</strong><small>'+esc(j.sector)+' · '+money(j.salary)+'/yr</small></span><small>'+esc(j.eligibility.ok?'Apply →':j.eligibility.reason)+'</small></button>').join('')+'</div>'+pageControls('career',page,pages);
 }else if(tab==='stats'){
  const facts=[
   ['Birth year',p.birthYear],['Death year',p.deathYear||'—'],['Generation',p.gen+1],['Annual income',age(p)>=18&&!p.retired?money(incomeFor(p)):'—'],
   ['Career level',(p.jobLevel??0)+' / 6'],['Education level',(p.education??0)+' / 4'],['Education debt',money(life.educationDebt||0)],['Career skills',life.skills||0],
   ['Career momentum',life.momentum||0],['Discipline',life.discipline||0],['Community ties',life.community||0],['Business experience',life.enterprise||0],
   ['Family involvement',life.familyTime||0],['Biological parents',parents.length],['Adoptive parents',adopters.length],['Children',children.length]
  ];
  const traits=[['Curiosity',p.traits?.openness],['Discipline',p.traits?.conscientiousness],['Sociability',p.traits?.extraversion],['Cooperation',p.traits?.agreeableness],['Emotional sensitivity',p.traits?.emotionality]];
  body=(page===0?title('Wellbeing & needs')+'<div class="person-page-traits">'+[['Physical health',needs.physical],['Mental wellbeing',needs.mental],['Energy',needs.energy],['Stress',needs.stress],['Resilience',needs.resilience],['Agency',needs.agency]].map(([a,b])=>trait(a,b)).join('')+'</div>'+title('Personality · five traits')+'<div class="person-page-traits">'+traits.map(([a,b])=>trait(a,b)).join('')+'</div>':
   (page===1?title('Career & education')+'<div class="person-page-facts">'+facts.map(([a,b])=>metric(a,b)).join('')+'</div>':
   title('Household economy')+'<div class="person-page-facts">'+[
   ['Cash balance',money(finance.cash)],['Investments',money(finance.investments)],['Property value',money(finance.propertyValue)],['Home equity',money(finance.equity)],
   ['Mortgage',money(finance.mortgage)],['Consumer debt',money(finance.consumerDebt)],['Education debt',money(life.educationDebt||0)],['Net worth',money(finance.netWorth)],
   ['Last gross income',money(finance.lastStatement?.gross||0)],['Income taxes',money(finance.lastStatement?.tax||0)],['Annual living costs',money(finance.lastStatement?.living||0)],['Annual net change',money(finance.lastStatement?.netChange||0)],
   ['Household budget',finance.budgetMode],['Mortgage payment',money(finance.lastStatement?.mortgagePayment||0)],['Interest on debts',money(finance.lastStatement?.debtInterest||0)],['Home appreciation',money(finance.lastStatement?.houseGrowth||0)]
   ].map(([a,b])=>metric(a,b)).join('')+'</div>'))+pageControls('stats',Math.max(0,Math.min(2,page)),3);
 }else if(tab==='family'){
  const size=6,pages=Math.max(1,Math.ceil(rel.length/size));page=Math.max(0,Math.min(page,pages-1));
  body=title('Family connections · '+rel.length)+
   '<div class="person-page-connections">'+(rel.length?rel.slice(page*size,(page+1)*size).map(x=>'<button class="person-page-relation" data-person="'+esc(x.person.id)+'"><span><strong>'+esc(full(x.person))+'</strong><small>'+esc(x.type)+' · Trust '+x.social.trust+' · Conflict '+x.social.conflict+'</small></span><b>'+x.strength+' / 100</b></button>').join(''):'<p class="person-page-empty">No recorded close family connections yet.</p>')+'</div>'+pageControls('family',page,pages);
 }else if(tab==='stories'){
  const stories=LEGACY_LIVING_IMPACT.allFor(state,id),active=stories.filter(x=>x.status==='active').length;
  const count=3,pages=Math.max(1,Math.ceil(stories.length/count));page=Math.max(0,Math.min(page,pages-1));
  body=title('Family stories · '+active+' active / '+stories.length+' recorded')+
   '<p class="person-page-description">These storylines connect earlier choices to later family responsibilities and outcomes.</p>'+
   '<div class="person-page-connections">'+(stories.length?stories.slice(page*count,(page+1)*count).map(x=>
    '<button class="person-page-relation" data-open-story="'+esc(x.id)+'"><span><strong>'+esc(x.title||x.kind)+'</strong><small>'+x.startedYear+' · '+esc(x.cause||'Family event')+'</small></span><b>'+esc(x.status)+'</b></button>').join(''):'<p class="person-page-empty">This person has no recorded living-decision storylines yet.</p>')+'</div>'+pageControls('stories',page,pages);
 }else if(tab==='actions'){
  const canAct=alive(p)&&(state.mode==='family'||state.controlledId===p.id);
  const actions=[['partner','♥','Find partner'],['child','✦','Grow family'],['career','↑','Career'],['educate','◈','Education'],['move','⌁','Relocate'],['support','♡','Support kin'],['home','⌂','Buy a home'],['budget','◇','Adjust budget']];
  body=title('Life decisions')+'<div class="person-page-actions">'+actions.map(([id,icon,label])=>'<button class="person-page-action" data-action="'+id+'" '+(canAct?'':'disabled')+'><span>'+icon+'</span>'+esc(label)+'</button>').join('')+'</div>'+
   (!alive(p)?'<p class="person-page-description">Their life has ended. The family record remains available.</p>':
    state.mode==='individual'&&state.controlledId!==p.id?'<button class="person-page-take" id="sheet-take-control">▶ Live as '+esc(p.first)+'</button>':
    '<p class="person-page-description">Your choices change relationships, finances and future opportunities. Major events also appear as time advances.</p>');
 }else if(tab==='history'){
  const size=4,pages=Math.max(1,Math.ceil(history.length/size));page=Math.max(0,Math.min(page,pages-1));
  body=title('Family chronicle · '+history.length+' events')+'<div class="person-page-history">'+
   (history.length?history.slice(page*size,(page+1)*size).map(e=>'<div class="person-page-event"><b>'+esc(e.year)+'</b><span>'+esc(e.message)+'</span></div>').join(''):'<p class="person-page-empty">No recorded events yet.</p>')+'</div>'+pageControls('history',page,pages);
 }
 function pageControls(which,current,total){
  return total>1?'<div class="person-page-pagination"><button data-page="-1" '+(current===0?'disabled':'')+' aria-label="Previous '+which+' page">← Prev</button><span>Page '+(current+1)+' of '+total+'</span><button data-page="1" '+(current===total-1?'disabled':'')+' aria-label="Next '+which+' page">Next →</button></div>':'';
 }
 const tabs=[['overview','Overview'],['health','Health'],['education','School'],['career','Jobs'],['stats','Stats'],['family','Family'],['stories','Stories'],['actions','Actions'],['history','History']];
 const tabNav=tabs.map(([key,name])=>'<button role="tab" data-person-tab="'+key+'" aria-selected="'+(tab===key)+'" class="'+(tab===key?'active':'')+'">'+name+'</button>').join('');
 showModal('<div class="person-sheet person-sheet-compact"><div class="person-sheet-top"><div><div class="eyebrow">FAMILY RECORD · '+esc(p.id.toUpperCase())+' · '+esc(yearSpan(p))+'</div><div class="person-sheet-topname">'+esc(full(p))+'</div></div><button id="person-sheet-close" class="person-sheet-close" type="button" aria-label="Close person details">✕</button></div><nav class="person-sheet-tabs" role="tablist" aria-label="Character details">'+tabNav+'</nav><div class="person-sheet-screen" role="tabpanel" aria-label="'+esc(tab)+'">'+body+'</div></div>');
 $('#modal-backdrop').classList.add('person-profile-backdrop');
 $('#modal-content').classList.add('person-profile-dialog');
 $('#person-sheet-close').onclick=closeModal;
 $$('[data-person-tab]').forEach(b=>b.onclick=()=>showPersonStats(id,b.dataset.personTab));
 $$('[data-person]').forEach(b=>b.onclick=()=>showPersonStats(b.dataset.person));
 $$('[data-page]').forEach(b=>b.onclick=()=>showPersonStats(id,tab,page+Number(b.dataset.page)));
 $$('[data-open-story]').forEach(b=>b.onclick=()=>showStoryDetails(id,b.dataset.openStory));
 $$('[data-action]').forEach(b=>b.onclick=()=>{if(b.dataset.action==='career')return showPersonStats(id,'career');if(b.dataset.action==='educate')return showPersonStats(id,'education');decide(b.dataset.action);if(!state.pendingChoice&&!state.pendingSuccession)showPersonStats(id,'actions');});
 $$('[data-education-id]').forEach(b=>b.onclick=()=>{
  if(state.mode==='individual'&&id!==state.controlledId){toast('Take control to enroll in education.');return;}
  const r=LEGACY_EDUCATION.enroll(p,b.dataset.educationId,age(p),state.year);
  if(r.ok){addEvent(state.year,'education',full(p)+': '+r.message,[p.id]);saveSoon();render();showPersonStats(id,'education',page);}
  toast(r.message);
 });
 $$('[data-career-id]').forEach(b=>b.onclick=()=>{
  if(state.mode==='individual'&&id!==state.controlledId){toast('Take control to apply for a career.');return;}
  const result=LEGACY_CAREERS.apply(p,b.dataset.careerId,age(p),state.year,rnd);
  if(result.ok){addEvent(state.year,'career',full(p)+': '+result.message,[p.id]);saveSoon();render();}
  toast(result.message);showPersonStats(id,'career',page);
 });
 $$('[data-medical-care]').forEach(b=>b.onclick=()=>{
  if(state.mode==='individual'&&id!==state.controlledId){toast('Take control before choosing medical care.');return;}
  const result=LEGACY_MEDICINE.care(p,b.dataset.medicalCare,state.year,rnd);
  if(result.ok){addEvent(state.year,'health',full(p)+': '+result.message,[p.id]);saveSoon();render();showPersonStats(id,'health');}
  toast(result.message);
 });
 const take=$('#sheet-take-control');
 if(take)take.onclick=()=>{state.controlledId=p.id;saveSoon();showPersonStats(p.id,'actions');toast('You are now living as '+p.first+'.');};
}


function showStoryDetails(personId,storyId){
 const person=get(personId),story=LEGACY_LIVING_IMPACT.allFor(state,personId).find(s=>s.id===storyId);
 if(!person||!story)return;
 const milestones=story.history.slice(-4).reverse().map(h=>'<div class="person-page-event"><b>'+esc(h.year)+'</b><span>'+esc(h.text)+'</span></div>').join('');
 const canRevisit=story.status==='active'&&story.ownerId===personId&&(state.mode==='family'||state.controlledId===personId);
 showModal('<div class="living-outcome-sheet"><div class="eyebrow">FAMILY STORY · '+esc(story.status.toUpperCase())+'</div><h2>'+esc(story.title||story.kind)+'</h2><p>'+esc(story.cause||'A turning point in family life')+'</p><div class="person-page-history">'+milestones+'</div><p class="living-disclaimer">'+esc(story.outcome||'This story is still unfolding.')+'</p><div class="modal-actions">'+(canRevisit?'<button class="primary" id="revisit-story">Revisit the plan</button>':'')+'<button class="secondary" id="story-back">Back to Stories</button></div></div>');
 $('#modal-content').classList.add('living-decision-dialog');$('#modal-backdrop').classList.add('living-decision-backdrop');
 $('#story-back').onclick=()=>showPersonStats(personId,'stories');
 if(canRevisit)$('#revisit-story').onclick=()=>{
  state.pendingChoice={personId:story.ownerId,kind:'followup',year:state.year,event:LEGACY_STORYLINES.followup(state,story)};
  saveSoon();showLifeChoice();
 };
}

function visiblePeople(){const all=persons();if(scope==='all'){
 if(all.length<=250)return all;
 const keep=new Set([state.selectedId,state.founderId,state.rootId]);
 let p=get(state.selectedId);while(p){keep.add(p.id);p=get(p.parentIds?.[0]);}
 const recents=all.slice().sort((a,b)=>b.birthYear-a.birthYear).slice(0,Math.max(0,250-keep.size));return [...new Set([...keep,...recents.map(p=>p.id)])].map(get).filter(Boolean);
 }
 const p=get(state.selectedId);if(!p)return all.slice(0,30);
 const out=new Set([p.id]);function add(arr){for(const x of arr){if(x)out.add(x.id)}}
 add(p.parentIds.map(get));add(p.adoptiveParentIds.map(get));add([partner(p)]);add(kids(p));
 for(const parentId of [...p.parentIds,...p.adoptiveParentIds]){const pa=get(parentId);if(pa){add(pa.parentIds.map(get));add(pa.adoptiveParentIds.map(get));add(kids(pa));add([partner(pa)])}}
 for(const child of kids(p)){add(kids(child));add([partner(child)])}
 for(const pp of [...out].map(get)){if(pp&&pp.partnerId)add([partner(pp)]);}
 return [...out].map(get).filter(Boolean).slice(0,130);
}
function layoutGraph(){const visible=visiblePeople();const groups=new Map();for(const p of visible){if(!groups.has(p.gen))groups.set(p.gen,[]);groups.get(p.gen).push(p)}
 const gens=[...groups.keys()].sort((a,b)=>a-b);const placements=new Map();const xgap=148,ygap=129;
 // A compact layered genealogy layout. Couples are placed near their shared descendants.
 for(const g of gens){const group=groups.get(g);group.sort((a,b)=>{
  const pa=a.parentIds.map(x=>placements.get(x)).filter(Boolean),pb=b.parentIds.map(x=>placements.get(x)).filter(Boolean);
  const av=pa.length?pa.reduce((v,c)=>v+c.x,0)/pa.length:null,bv=pb.length?pb.reduce((v,c)=>v+c.x,0)/pb.length:null;
  if(av!==null&&bv!==null&&av!==bv)return av-bv;
  if(av!==null&&bv===null)return -1;if(av===null&&bv!==null)return 1;
  return a.birthYear-b.birthYear||Number(a.id.slice(1))-Number(b.id.slice(1));
 });
 const w=(group.length-1)*xgap;
 group.forEach((p,i)=>placements.set(p.id,{p,x:i*xgap-w/2,y:(g-gens[0])*ygap}));
 }
 // Realign each generation relative to the preceding one while preserving spacing.
 for(let repeat=0;repeat<2;repeat++)for(const g of gens.slice(1)){
  const items=groups.get(g);const withParent=items.filter(p=>p.parentIds.some(v=>placements.has(v)));
  if(withParent.length){const mid=(withParent.reduce((s,p)=>{const ps=p.parentIds.map(v=>placements.get(v)).filter(Boolean);return s+ps.reduce((v,x)=>v+x.x,0)/ps.length},0)/withParent.length);
   const current=items.reduce((s,p)=>s+placements.get(p.id).x,0)/items.length;
   const delta=Math.max(-220,Math.min(220,mid-current));for(const p of items)placements.get(p.id).x+=delta;
  }
 }
 scene=[...placements.values()].map(v=>({...v,w:126,h:87}));
 const ids=new Set(scene.map(n=>n.p.id));sceneEdges=[];
 for(const n of scene){const p=n.p;
  for(const parentId of [...p.parentIds,...p.adoptiveParentIds]){const pa=placements.get(parentId);if(pa)sceneEdges.push({a:pa,b:n,kind:p.adoptiveParentIds.includes(parentId)?'adopt':'parent'});}
  if(p.partnerId&&ids.has(p.partnerId)&&p.id<p.partnerId){sceneEdges.push({a:n,b:placements.get(p.partnerId),kind:'partner'});}
 }
 $('#tree-subhead').textContent=scope==='all'&&persons().length>250?`Showing 250 of ${fmtN(persons().length)} lives. Use Focus for close relatives.`:`${fmtN(scene.length)} visible people · ${scope==='focus'?'Selected family circle':'Recorded family network'}`;
 if(needsFit){fitScene();if(scope==='focus'&&scene.length>24&&camera.scale<.5)centerPerson();needsFit=false}
 drawGraph();
}
function setCanvasSize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);return {w:rect.width,h:rect.height};}
function appViewportHeight(){
 const inner=Number(window.innerHeight)||0,v=window.visualViewport;
 const zoomed=v&&Math.abs((v.scale||1)-1)>.01;
 if(zoomed)return inner;
 const visible=v&&Number(v.height)>0?Number(v.height):inner;
 // screen.height includes pixels outside the web view on iPhone. Never size
 // interactive content to those pixels, even when installed on the Home Screen.
 return inner>0&&visible>0?Math.min(inner,visible):visible||inner;
}
function syncAppViewport(){
 const height=appViewportHeight();
 if(height>0)document.documentElement?.style.setProperty('--legacy-viewport-height',height+'px');
}
function treeViewport(){
 const r=canvas.getBoundingClientRect(),zen=$('#app').classList.contains('zen-tree');
 let top=zen?28:Math.min(205,r.height*.28),bottom=zen?76:Math.min(145,r.height*.22),left=24,right=24;
 if(!zen&&r.width>680&&r.height<540){top=135;bottom=95;}
 if(!zen&&typeof window.getComputedStyle==='function'){
  const heading=$('.tree-view .panel-heading').getBoundingClientRect();
  const dock=$('#reveal-menu').getBoundingClientRect();
  if(Number.isFinite(heading.bottom))top=heading.bottom-r.top+18;
  if(dock.top>r.top&&dock.left<r.right&&dock.right>r.left)bottom=r.bottom-dock.top+18;
  if(r.width<=680){const selected=$('#selected-person').getBoundingClientRect();if(selected.top>r.top)bottom=Math.max(bottom,r.bottom-selected.top+18);}
 }
 return {x:left,y:top,w:Math.max(80,r.width-left-right),h:Math.max(80,r.height-top-bottom)};
}
function fitScene(){const r=canvas.getBoundingClientRect();if(!scene.length||!r.width||!r.height)return;let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const n of scene){minX=Math.min(minX,n.x-n.w/2);maxX=Math.max(maxX,n.x+n.w/2);minY=Math.min(minY,n.y-n.h/2);maxY=Math.max(maxY,n.y+n.h/2)}
 const v=treeViewport(),sx=v.w/(maxX-minX+30),sy=v.h/(maxY-minY+30);
 camera.scale=Math.max(.12,Math.min(1.35,sx,sy));camera.x=v.x+v.w/2-((minX+maxX)/2)*camera.scale;camera.y=v.y+v.h/2-((minY+maxY)/2)*camera.scale;
}
function centerPerson(){const n=scene.find(n=>n.p.id===state.selectedId);if(!n)return;const v=treeViewport();camera.scale=Math.max(.95,camera.scale);camera.x=v.x+v.w/2-n.x*camera.scale;camera.y=v.y+v.h/2-n.y*camera.scale;drawGraph();}
function zoomTree(factor){const v=treeViewport(),x=v.x+v.w/2,y=v.y+v.h/2,wx=(x-camera.x)/camera.scale,wy=(y-camera.y)/camera.scale;camera.scale=Math.max(.12,Math.min(3,camera.scale*factor));camera.x=x-wx*camera.scale;camera.y=y-wy*camera.scale;drawGraph();}
function toggleTreeFullscreen(force){const app=$('#app'),active=typeof force==='boolean'?force:!app.classList.contains('zen-tree');app.classList.toggle('zen-tree',active);$('#tree-fullscreen').setAttribute('aria-pressed',String(active));$('#tree-fullscreen').setAttribute('aria-label',active?'Restore game controls':'Hide controls for a full-screen tree');$('#tree-fullscreen').textContent=active?'↙':'⛶';requestAnimationFrame(()=>{fitScene();drawGraph()});}

function roundPath(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath()}
function ellipsis(s,max=19){return s.length>max?s.slice(0,max-1)+'…':s}
function drawGraph(){if(!state)return;const {w,h}=setCanvasSize();ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.scale,camera.scale);
 for(const e of sceneEdges){const {a,b,kind}=e;ctx.beginPath();ctx.lineWidth=kind==='partner'?1.3:1.8;ctx.strokeStyle=kind==='partner'?'#a4845288':kind==='adopt'?'#80adbc95':'#648b7b99';ctx.setLineDash(kind==='parent'?[]:kind==='adopt'?[4,4]:[3,6]);
  if(kind==='partner'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}else{ctx.moveTo(a.x,a.y+44);const cy=(a.y+b.y)/2;ctx.bezierCurveTo(a.x,cy,b.x,cy,b.x,b.y-44)}ctx.stroke();ctx.setLineDash([]);
 }
 const attentionCounts=LEGACY_ATTENTION.counts(state);
 const activeCount=new Map();for(const story of state.storylines||[])if(story.status==='active')for(const id of story.participants||[])activeCount.set(id,(activeCount.get(id)||0)+1);
 for(const n of scene){const p=n.p,selected=p.id===state.selectedId,dead=!alive(p),x=n.x-n.w/2,y=n.y-n.h/2;
  ctx.shadowBlur=selected?17:0;ctx.shadowColor=selected?'#bd996d9f':'transparent';roundPath(ctx,x,y,n.w,n.h,12);ctx.fillStyle=dead?'#142126':'#1c3032';ctx.fill();ctx.lineWidth=selected?2.5:1;ctx.strokeStyle=selected?'#e0bd7f':dead?'#3a4848':'#4e6e66';ctx.stroke();ctx.shadowBlur=0;
  const hu=hue(p.id);ctx.beginPath();ctx.fillStyle=dead?'#566463':`hsl(${hu},34%,39%)`;ctx.arc(n.x,y+25,16,0,Math.PI*2);ctx.fill();ctx.fillStyle=dead?'#c0cdbe':'#f8ebd9';ctx.font='600 13px Georgia,serif';ctx.textAlign='center';ctx.fillText(p.first.charAt(0)+p.last.charAt(0),n.x,y+29);
  ctx.fillStyle=dead?'#a3aaa5':'#f1f1e6';ctx.font='600 11px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(ellipsis(p.first+' '+p.last,19),n.x,y+54,116);
  ctx.fillStyle=dead?'#788986':'#9bb3a8';ctx.font='10px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(p.birthYear+' – '+(p.deathYear||'●'),n.x,y+70,115);
  const attention=attentionCounts.get(p.id);
  if(attention){
   ctx.beginPath();ctx.fillStyle=attention.priority>=4?'#e9a092':'#e8c582';
   ctx.arc(x+10,y+12,9,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#162525';ctx.font='800 11px -apple-system,BlinkMacSystemFont,sans-serif';
   ctx.fillText('!',x+10,y+16);
  }
  if(activeCount.has(p.id)){
   ctx.beginPath();ctx.fillStyle='#dcb36b';ctx.arc(x+n.w-7,y+12,9,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#182927';ctx.font='700 10px -apple-system,BlinkMacSystemFont,sans-serif';
   ctx.fillText(String(Math.min(9,activeCount.get(p.id))),x+n.w-7,y+15);
  }
 }
 ctx.restore();}
function selectPerson(id){if(!get(id))return;state.selectedId=id;$('#profile-panel').scrollTop=0;renderProfile();if(scope==='focus'){needsFit=true;layoutGraph()}else drawGraph();if(currentTab==='people')renderPeople();saveSoon();}
function renderPeople(){const search=$('#people-search').value.toLocaleLowerCase().trim();const list=persons().slice().sort((a,b)=>Number(alive(b))-Number(alive(a))||b.birthYear-a.birthYear);
 const filtered=list.filter(p=>(full(p)+' '+p.city+' '+(jobs[Math.min(p.jobLevel,5)]||'')).toLowerCase().includes(search));
 const attention=LEGACY_ATTENTION.counts(state);
 $('#people-list').innerHTML=filtered.slice(0,400).map(p=>`<button class="person-item ${p.id===state.selectedId?'selected':''}" data-person="${p.id}"><span class="person-avatar" style="${gradient(p)}">${esc(initials(p))}</span><span class="person-item-main"><span class="person-item-name">${esc(full(p))}</span><span class="person-item-info">${esc(p.city)} · ${ages(p)} · Gen ${p.gen+1}</span></span><span class="person-item-side">${attention.has(p.id)?`<span class="person-attention-tag">● ${attention.get(p.id).count} update${attention.get(p.id).count===1?'':'s'}</span>`:alive(p)?'LIVING':'REMEMBERED'}</span></button>`).join('')+(filtered.length>400?`<div class="empty-note">Showing 400 of ${filtered.length} results. Refine your search.</div>`:'')||'<div class="empty-note">No matching family members.</div>';
 $$('#people-list [data-person]').forEach(b=>b.addEventListener('click',()=>showPersonStats(b.dataset.person)));
}
function renderHistory(){const events=state.events.slice().sort((a,b)=>b.year-a.year||b.id-a.id).slice(0,450);let oldYear=null;
 $('#history-list').innerHTML=events.map(e=>{let head='';if(e.year!==oldYear){oldYear=e.year;head=`<div class="history-year">${e.year}</div>`}const name=e.personIds.map(get).filter(Boolean)[0];return `${head}<div class="history-item"><span class="history-marker">${({birth:'✦',death:'◆',relationship:'♥',adoption:'✦',move:'⌁',career:'↑',education:'◈',inheritance:'◇',family:'♡',milestone:'✧',choice:'⚖',succession:'♜'}[e.type]||'●')}</span><button data-event-person="${name?.id||''}"><div class="history-name">${esc(e.type.toUpperCase())}</div>${esc(e.message)}</button></div>`}).join('')+(state.events.length>450?'<div class="empty-note">Showing the latest 450 events. All events remain in the saved game and exported backup.</div>':'');
 $$('#history-list [data-event-person]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.eventPerson)showPersonStats(b.dataset.eventPerson)}));
}
function setTab(tab){currentTab=tab;closeTimeControls();$('#app').classList.remove('zen-tree');$('#tree-fullscreen').setAttribute('aria-pressed','false');$('#tree-fullscreen').setAttribute('aria-label','Hide controls for a full-screen tree');$('#tree-fullscreen').textContent='⛶';$('#app').classList.toggle('immersive-tree',tab==='tree');$$('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-pressed',String(b.dataset.tab===tab))});
 $('#tree-view').classList.toggle('hidden',tab!=='tree');$('#people-view').classList.toggle('hidden',tab!=='people');$('#history-view').classList.toggle('hidden',tab!=='history');
 if(tab==='tree'){needsFit=true;requestAnimationFrame(()=>layoutGraph())}if(tab==='people')renderPeople();if(tab==='history')renderHistory();
}
function render(){if(!state)return;renderStats();renderProfile();renderAttention();if(currentTab==='tree')requestAnimationFrame(layoutGraph);if(currentTab==='people')renderPeople();if(currentTab==='history')renderHistory();}
function advance(years,continuation=false){
 timelinePause();
 if(busy||state.pendingChoice||state.pendingSuccession)return;
 LEGACY_CALENDAR.ensure(state);
 if(state.nextId>MAX_PEOPLE){toast('2,000-person prototype limit. Export your family; larger simulations are planned.');return}
 if(!continuation)state.remainingYears=0;
 busy=true;const before=state.events.length,peeps=persons().length;let passed=0;
 try{
  for(let i=0;i<years;i++){
   const c=state.calendar,old=c.date;
   c.date=LEGACY_CALENDAR.shiftYears(c.date,1);
   LEGACY_CALENDAR.reanchor(state);
   c.daysElapsed+=Math.round((Date.parse(c.date+'T12:00:00Z')-Date.parse(old+'T12:00:00Z'))/86400000);
   simulateOneYear();passed++;
   if(state.pendingSuccession){state.remainingYears=years-passed;break;}
   if(state.pendingChoice){state.remainingYears=years-passed;break;}
   if(maybeLifeChoice()){state.remainingYears=years-passed;break;}
   if(state.nextId>MAX_PEOPLE)break;
  }
  needsFit=true;$('#profile-panel').scrollTop=0;render();saveSoon();
  if(state.pendingSuccession)showSuccession();
  else if(state.pendingChoice)showLifeChoice();
  else toast(passed<years?'2,000-person limit reached. Export your save to preserve this dynasty.':passed+' year'+(passed===1?'':'s')+' passed · '+(persons().length-peeps)+' new lives · '+(state.events.length-before)+' events');
 }catch(e){console.error(e);toast('Simulation error: please export a backup.')}
 finally{busy=false}
}
function showModal(html){closeTimeControls();timelinePause();$('#modal-content').classList.remove('person-profile-dialog','living-decision-dialog','attention-inbox-dialog');$('#modal-backdrop').classList.remove('person-profile-backdrop','living-decision-backdrop','attention-inbox-backdrop');$('#modal-content').innerHTML=html;$('#modal-backdrop').classList.remove('hidden')}
function closeModal(){if(state?.pendingChoice||state?.pendingSuccession)return;$('#modal-backdrop').classList.add('hidden');$('#modal-content').classList.remove('person-profile-dialog','living-decision-dialog','attention-inbox-dialog');$('#modal-backdrop').classList.remove('person-profile-backdrop','living-decision-backdrop','attention-inbox-backdrop')}

function showSuccession(){
 const pending=state.pendingSuccession;if(!pending)return;
 const from=get(pending.fromId),heirs=LEGACY_SUCCESSION.candidates(state,pending.fromId),legacy=LEGACY_SUCCESSION.familyLegacy(state);
 if(!from){state.pendingSuccession=null;saveSoon();return;}
 const intro='<div class="eyebrow">A LEGACY CONTINUES / '+state.year+'</div><h2>Choose the next generation.</h2><p>'+esc(full(from))+' has died at age '+(from.deathYear-from.birthYear)+'. Their story lives on through the people they leave behind. Choose whose life you will guide next.</p>';
 const stats='<div class="life-choice-meta">'+legacy.generations+' generations · '+legacy.living+' living family members · Family net worth '+money(legacy.wealth)+'</div>';
 if(!heirs.length){
  showModal(intro+stats+'<p>No surviving family members remain to inherit control. The family history is still available.</p><div class="modal-actions"><button class="primary" id="succession-end">Review family history</button></div>');
  $('#succession-end').onclick=()=>{state.pendingSuccession=null;state.remainingYears=0;saveSoon();closeModal();setTab('history');};
  return;
 }
 showModal(intro+stats+'<div class="life-choice-options">'+heirs.map((h,i)=>'<button class="life-choice-option" data-heir="'+esc(h.id)+'"><span class="life-choice-number">'+String(i+1).padStart(2,'0')+'</span><span><strong>'+esc(h.name)+'</strong><small>'+esc(h.role)+' · Age '+h.age+' · Generation '+h.gen+' · '+esc(h.city)+'</small></span><span class="life-choice-arrow">→</span></button>').join('')+'</div><p class="modal-note">Your new character retains the upbringing, relationships and opportunities created by earlier generations.</p>');
 $$('[data-heir]').forEach(b=>b.onclick=()=>chooseSuccessor(b.dataset.heir));
}
function chooseSuccessor(id){
 const transition=LEGACY_SUCCESSION.choose(state,id);if(!transition)return;
 const old=get(transition.from.id),next=get(transition.to.id);
 addEvent(state.year,'succession',full(old)+' passed the family story to '+full(next)+'.',[old.id,next.id]);
 needsFit=true;render();saveSoon();
 const left=Math.max(0,Math.min(100,Number(state.remainingYears)||0));
 showModal('<div class="eyebrow">THE NEXT GENERATION / '+state.year+'</div><h2>'+esc(full(next))+'</h2><p>You now control '+esc(full(next))+', age '+age(next)+'. The family story continues with '+transition.legacy.generations+' generations recorded.</p><p class="modal-note">'+esc(LEGACY_CONSEQUENCES.describe(next))+'</p><div class="modal-actions">'+(left?'<button class="primary" id="succession-continue">Continue '+left+' year'+(left===1?'':'s')+' →</button>':'')+'<button class="secondary" id="succession-finish">'+(left?'Stop here':'Explore the family')+'</button></div>');
 if(left)$('#succession-continue').onclick=()=>{state.remainingYears=0;closeModal();advance(left,true);};
 $('#succession-finish').onclick=()=>{state.remainingYears=0;saveSoon();closeModal();};
}

function newWorldModal(){showModal(`<div class="eyebrow">THE BEGINNING OF EVERYTHING</div><h2>Begin a new legacy</h2><p>Start with one person, two parents, and a sibling. Every life that follows grows from this history.</p><label for="new-name">Founding character</label><input maxlength="50" id="new-name" class="field-input" value="Alex Morgan" placeholder="First and last name" /><label for="new-sex">Founding character</label><select id="new-sex" class="field-input"><option value="male">Male</option><option value="female">Female</option></select><label for="new-year">Starting year</label><input id="new-year" class="field-input" type="number" min="1800" max="2200" value="2026" /><div class="modal-warning">Creating a new world replaces the current active game. Export your family history first if you want to keep it.</div><div class="modal-actions"><button class="secondary" id="cancel-modal">Cancel</button><button class="primary" id="create-world">Create family →</button></div>`);
 $('#cancel-modal').onclick=closeModal;$('#create-world').onclick=()=>{let v=$('#new-name').value.trim(),y=Number($('#new-year').value);if(!v||!Number.isInteger(y)||y<1800||y>2200){toast('Enter a name and a starting year from 1800 to 2200.');return}newWorld(v,$('#new-sex').value,y);closeModal();saveSoon();setTab('tree');render();toast('A new family story has begun.');};}
function menuModal(){showModal(`<div class="eyebrow">LEGACY / WORLD SETTINGS</div><h2>Your family, your rules</h2><p>Saved automatically to this device. Export a JSON backup to protect your dynasty or move it elsewhere.</p><label for="realism-select">Simulation realism</label><select id="realism-select" class="field-input"><option value="casual" ${state.realism==='casual'?'selected':''}>Casual · Easier player choices</option><option value="realistic" ${state.realism==='realistic'?'selected':''}>Realistic · Probabilistic decisions</option><option value="strict" ${state.realism==='strict'?'selected':''}>Strict · More uncertainty</option></select><button class="menu-action primary" id="export-game">↓ Export family save (.json)</button><button class="menu-action" id="import-game">↑ Import family save (.json)</button><input type="file" accept=".json,application/json" class="file-input" id="import-file" /><button class="menu-action" id="save-game">✓ Save on this device now</button><button class="menu-action" id="new-from-menu">＋ Begin a new family</button><p class="modal-note">LEGACY <strong>v1.26.0</strong> · Edge-to-edge display · Automatic update checks</p><p class="modal-note">Realism settings affect gameplay decisions only. The current demographic model is a prototype and is not calibrated to scientific population data.</p><div class="modal-actions"><button class="secondary" id="close-menu">Close</button></div>`);
 $('#realism-select').onchange=e=>{state.realism=e.target.value;saveSoon();toast(`Realism: ${state.realism}.`)};
 $('#export-game').onclick=exportGame;$('#import-game').onclick=()=>$('#import-file').click();$('#import-file').onchange=handleImport;
 $('#save-game').onclick=()=>saveGame().then(ok=>toast(ok?'Family saved on this device.':'Storage unavailable; export a backup instead.'));
 $('#new-from-menu').onclick=newWorldModal;$('#close-menu').onclick=closeModal;}
function exportGame(){const data=JSON.stringify(state,null,2);const a=document.createElement('a');const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.href=url;a.download=`LEGACY_${state.familyName}_${state.year}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Exported family history backup.');}
function validImport(g){return !!(g&&g.version===VERSION&&Number.isInteger(g.year)&&g.year>=1800&&g.year<=3000&&g.people&&typeof g.people==='object'&&!Array.isArray(g.people)&&Array.isArray(g.events)&&g.selectedId&&g.people[g.selectedId]&&Object.keys(g.people).length<=100000&&g.events.length<=300000)}
async function handleImport(e){const file=e.target.files?.[0];if(!file)return;try{const g=JSON.parse(await file.text());if(!validImport(g))throw Error('Invalid or incompatible save');state=g;upgradeOldSave();state.controlledId=state.controlledId||state.founderId||state.selectedId;closeModal();needsFit=true;currentTab='tree';setTab('tree');render();if(state.pendingSuccession)showSuccession();else if(state.pendingChoice)showLifeChoice();await saveGame();toast(`Restored the ${state.familyName} family.`)}catch(err){toast('Could not import this save file.')}e.target.value='';}
function openDB(){return new Promise(resolve=>{try{if(!('indexedDB' in window))return resolve(null);const r=indexedDB.open('legacy-family-save',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('worlds'))r.result.createObjectStore('worlds')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch(e){resolve(null)}})}
function storageGet(){try{return JSON.parse(localStorage.getItem('legacy-snapshot-v1')||'null')}catch(e){return null}}
function storageSet(){try{localStorage.setItem('legacy-snapshot-v1',JSON.stringify(state));return true}catch(e){return false}}
async function loadGame(){db=await openDB();if(db){try{const game=await new Promise((resolve,reject)=>{const t=db.transaction('worlds','readonly').objectStore('worlds').get('active');t.onsuccess=()=>resolve(t.result);t.onerror=()=>reject(t.error)});if(validImport(game))return game}catch(e){console.warn('IndexedDB read unavailable',e)}}const local=storageGet();return validImport(local)?local:null}
async function saveGame(){if(!state)return false;let success=false;if(db){try{success=await new Promise(resolve=>{const tx=db.transaction('worlds','readwrite');tx.objectStore('worlds').put(state,'active');tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)})}catch(e){console.warn('IndexedDB write unavailable',e)}}if(!success)success=storageSet();return success}
function saveSoon(){clearTimeout(saveHandle);saveHandle=setTimeout(()=>{saveGame().then(ok=>{if(!ok)toast('Could not auto-save. Export a backup from the menu.')})},450)}
function openRevealMenu(){
 if(!state||state.pendingChoice||state.pendingSuccession)return;
 const popup=$('#time-popup');
 popup.classList.add('menu-only');
 $('#time-popup-title').textContent='Explore your dynasty';
 popup.setAttribute('aria-describedby','time-summary');
 $('#time-popup-close').setAttribute('aria-label','Close menu');
 if(!popup.open)popup.showModal();
 $('#reveal-menu').setAttribute('aria-expanded','true');
}
function openTimeControls(){
 if(!state||state.pendingChoice||state.pendingSuccession)return;
 timelinePause();renderCalendar();
 const popup=$('#time-popup');
 popup.classList.remove('menu-only');
 $('#time-popup-title').textContent='Time & control';
 popup.setAttribute('aria-describedby','time-popup-note');
 $('#time-popup-close').setAttribute('aria-label','Close time controls');
 if(!popup.open)popup.showModal();
 $('#reveal-menu').setAttribute('aria-expanded','true');
 $('#time-menu').setAttribute('aria-expanded','true');
 $('#time-popup-close').focus?.();
}
function closeTimeControls(){
 const popup=$('#time-popup');
 if(popup.open){popup.close();$('#reveal-menu').focus?.();}
 $('#time-menu').setAttribute('aria-expanded','false');
 $('#reveal-menu').setAttribute('aria-expanded','false');
}
function bind(){
 $('#reveal-menu').onclick=openRevealMenu;
 // Start swipes only on the pill or sheet header, never on the tree or form fields.
 function swipe(el,onUp,onDown){
  let start=null;
  el.addEventListener('pointerdown',e=>{if(e.target!==el&&e.target?.closest?.('button'))return;start={x:e.clientX,y:e.clientY,id:e.pointerId};el.setPointerCapture?.(e.pointerId);});
  el.addEventListener('pointerup',e=>{if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dy)>32&&Math.abs(dy)>Math.abs(dx)*1.3){if(dy<0)onUp?.();else onDown?.();}});
  el.addEventListener('pointercancel',()=>{start=null;});
 }
 swipe($('#reveal-menu'),openRevealMenu,null);
 swipe($('.sheet-grip'),null,closeTimeControls);
 swipe($('.time-popup-header'),null,closeTimeControls);

 $('#time-menu').onclick=openTimeControls;
 $('#time-popup-close').onclick=closeTimeControls;
 $('#time-popup-done').onclick=closeTimeControls;
 $('#time-popup-play').onclick=()=>{closeTimeControls();timelinePlay();};
 $('#time-popup').addEventListener('cancel',e=>{e.preventDefault();closeTimeControls();});
 $('#time-popup').addEventListener('click',e=>{if(e.target!==$('#time-popup'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeTimeControls();});

 syncAppViewport();
 if(typeof window.addEventListener==='function'){
  window.addEventListener('resize',syncAppViewport);
  window.addEventListener('pageshow',syncAppViewport);
  window.visualViewport?.addEventListener('resize',syncAppViewport);
  document.addEventListener('focusout',()=>setTimeout(syncAppViewport,150));
 }
 $$('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 $$('.scope').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;$$('.scope').forEach(x=>x.classList.toggle('active',x.dataset.scope===scope));needsFit=true;layoutGraph()});
 $$('.mode-toggle button').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;saveSoon();render();toast(state.mode==='individual'?'Individual Control: follow a selected life.':'Family Control: direct any living relative.')});
 $$('.advance').forEach(b=>b.onclick=()=>{closeTimeControls();advance(Number(b.dataset.years));});
 $('#advance-hour').onclick=()=>{closeTimeControls();advanceCalendar('hour',1);};
 $('#advance-day').onclick=()=>{closeTimeControls();advanceCalendar('day',1);};
 $('#advance-month').onclick=()=>{closeTimeControls();advanceCalendar('month',1);};
 $('#calendar-detail').onclick=showCalendarDetails;
 $('#timeline-play').onclick=()=>{if(timelineRunning)timelinePause();else{closeTimeControls();timelinePlay();}};
 $('#timeline-speed').onchange=()=>timelineSpeed($('#timeline-speed').value);
 $('#zoom-in').onclick=()=>zoomTree(1.24);
 $('#zoom-out').onclick=()=>zoomTree(1/1.24);
 $('#selected-person').onclick=()=>showPersonStats(state.selectedId);
 $('#tree-fullscreen').onclick=()=>toggleTreeFullscreen();
 $('#center-person').onclick=centerPerson;
 $('#zoom-fit').onclick=()=>{fitScene();drawGraph()};
 $('#menu-btn').onclick=menuModal;$('#new-world-btn').onclick=newWorldModal;
 $('#people-search').addEventListener('input',renderPeople);
 $('#modal-backdrop').addEventListener('click',e=>{if(e.target.id==='modal-backdrop')closeModal()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeTimeControls();if($('#app').classList.contains('zen-tree'))toggleTreeFullscreen(false);}});
 let pointers=new Map(),dragStart=null,pinch=null,holdTimer=null,holdTarget=null,holdConsumed=false;
 const LONG_PRESS_MS=520;
 const getPoint=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
 const personAt=pt=>{
  const wx=(pt.x-camera.x)/camera.scale,wy=(pt.y-camera.y)/camera.scale;
  return scene.slice().reverse().find(n=>wx>=n.x-n.w/2&&wx<=n.x+n.w/2&&wy>=n.y-n.h/2&&wy<=n.y+n.h/2)?.p||null;
 };
 const cancelHold=()=>{if(holdTimer!==null)clearTimeout(holdTimer);holdTimer=null;holdTarget=null};
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const pt=getPoint(e);pointers.set(e.pointerId,pt);
  if(pointers.size===1){
   holdConsumed=false;
   dragStart={...pt,camX:camera.x,camY:camera.y,moved:false};
   const person=personAt(pt);
   if(person&&!state.pendingChoice&&!state.pendingSuccession){
    holdTarget=person.id;
    holdTimer=setTimeout(()=>{
     const target=holdTarget;holdTimer=null;holdTarget=null;
     if(!target||!dragStart||dragStart.moved||pointers.size!==1)return;
     holdConsumed=true;dragStart=null;
     showPersonStats(target);
    },LONG_PRESS_MS);
   }
  }else{
   cancelHold();
   if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),scale:camera.scale,worldX:((a[0].x+a[1].x)/2-camera.x)/camera.scale,worldY:((a[0].y+a[1].y)/2-camera.y)/camera.scale};dragStart=null;}
  }
 });
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const pt=getPoint(e);pointers.set(e.pointerId,pt);
  if(pointers.size===2&&pinch){
   cancelHold();
   const [a,b]=[...pointers.values()];
   camera.scale=Math.max(.12,Math.min(3,pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));
   camera.x=(a.x+b.x)/2-pinch.worldX*camera.scale;camera.y=(a.y+b.y)/2-pinch.worldY*camera.scale;
   drawGraph();
  }else if(dragStart){
   const dx=pt.x-dragStart.x,dy=pt.y-dragStart.y;
   if(Math.hypot(dx,dy)>6){dragStart.moved=true;cancelHold();}
   if(dragStart.moved){camera.x=dragStart.camX+dx;camera.y=dragStart.camY+dy;drawGraph();}
  }
 });
 canvas.addEventListener('pointerup',e=>{
  const pt=getPoint(e),d=dragStart,consumed=holdConsumed;
  cancelHold();pointers.delete(e.pointerId);
  if(!pointers.size){
   if(!consumed&&d&&!d.moved){const hit=personAt(pt);if(hit)selectPerson(hit.id);}
   dragStart=null;pinch=null;holdConsumed=false;
  }else if(pointers.size===1){dragStart=null;pinch=null;}
 });
 canvas.addEventListener('pointercancel',e=>{cancelHold();pointers.delete(e.pointerId);dragStart=null;pinch=null;holdConsumed=false});
 canvas.addEventListener('lostpointercapture',()=>{cancelHold();});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const pt=getPoint(e),wx=(pt.x-camera.x)/camera.scale,wy=(pt.y-camera.y)/camera.scale;camera.scale=Math.max(.12,Math.min(3,camera.scale*(e.deltaY<0?1.1:.9)));camera.x=pt.x-wx*camera.scale;camera.y=pt.y-wy*camera.scale;drawGraph()},{passive:false});
 const ro=new ResizeObserver(()=>{if(currentTab==='tree'&&state){fitScene();drawGraph()}});ro.observe($('#canvas-wrap'));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){timelinePause();saveGame()}else{syncAppViewport();if(currentTab==='tree')requestAnimationFrame(()=>{fitScene();drawGraph()});}});
 if(typeof window.addEventListener==='function')window.addEventListener('pagehide',()=>{timelinePause();saveGame()});
}
function upgradeOldSave(){
 LEGACY_TIMELINE.ensure(state);
 LEGACY_CALENDAR.ensure(state);
 LEGACY_ATTENTION.ensure(state);
 LEGACY_LIVING_DECISIONS.ensure(state);LEGACY_STORYLINES.ensure(state);
 for(const p of persons()){
  if(!p.birthDate)p.birthDate=String(p.birthYear)+'-01-01';
  if(p.deathYear&&!p.deathDate)p.deathDate=String(p.deathYear)+'-01-01';
  LEGACY_HUMAN.ensure(p,age(p));LEGACY_ECONOMY.ensure(p);LEGACY_MEDICINE.ensure(p);
  LEGACY_EDUCATION.ensure(p);LEGACY_CAREERS.ensure(p);LEGACY_LIVING_PSYCHOLOGY.ensure(p);
  if(!Array.isArray(p.commitments))p.commitments=[];
 }
}
async function init(){state=await loadGame();if(!state){newWorld();await saveGame()}upgradeOldSave();state.controlledId=state.controlledId||state.founderId||state.selectedId;bind();render();if(state.pendingSuccession)showSuccession();else if(state.pendingChoice)showLifeChoice();if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
   reg.update().catch(()=>{});
   let refreshed=false;
   navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshed)return;
    refreshed=true;
    // Reload only when a new worker takes control. IndexedDB saves are unchanged.
    if(document.visibilityState==='visible')location.reload();
   });
  }).catch(()=>{});
 }}
init().catch(e=>{console.error(e);$('#tree-subhead').textContent='Unable to start the simulation. Please reload.'});
// Integration-test API (not required for gameplay).
window.LEGACY_TEST={getState:()=>state,addEvent,advance,advanceCalendar,renderCalendar,showCalendarDetails,renderTimeline,timelinePlay,timelinePause,timelineAdvance,timelineSpeed,selectPerson,decide,newWorld,saveGame,loadGame,render,validImport,maybeLifeChoice,resolveLifeChoice,showLifeChoice,showStoryDetails,showSuccession,chooseSuccessor,showPersonStats,renderAttention,showAttentionInbox,reviewAttentionPerson,getScene:()=>scene,getCamera:()=>({...camera}),fitScene,treeViewport,centerPerson,zoomTree,toggleTreeFullscreen,setTab,openRevealMenu,openTimeControls,closeTimeControls};
})();
