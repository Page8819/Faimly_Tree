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
const cities=['New York','Boston','Philadelphia','Chicago','Denver','Atlanta','Seattle','Austin','Portland','San Francisco','Nashville','Minneapolis','Raleigh','San Diego'];
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
function age(p){return state.year-p.birthYear}
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
function createPerson({first,last,sex,birthYear,gen=0,parentIds=[],adoptiveParentIds=[],inFamily=true,city='New York',education,jobLevel,wealth}){
 const p={id:id(),first,last,sex,birthYear,deathYear:null,gen,parentIds:[...parentIds],adoptiveParentIds:[...adoptiveParentIds],inFamily,city,
 partnerId:null,partnerSince:null,formerPartners:[],education:education??(birthYear<=state.year-25?int(1,3):0),jobLevel:jobLevel??(birthYear<=state.year-20?int(1,3):0),wealth:wealth??int(300,6500),
 traits:makeTraits(parentIds),bonds:{},eyeTint:pick(['hazel','brown','brown','blue','green']),hairTint:pick(['brown','black','blond','auburn']),memory:[]};
 state.people[p.id]=p;return p;
}
function addEvent(year,type,message,personIds=[]){state.events.push({id:state.nextEvent++,year,type,message,personIds:[...new Set(personIds.filter(Boolean))]})}
function bond(a,b,value){a.bonds[b.id]=Math.max(0,Math.min(100,(a.bonds[b.id]??50)+value));b.bonds[a.id]=Math.max(0,Math.min(100,(b.bonds[a.id]??50)+value))}
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
 const p=createPerson({first,last,sex,birthYear:state.year,gen,parentIds:adopted?[]:b?[a.id,b.id]:[a.id],adoptiveParentIds:adopted?(b?[a.id,b.id]:[a.id]):[],city:a.city,inFamily:!!(a.inFamily||b?.inFamily),education:0,jobLevel:0,wealth:0});
 LEGACY_CONSEQUENCES.childStart(p,[a,b]);bond(p,a,30);if(b)bond(p,b,30);
 if(!adopted&&b){p.eyeTint=chance(.47)?a.eyeTint:b.eyeTint;p.hairTint=chance(.47)?a.hairTint:b.hairTint}
 addEvent(state.year,adopted?'adoption':'birth',adopted?`${full(p)} joined the family through adoption.`:`${full(p)} was born to ${full(a)}${b?' and '+full(b):''}.`,[p.id,a.id,b?.id]);return p;
}
function newWorld(name='Alex Morgan',sex='male',startYear=2026){
 const clean=String(name).trim().replace(/\s+/g,' ');let spl=clean.split(' ');const first=spl.shift()||'Alex',last=spl.join(' ')||'Morgan';
 state={version:VERSION,year:startYear,mode:'individual',realism:'realistic',founderId:null,selectedId:null,controlledId:null,rootId:null,nextId:1,nextEvent:1,rng:hash(clean+startYear),familyName:last,people:{},events:[],pendingChoice:null,pendingSuccession:null,successionLog:[],remainingYears:0,createdAt:new Date().toISOString()};
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
 currentTab='tree';scope='focus';needsFit=true;return state;
}
function annualDeathProbability(a){if(a<1)return .004;if(a<15)return .0002;if(a<30)return .0007;if(a<40)return .0013;if(a<50)return .0027;if(a<60)return .006;if(a<70)return .014;if(a<80)return .037;if(a<90)return .09;return Math.min(.5,.17+(a-90)*.012)}
function die(p){p.deathYear=state.year;const q=partner(p);if(q){p.partnerId=null;q.partnerId=null;p.partnerSince=null;q.partnerSince=null;if(!p.formerPartners.includes(q.id))p.formerPartners.push(q.id);if(!q.formerPartners.includes(p.id))q.formerPartners.push(p.id)}
 const heirs=[...(q&&alive(q)?[q]:[]),...kids(p).filter(alive)];if(p.wealth>1000&&heirs.length){let amount=p.wealth*.85/heirs.length;for(let h of heirs)h.wealth+=amount;p.wealth*=.15;addEvent(state.year,'inheritance',`${full(p)}'s estate passed to ${heirs.length} surviving family member${heirs.length>1?'s':''}.`,[p.id,...heirs.map(x=>x.id)])}
 addEvent(state.year,'death',`${full(p)} died at age ${age(p)}.`,[p.id]);
}
function meetPartner(p){if(p.partnerId||!alive(p)||age(p)<18||state.nextId>MAX_PEOPLE)return null;
 const a=age(p),sex=chance(.86)?(p.sex==='female'?'male':'female'):p.sex,offset=int(-5,5),bYear=state.year-Math.max(18,Math.min(79,a+offset));
 const other=createPerson({first:pick(sex==='female'?firstF:firstM),last:pick(lastNames),sex,birthYear:bYear,gen:p.gen,inFamily:false,city:p.city,wealth:int(2500,28000)});
 linkCouple(p,other);return other;
}
function maybeRelocate(p){if(chance(.012)){const from=p.city;let next=pick(cities);if(next!==from){p.city=next;addEvent(state.year,'move',`${full(p)} moved from ${from} to ${next}.`,[p.id]);const q=partner(p);if(q&&chance(.75))q.city=next;}}}
function incomeFor(p){const base=[0,25000,41000,61000,92000,135000,185000];return base[Math.max(0,Math.min(p.jobLevel,6))]*(.85+p.education*.07)}
function yearlyEconomy(p){const a=age(p);if(a<18)return;LEGACY_CONSEQUENCES.annual(p,a,state.year);if(p.retired){p.wealth+=Math.round(Math.max(11000,incomeFor(p)*.2)-17000+rnd()*2500);return;}if(a<28&&p.education<3&&chance(.13)){p.education++;if(chance(.3))addEvent(state.year,'education',`${full(p)} completed additional education.`,[p.id]);}
 if(a>=67){p.wealth+=Math.round(incomeFor(p)*.16-19000+rnd()*4000);return}
 if(chance(LEGACY_CONSEQUENCES.careerOdds(p))&&p.jobLevel<6){p.jobLevel++;addEvent(state.year,'career',`${full(p)} advanced their career.`,[p.id]);}
 const income=incomeFor(p),living=income*(.66+rnd()*.17)+int(2600,6200);p.wealth+=Math.round(income-living);
 if(p.wealth < -100000)p.wealth=-100000;
}
function simulateOneYear(){state.year++;
 const start=persons();
 for(const p of start){if(alive(p)&&chance(annualDeathProbability(age(p))))die(p)}
 for(const p of start){if(!alive(p))continue;yearlyEconomy(p);if(age(p)>19&&age(p)<65)maybeRelocate(p);
  if(!p.partnerId&&age(p)>=19&&age(p)<=57&&chance(age(p)<40?.14:.055))meetPartner(p);
 }
 const pairKey=(a,b)=>[a,b].sort().join('|');
 const biologicalCounts=new Map(),adoptionCounts=new Map();
 for(const child of persons()){if(child.parentIds.length===2){const k=pairKey(...child.parentIds);biologicalCounts.set(k,(biologicalCounts.get(k)||0)+1)}if(child.adoptiveParentIds.length===2){const k=pairKey(...child.adoptiveParentIds);adoptionCounts.set(k,(adoptionCounts.get(k)||0)+1)}}
 const couples=[];
 for(const p of persons()){const q=partner(p);if(q&&p.id<q.id&&alive(p)&&alive(q))couples.push([p,q]);}
 for(const [p,q] of couples){if(!p.partnerId||!q.partnerId)continue;
  const years=state.year-(p.partnerSince??state.year);
  const tension=((p.traits.emotionality+q.traits.emotionality)/200)*.014;
  if(years>2&&chance(.008+tension)){unlinkCouple(p,q);continue;}
  const f=p.sex==='female'?p:q.sex==='female'?q:null;
  const m=p.sex==='male'?p:q.sex==='male'?q:null;
  const parentsKids=biologicalCounts.get(pairKey(p.id,q.id))||0;
  if(f&&m&&age(f)>=19&&age(f)<=43&&age(m)>=19&&age(m)<=69){let rate=parentsKids===0?.19:parentsKids===1?.15:parentsKids===2?.10:parentsKids===3?.03:.004;
   if(rate&&parentsKids<5&&chance(rate))birth(f,m);
  } else if(age(p)>24&&age(q)>24&&age(p)<49&&age(q)<49){const adoptKids=adoptionCounts.get(pairKey(p.id,q.id))||0;
   if(adoptKids<2&&chance(.055))birth(p,q,true);
  }
 }
 const active=get(state.controlledId);
 if(state.mode==='individual'&&active&&!alive(active)&&!state.pendingSuccession){
  LEGACY_SUCCESSION.prepare(state,active.id);
 }
}
function related(p){let ids=[...p.parentIds,...p.adoptiveParentIds,...kids(p).map(v=>v.id),...(p.partnerId?[p.partnerId]:[]),...p.formerPartners];return [...new Set(ids)].map(get).filter(Boolean)}

const LIFE_CHOICES={
 launch:{tag:'COMING OF AGE',title:'Your future begins today.',text:'Adulthood brings opportunity—and responsibility. How will you start building your own life?',options:[['college','Go to college','Borrow or spend $14,000 to study and gain qualifications.'],['trade','Learn a trade','Invest $2,500 in practical skills and begin earning.'],['work','Start working','Earn right away and begin building savings.']]},
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
 if(!kind&&chance(state.realism==='casual'?.30:.24)){
  const event=LEGACY_EVENTS.propose({p,people:state.people,year:state.year,rnd});
  if(event){state.pendingChoice={personId:p.id,kind:'event',year:state.year,event};return true;}
 }
 if(!kind)return false;
 state.pendingChoice={personId:p.id,kind,year:state.year};
 return true;
}
function showLifeChoice(){
 const pending=state.pendingChoice;if(!pending)return;
 const p=get(pending.personId),choice=pending.kind==='event'?pending.event:LIFE_CHOICES[pending.kind];
 if(!p||!choice){state.pendingChoice=null;saveSoon();return;}
 showModal('<div class="eyebrow">LIFE DECISION / '+esc(choice.tag)+'</div><div class="life-choice-meta">'+esc(full(p))+' · Age '+age(p)+' · '+state.year+'</div><h2>'+esc(choice.title)+'</h2><p>'+esc(choice.text)+'</p><div class="life-choice-options">'+choice.options.map((o,i)=>'<button class="life-choice-option" data-life-option="'+esc(o[0])+'"><span class="life-choice-number">0'+(i+1)+'</span><span><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small></span><span class="life-choice-arrow">→</span></button>').join('')+'</div><p class="modal-note">Your decision changes this person’s life and is remembered in the family chronicle.</p>');
 $('.life-choice-option').forEach(b=>b.onclick=()=>resolveLifeChoice(b.dataset.lifeOption));
}
function resolveLifeChoice(action){
 const pending=state.pendingChoice;if(!pending)return;
 const p=get(pending.personId),template=pending.kind==='event'?pending.event:LIFE_CHOICES[pending.kind];
 if(!p||!template)return;
 const option=template.options.find(o=>o[0]===action);if(!option)return;
 const fortune=state.realism==='casual'?.82:state.realism==='strict'?.52:.67;
 const changeMoney=amount=>{p.wealth=Math.max(-100000,Math.round(p.wealth+amount));};
 const kin=related(p).filter(alive).filter(q=>q.id!==p.id).sort((a,b)=>a.wealth-b.wealth);
 let result='',others=[];
 if(pending.kind==='event'){
  const story=LEGACY_EVENTS.resolve({p,people:state.people,year:state.year,event:pending.event,option:action,rnd,cities});
  if(!story)return;
  result=story.result;others=story.others||[];
 }else switch(action){
 case 'college':p.education=Math.min(4,p.education+2);changeMoney(-14000);result='Completed advanced education, taking on $14,000 in costs.';break;
 case 'trade':p.education=Math.min(4,p.education+1);p.jobLevel=Math.max(p.jobLevel,2);changeMoney(-2500);result='Learned a skilled trade and entered the workforce.';break;
 case 'work':p.jobLevel=Math.max(p.jobLevel,1);changeMoney(4500);result='Started working immediately and saved $4,500.';break;
 case 'promotion':if(p.jobLevel<6&&chance(fortune)){p.jobLevel++;changeMoney(3000);result='Earned a promotion and a $3,000 bonus.';}else{result='Pursued a promotion, but the opportunity did not work out.';}break;
 case 'business':changeMoney(-7500);if(chance(Math.max(.2,fortune-.12+(p.traits.openness-50)/300))){const gains=int(12000,28000);changeMoney(gains);result='The new venture succeeded, returning '+money(gains)+' after the initial investment.';}else result='The new venture struggled and the $7,500 startup investment was lost.';break;
 case 'stable':changeMoney(3500);result='Chose a steadier path and accumulated $3,500 in savings.';break;
 case 'financial':if(kin.length){const q=kin[0],amount=Math.max(0,Math.min(2500,p.wealth));changeMoney(-amount);q.wealth+=amount;bond(p,q,14);others=[q.id];result=amount?'Shared '+money(amount)+' with '+full(q)+', strengthening their relationship.':'Had little money to spare, but reached out and strengthened a family bond.';}else result='Tried to help family, but no living close relatives were available.';break;
 case 'quality':if(kin.length){const q=kin[0];bond(p,q,22);others=[q.id];result='Spent meaningful time with '+full(q)+' and became closer.';}else result='Made room for future friendships and connections.';break;
 case 'independent':changeMoney(1800);if(kin.length){bond(p,kin[0],-5);others=[kin[0].id];}result='Prioritized personal goals and built an additional $1,800 in savings.';break;
 case 'retrain':changeMoney(-4000);p.education=Math.min(4,p.education+1);if(chance(fortune)&&p.jobLevel<6)p.jobLevel++;result='Invested $4,000 in retraining and gained new skills.';break;
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
 LEGACY_CONSEQUENCES.apply(p,action,state.year,result);
 p.lastLifeChoiceYear=state.year;
 state.pendingChoice=null;
 addEvent(state.year,'choice',full(p)+' chose: '+option[1]+'. '+result,[p.id,...others]);
 needsFit=true;render();saveSoon();
 const left=Math.max(0,Math.min(100,Number(state.remainingYears)||0));
 showModal('<div class="eyebrow">THE CONSEQUENCES / '+state.year+'</div><h2>'+esc(option[1])+'</h2><p>'+esc(result)+'</p><p class="modal-note">Saved to your family chronicle. Personal wealth: '+money(p.wealth)+' · Education level: '+p.education+'.</p><div class="modal-actions">'+(left?'<button class="primary" id="life-continue">Continue '+left+' year'+(left===1?'':'s')+' →</button>':'')+'<button class="secondary" id="life-finish">'+(left?'Stop here':'Return to family')+'</button></div>');
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
  if(age(p)<18||age(p)>75){toast('This action is available during working adulthood.');return}
  if(p.jobLevel>=6){p.wealth+=1200;toast('Already at the highest career level.');}
  else if(chance(state.realism==='casual'?.95:.7)){p.jobLevel++;p.wealth+=int(700,3500);addEvent(state.year,'career',`${full(p)} advanced their career through a new opportunity.`,[p.id]);toast('Career advanced.')}
  else{addEvent(state.year,'career',`${full(p)} pursued a promotion, without success.`,[p.id]);toast('The promotion did not work out this time.')}
 } else if(action==='educate'){
  if(age(p)<16||age(p)>65||p.education>=4){toast('Further education is unavailable.');return}
  if(p.wealth<2500){toast('Requires at least $2,500 in available savings.');return}
  p.wealth-=2500;p.education++;addEvent(state.year,'education',`${full(p)} invested $2,500 in further education.`,[p.id]);toast('Education improved.');
 } else if(action==='move'){
  if(age(p)<18){toast('Must be an adult to move independently.');return}
  const old=p.city;let next=cities[(cities.indexOf(old)+1+int(0,3))%cities.length];p.city=next;p.wealth-=2100;
  addEvent(state.year,'move',`${full(p)} relocated from ${old} to ${next}.`,[p.id]);toast(`Moved to ${next}.`);
 } else if(action==='support'){
  if(p.wealth<1000){toast('Requires at least $1,000 in savings.');return}
  const rel=related(p).filter(alive).filter(q=>q.id!==p.id);
  if(!rel.length){toast('No available relatives to support.');return}
  rel.sort((a,b)=>a.wealth-b.wealth);const q=rel[0];p.wealth-=1000;q.wealth+=1000;bond(p,q,12);
  addEvent(state.year,'family',`${full(p)} supported ${full(q)} with $1,000.`,[p.id,q.id]);toast(`${q.first} received family support.`);
 }
 LEGACY_CONSEQUENCES.apply(p,action,state.year);
 saveSoon();render();
}
function showToast(msg){toast(msg)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.classList.add('hidden'),2600)}
function renderStats(){const all=persons(),living=all.filter(alive),family=all.filter(p=>p.inFamily),gs=family.map(p=>p.gen),generation=gs.length?Math.max(...gs)+1:1;
 const wealth=living.reduce((v,p)=>v+p.wealth,0);
 $('#header-year').textContent=state.year;
 $('#stats').innerHTML=[['LIVING RELATIVES',fmtN(living.length),'↗'],['RECORDED LIVES',fmtN(all.length),''],['GENERATIONS',String(generation),''],['FAMILY NET WORTH',money(wealth),'']].map(s=>`<div class="stat"><div class="stat-label">${s[0]}</div><div class="stat-value">${s[1]} ${s[2]?`<small>${s[2]}</small>`:''}</div></div>`).join('');
 $('#world-title').textContent=`THE ${state.familyName.toUpperCase()} FAMILY`;
 $('#tree-heading').textContent=`The ${state.familyName} family`;
 $('#time-copy').textContent=`${fmtN(all.length)} lives woven across ${generation} generations.`;
 $$('.mode-toggle button').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
}
function renderProfile(){const p=get(state.selectedId);if(!p)return;
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
 <div class="panel-block"><div class="block-title">Personality & appearance</div>${[['Curiosity',p.traits.openness],['Discipline',p.traits.conscientiousness],['Sociability',p.traits.extraversion]].map(([label,value])=>`<div class="trait-row"><span>${label}</span><span class="trait-track"><span class="trait-fill" style="width:${Math.max(0,Math.min(100,value))}%"></span></span><span>${value}</span></div>`).join('')}<div class="identity">${esc(p.eyeTint)} eyes · ${esc(p.hairTint)} hair · illustrative inheritance model</div></div>
 <div class="panel-block"><div class="block-title">Life record <span class="block-sub">${events.length} recent events</span></div>${events.length?events.map(e=>`<div class="event-mini"><span class="event-mini-year">${e.year}</span><span>${esc(e.message)}</span></div>`).join(''):'<div class="empty-note">New milestones will appear here.</div>'}</div>
 <div class="profile-footer-note">Character traits, finances, and demographics are simplified for this prototype. The simulation is not a scientific prediction of real lives.</div>`;
 $$('#profile-content [data-person]').forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.person)));
 $$('#profile-content [data-action]').forEach(b=>b.addEventListener('click',()=>decide(b.dataset.action)));
 const take=$('#take-control');if(take)take.onclick=()=>{state.controlledId=p.id;saveSoon();renderProfile();toast(`You are now living as ${p.first}.`)};
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
 if(needsFit){fitScene();needsFit=false}
 drawGraph();
}
function setCanvasSize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);return {w:rect.width,h:rect.height};}
function fitScene(){const r=canvas.getBoundingClientRect();if(!scene.length||!r.width||!r.height)return;let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const n of scene){minX=Math.min(minX,n.x-n.w/2);maxX=Math.max(maxX,n.x+n.w/2);minY=Math.min(minY,n.y-n.h/2);maxY=Math.max(maxY,n.y+n.h/2)}
 const sx=(r.width-65)/(maxX-minX+40),sy=(r.height-70)/(maxY-minY+40);camera.scale=Math.max(.16,Math.min(1.22,sx,sy));camera.x=r.width/2-((minX+maxX)/2)*camera.scale;camera.y=r.height/2-((minY+maxY)/2)*camera.scale;
}
function roundPath(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath()}
function ellipsis(s,max=19){return s.length>max?s.slice(0,max-1)+'…':s}
function drawGraph(){if(!state)return;const {w,h}=setCanvasSize();ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.scale,camera.scale);
 for(const e of sceneEdges){const {a,b,kind}=e;ctx.beginPath();ctx.lineWidth=kind==='partner'?1.3:1.8;ctx.strokeStyle=kind==='partner'?'#a4845288':kind==='adopt'?'#80adbc95':'#648b7b99';ctx.setLineDash(kind==='parent'?[]:kind==='adopt'?[4,4]:[3,6]);
  if(kind==='partner'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}else{ctx.moveTo(a.x,a.y+44);const cy=(a.y+b.y)/2;ctx.bezierCurveTo(a.x,cy,b.x,cy,b.x,b.y-44)}ctx.stroke();ctx.setLineDash([]);
 }
 for(const n of scene){const p=n.p,selected=p.id===state.selectedId,dead=!alive(p),x=n.x-n.w/2,y=n.y-n.h/2;
  ctx.shadowBlur=selected?17:0;ctx.shadowColor=selected?'#bd996d9f':'transparent';roundPath(ctx,x,y,n.w,n.h,12);ctx.fillStyle=dead?'#142126':'#1c3032';ctx.fill();ctx.lineWidth=selected?2.5:1;ctx.strokeStyle=selected?'#e0bd7f':dead?'#3a4848':'#4e6e66';ctx.stroke();ctx.shadowBlur=0;
  const hu=hue(p.id);ctx.beginPath();ctx.fillStyle=dead?'#566463':`hsl(${hu},34%,39%)`;ctx.arc(n.x,y+25,16,0,Math.PI*2);ctx.fill();ctx.fillStyle=dead?'#c0cdbe':'#f8ebd9';ctx.font='600 13px Georgia,serif';ctx.textAlign='center';ctx.fillText(p.first.charAt(0)+p.last.charAt(0),n.x,y+29);
  ctx.fillStyle=dead?'#a3aaa5':'#f1f1e6';ctx.font='600 11px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(ellipsis(p.first+' '+p.last,19),n.x,y+54,116);
  ctx.fillStyle=dead?'#788986':'#9bb3a8';ctx.font='10px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(p.birthYear+' – '+(p.deathYear||'●'),n.x,y+70,115);
 }
 ctx.restore();}
function selectPerson(id){if(!get(id))return;state.selectedId=id;$('#profile-panel').scrollTop=0;renderProfile();if(scope==='focus'){needsFit=true;layoutGraph()}else drawGraph();if(currentTab==='people')renderPeople();saveSoon();}
function renderPeople(){const search=$('#people-search').value.toLocaleLowerCase().trim();const list=persons().slice().sort((a,b)=>Number(alive(b))-Number(alive(a))||b.birthYear-a.birthYear);
 const filtered=list.filter(p=>(full(p)+' '+p.city+' '+(jobs[Math.min(p.jobLevel,5)]||'')).toLowerCase().includes(search));
 $('#people-list').innerHTML=filtered.slice(0,400).map(p=>`<button class="person-item ${p.id===state.selectedId?'selected':''}" data-person="${p.id}"><span class="person-avatar" style="${gradient(p)}">${esc(initials(p))}</span><span class="person-item-main"><span class="person-item-name">${esc(full(p))}</span><span class="person-item-info">${esc(p.city)} · ${ages(p)} · Gen ${p.gen+1}</span></span><span class="person-item-side">${alive(p)?'LIVING':'REMEMBERED'}</span></button>`).join('')+(filtered.length>400?`<div class="empty-note">Showing 400 of ${filtered.length} results. Refine your search.</div>`:'')||'<div class="empty-note">No matching family members.</div>';
 $$('#people-list [data-person]').forEach(b=>b.addEventListener('click',()=>selectPerson(b.dataset.person)));
}
function renderHistory(){const events=state.events.slice().sort((a,b)=>b.year-a.year||b.id-a.id).slice(0,450);let oldYear=null;
 $('#history-list').innerHTML=events.map(e=>{let head='';if(e.year!==oldYear){oldYear=e.year;head=`<div class="history-year">${e.year}</div>`}const name=e.personIds.map(get).filter(Boolean)[0];return `${head}<div class="history-item"><span class="history-marker">${({birth:'✦',death:'◆',relationship:'♥',adoption:'✦',move:'⌁',career:'↑',education:'◈',inheritance:'◇',family:'♡',milestone:'✧',choice:'⚖',succession:'♜'}[e.type]||'●')}</span><button data-event-person="${name?.id||''}"><div class="history-name">${esc(e.type.toUpperCase())}</div>${esc(e.message)}</button></div>`}).join('')+(state.events.length>450?'<div class="empty-note">Showing the latest 450 events. All events remain in the saved game and exported backup.</div>':'');
 $$('#history-list [data-event-person]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.eventPerson)selectPerson(b.dataset.eventPerson)}));
}
function setTab(tab){currentTab=tab;$$('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab))});
 $('#tree-view').classList.toggle('hidden',tab!=='tree');$('#people-view').classList.toggle('hidden',tab!=='people');$('#history-view').classList.toggle('hidden',tab!=='history');
 if(tab==='tree'){needsFit=true;requestAnimationFrame(()=>layoutGraph())}if(tab==='people')renderPeople();if(tab==='history')renderHistory();
}
function render(){if(!state)return;renderStats();renderProfile();if(currentTab==='tree')requestAnimationFrame(layoutGraph);if(currentTab==='people')renderPeople();if(currentTab==='history')renderHistory();}
function advance(years,continuation=false){
 if(busy||state.pendingChoice||state.pendingSuccession)return;
 if(state.nextId>MAX_PEOPLE){toast('2,000-person prototype limit. Export your family; larger simulations are planned.');return}
 if(!continuation)state.remainingYears=0;
 busy=true;const before=state.events.length,peeps=persons().length;let passed=0;
 try{
  for(let i=0;i<years;i++){
   simulateOneYear();passed++;
   if(state.pendingSuccession){state.remainingYears=years-passed;break;}
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
function showModal(html){$('#modal-content').innerHTML=html;$('#modal-backdrop').classList.remove('hidden')}
function closeModal(){if(state?.pendingChoice||state?.pendingSuccession)return;$('#modal-backdrop').classList.add('hidden')}
function newWorldModal(){showModal(`<div class="eyebrow">THE BEGINNING OF EVERYTHING</div><h2>Begin a new legacy</h2><p>Start with one person, two parents, and a sibling. Every life that follows grows from this history.</p><label for="new-name">Founding character</label><input maxlength="50" id="new-name" class="field-input" value="Alex Morgan" placeholder="First and last name" /><label for="new-sex">Founding character</label><select id="new-sex" class="field-input"><option value="male">Male</option><option value="female">Female</option></select><label for="new-year">Starting year</label><input id="new-year" class="field-input" type="number" min="1800" max="2200" value="2026" /><div class="modal-warning">Creating a new world replaces the current active game. Export your family history first if you want to keep it.</div><div class="modal-actions"><button class="secondary" id="cancel-modal">Cancel</button><button class="primary" id="create-world">Create family →</button></div>`);
 $('#cancel-modal').onclick=closeModal;$('#create-world').onclick=()=>{let v=$('#new-name').value.trim(),y=Number($('#new-year').value);if(!v||!Number.isInteger(y)||y<1800||y>2200){toast('Enter a name and a starting year from 1800 to 2200.');return}newWorld(v,$('#new-sex').value,y);closeModal();saveSoon();setTab('tree');render();toast('A new family story has begun.');};}
function menuModal(){showModal(`<div class="eyebrow">LEGACY / WORLD SETTINGS</div><h2>Your family, your rules</h2><p>Saved automatically to this device. Export a JSON backup to protect your dynasty or move it elsewhere.</p><label for="realism-select">Simulation realism</label><select id="realism-select" class="field-input"><option value="casual" ${state.realism==='casual'?'selected':''}>Casual · Easier player choices</option><option value="realistic" ${state.realism==='realistic'?'selected':''}>Realistic · Probabilistic decisions</option><option value="strict" ${state.realism==='strict'?'selected':''}>Strict · More uncertainty</option></select><button class="menu-action primary" id="export-game">↓ Export family save (.json)</button><button class="menu-action" id="import-game">↑ Import family save (.json)</button><input type="file" accept=".json,application/json" class="file-input" id="import-file" /><button class="menu-action" id="save-game">✓ Save on this device now</button><button class="menu-action" id="new-from-menu">＋ Begin a new family</button><p class="modal-note">Realism settings affect gameplay decisions only. The current demographic model is a prototype and is not calibrated to scientific population data.</p><div class="modal-actions"><button class="secondary" id="close-menu">Close</button></div>`);
 $('#realism-select').onchange=e=>{state.realism=e.target.value;saveSoon();toast(`Realism: ${state.realism}.`)};
 $('#export-game').onclick=exportGame;$('#import-game').onclick=()=>$('#import-file').click();$('#import-file').onchange=handleImport;
 $('#save-game').onclick=()=>saveGame().then(ok=>toast(ok?'Family saved on this device.':'Storage unavailable; export a backup instead.'));
 $('#new-from-menu').onclick=newWorldModal;$('#close-menu').onclick=closeModal;}
function exportGame(){const data=JSON.stringify(state,null,2);const a=document.createElement('a');const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.href=url;a.download=`LEGACY_${state.familyName}_${state.year}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Exported family history backup.');}
function validImport(g){return !!(g&&g.version===VERSION&&Number.isInteger(g.year)&&g.year>=1800&&g.year<=3000&&g.people&&typeof g.people==='object'&&!Array.isArray(g.people)&&Array.isArray(g.events)&&g.selectedId&&g.people[g.selectedId]&&Object.keys(g.people).length<=100000&&g.events.length<=300000)}
async function handleImport(e){const file=e.target.files?.[0];if(!file)return;try{const g=JSON.parse(await file.text());if(!validImport(g))throw Error('Invalid or incompatible save');state=g;state.controlledId=state.controlledId||state.founderId||state.selectedId;closeModal();needsFit=true;currentTab='tree';setTab('tree');render();if(state.pendingSuccession)showSuccession();else if(state.pendingChoice)showLifeChoice();await saveGame();toast(`Restored the ${state.familyName} family.`)}catch(err){toast('Could not import this save file.')}e.target.value='';}
function openDB(){return new Promise(resolve=>{try{if(!('indexedDB' in window))return resolve(null);const r=indexedDB.open('legacy-family-save',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('worlds'))r.result.createObjectStore('worlds')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch(e){resolve(null)}})}
function storageGet(){try{return JSON.parse(localStorage.getItem('legacy-snapshot-v1')||'null')}catch(e){return null}}
function storageSet(){try{localStorage.setItem('legacy-snapshot-v1',JSON.stringify(state));return true}catch(e){return false}}
async function loadGame(){db=await openDB();if(db){try{const game=await new Promise((resolve,reject)=>{const t=db.transaction('worlds','readonly').objectStore('worlds').get('active');t.onsuccess=()=>resolve(t.result);t.onerror=()=>reject(t.error)});if(validImport(game))return game}catch(e){console.warn('IndexedDB read unavailable',e)}}const local=storageGet();return validImport(local)?local:null}
async function saveGame(){if(!state)return false;let success=false;if(db){try{success=await new Promise(resolve=>{const tx=db.transaction('worlds','readwrite');tx.objectStore('worlds').put(state,'active');tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)})}catch(e){console.warn('IndexedDB write unavailable',e)}}if(!success)success=storageSet();return success}
function saveSoon(){clearTimeout(saveHandle);saveHandle=setTimeout(()=>{saveGame().then(ok=>{if(!ok)toast('Could not auto-save. Export a backup from the menu.')})},450)}
function bind(){
 $$('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
 $$('.scope').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;$$('.scope').forEach(x=>x.classList.toggle('active',x.dataset.scope===scope));needsFit=true;layoutGraph()});
 $$('.mode-toggle button').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;saveSoon();render();toast(state.mode==='individual'?'Individual Control: follow a selected life.':'Family Control: direct any living relative.')});
 $$('.advance').forEach(b=>b.onclick=()=>advance(Number(b.dataset.years)));
 $('#zoom-in').onclick=()=>{camera.scale=Math.min(3,camera.scale*1.24);drawGraph()};
 $('#zoom-out').onclick=()=>{camera.scale=Math.max(.12,camera.scale/1.24);drawGraph()};
 $('#zoom-fit').onclick=()=>{fitScene();drawGraph()};
 $('#menu-btn').onclick=menuModal;$('#new-world-btn').onclick=newWorldModal;
 $('#people-search').addEventListener('input',renderPeople);
 $('#modal-backdrop').addEventListener('click',e=>{if(e.target.id==='modal-backdrop')closeModal()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
 let pointers=new Map(),dragStart=null,pinch=null;
 const getPoint=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);const pt=getPoint(e);pointers.set(e.pointerId,pt);if(pointers.size===1)dragStart={...pt,camX:camera.x,camY:camera.y,moved:false};if(pointers.size===2){const a=[...pointers.values()];pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),scale:camera.scale};dragStart=null}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const pt=getPoint(e);pointers.set(e.pointerId,pt);
 if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()];camera.scale=Math.max(.12,Math.min(3,pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));drawGraph()}
 else if(dragStart){const dx=pt.x-dragStart.x,dy=pt.y-dragStart.y;if(Math.hypot(dx,dy)>6)dragStart.moved=true;if(dragStart.moved){camera.x=dragStart.camX+dx;camera.y=dragStart.camY+dy;drawGraph()}}
 });
 canvas.addEventListener('pointerup',e=>{const pt=getPoint(e);const d=dragStart;pointers.delete(e.pointerId);if(!pointers.size){if(d&&!d.moved){const wx=(pt.x-camera.x)/camera.scale,wy=(pt.y-camera.y)/camera.scale;const hit=scene.slice().reverse().find(n=>wx>=n.x-n.w/2&&wx<=n.x+n.w/2&&wy>=n.y-n.h/2&&wy<=n.y+n.h/2);if(hit)selectPerson(hit.p.id)}dragStart=null;pinch=null}else if(pointers.size===1){dragStart=null;pinch=null}});
 canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);dragStart=null;pinch=null});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const pt=getPoint(e),wx=(pt.x-camera.x)/camera.scale,wy=(pt.y-camera.y)/camera.scale;camera.scale=Math.max(.12,Math.min(3,camera.scale*(e.deltaY<0?1.1:.9)));camera.x=pt.x-wx*camera.scale;camera.y=pt.y-wy*camera.scale;drawGraph()},{passive:false});
 const ro=new ResizeObserver(()=>{if(currentTab==='tree'&&state){if(needsFit)fitScene();drawGraph()}});ro.observe($('#canvas-wrap'));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveGame()});
}
async function init(){state=await loadGame();if(!state){newWorld();await saveGame()}state.controlledId=state.controlledId||state.founderId||state.selectedId;bind();render();if(state.pendingSuccession)showSuccession();else if(state.pendingChoice)showLifeChoice();if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}
init().catch(e=>{console.error(e);$('#tree-subhead').textContent='Unable to start the simulation. Please reload.'});
// Integration-test API (not required for gameplay).
window.LEGACY_TEST={getState:()=>state,advance,selectPerson,decide,newWorld,saveGame,loadGame,render,validImport,maybeLifeChoice,resolveLifeChoice};
})();
