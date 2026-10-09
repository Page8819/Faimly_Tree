'use strict';
/* Fictional medical simulation; rates are gameplay parameters, NOT clinical risk estimates. */
(function(root){
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const C={
  asthma:{name:'Asthma',min:3,max:80,rate:.006,chronic:true,initial:1,lifeRisk:.003,care:'medication'},
  hypertension:{name:'High blood pressure',min:25,max:110,rate:.012,chronic:true,initial:1,lifeRisk:.002,care:'medication'},
  diabetes:{name:'Type 2 diabetes',min:30,max:110,rate:.005,chronic:true,initial:1,lifeRisk:.007,care:'medication'},
  arthritis:{name:'Osteoarthritis',min:43,max:110,rate:.008,chronic:true,initial:1,lifeRisk:0,care:'rehabilitation'},
  anxiety:{name:'Anxiety disorder',min:12,max:90,rate:.008,chronic:true,initial:1,lifeRisk:0,care:'therapy'},
  depression:{name:'Depressive disorder',min:14,max:90,rate:.006,chronic:true,initial:1,lifeRisk:0,care:'therapy'},
  heart:{name:'Coronary heart disease',min:40,max:110,rate:.004,chronic:true,initial:2,lifeRisk:.026,care:'specialist'},
  stroke:{name:'Stroke',min:45,max:110,rate:.002,chronic:false,initial:3,lifeRisk:.075,care:'emergency'},
  cancer:{name:'Cancer',min:18,max:110,rate:.003,chronic:true,initial:2,lifeRisk:.045,care:'specialist'},
  copd:{name:'Chronic lung disease',min:45,max:110,rate:.003,chronic:true,initial:1,lifeRisk:.022,care:'specialist'},
  dementia:{name:'Dementia',min:65,max:110,rate:.005,chronic:true,initial:1,lifeRisk:.025,care:'specialist'},
  infection:{name:'Respiratory infection',min:0,max:110,rate:.065,chronic:false,initial:1,lifeRisk:.004,care:'primary'},
  pneumonia:{name:'Pneumonia',min:0,max:110,rate:.009,chronic:false,initial:2,lifeRisk:.035,care:'primary'},
  fracture:{name:'Bone fracture',min:0,max:110,rate:.009,chronic:false,initial:2,lifeRisk:.001,care:'rehabilitation'}
 };
 const careTypes={
  checkup:{label:'Preventive checkup',cost:220,description:'Screen for previously unnoticed conditions and discuss general health.'},
  primary:{label:'Primary care visit',cost:480,description:'Assess and treat common ailments or manage ongoing care.'},
  specialist:{label:'Specialist consultation',cost:1400,description:'Arrange advanced evaluation and treatment for serious conditions.'},
  emergency:{label:'Emergency treatment',cost:4400,description:'Rapidly treat a severe illness or injury.'},
  therapy:{label:'Mental health care',cost:840,description:'Counseling and continuing support for mental health conditions.'},
  medication:{label:'Medication review',cost:400,description:'Manage appropriate prescriptions for existing conditions.'}
 };
 function ensure(p){
  if(!p.medical||typeof p.medical!=='object')p.medical={conditions:[],history:[],insurance:'standard',lastYear:null,lastVisit:{}};
  const m=p.medical;
  if(!Array.isArray(m.conditions))m.conditions=[];
  if(!Array.isArray(m.history))m.history=[];
  if(!m.lastVisit||typeof m.lastVisit!=='object')m.lastVisit={};
  if(!['none','standard','comprehensive'].includes(m.insurance))m.insurance='standard';
  return m;
 }
 function conditions(p){return ensure(p).conditions.filter(c=>c.status!=='resolved').map(c=>({...c,name:C[c.id]?.name||c.id}));}
 function add(p,id,year,diagnosed=false){
  const data=C[id],m=ensure(p);
  if(!data||m.conditions.some(c=>c.id===id&&c.status==='active'))return null;
  const entry={id,since:year,diagnosed,stage:data.initial,treated:false,status:'active'};
  m.conditions.push(entry);return entry;
 }
 function discover(m,rnd){
  for(const c of m.conditions){
   if(c.status==='active'&&!c.diagnosed&&rnd()<.90)c.diagnosed=true;
  }
 }
 function care(p,type,year,rnd=()=>.5){
  const m=ensure(p),kind=careTypes[type];
  if(!kind)return {ok:false,message:'Unknown medical service.'};
  if(p.deathYear)return {ok:false,message:'This person is no longer alive.'};
  if(m.lastVisit[type]===year)return {ok:false,message:'This service has already been used this year.'};
  m.lastVisit[type]=year;
  const coverage=m.insurance==='comprehensive'?.2:m.insurance==='standard'?.5:1;
  const cost=Math.round(kind.cost*coverage);
  p.wealth-=cost;
  if(type==='checkup'||type==='primary'||type==='specialist'||type==='emergency')discover(m,rnd);
  let helped=0;
  for(const c of m.conditions){
   const spec=C[c.id];if(c.status!=='active'||!spec)continue;
   const compatible=type===spec.care||type==='emergency'||(type==='primary'&&['primary','medication'].includes(spec.care));
   if(!compatible)continue;
   const gain=type==='emergency'?.96:type===spec.care?.88:.65;
   if(rnd()<gain){c.treated=true;c.stage=Math.max(1,c.stage-1);helped++;}
  }
  const n=p.needs;
  if(n){
   if(type==='checkup')n.physical=clamp(n.physical+1);
   else if(type==='therapy'){n.mental=clamp(n.mental+6);n.stress=clamp(n.stress-8);}
   else n.physical=clamp(n.physical+(helped?4:1));
  }
  const message=kind.label+' cost $'+cost.toLocaleString()+'. '+(helped?helped+' condition(s) received effective treatment.':'Evaluation completed; no immediate improvement recorded.');
  m.history.push({year,type,message});if(m.history.length>35)m.history.shift();
  return {ok:true,cost,helped,message};
 }
 function annual(p,age,year,rnd=()=>.5,parents=[]){
  const m=ensure(p);
  if(m.lastYear===year)return {events:[],cause:null};
  m.lastYear=year;
  const events=[],stats=p.needs,physical=stats?.physical??70;
  // Annual probabilities intentionally simplified: no race/sex-based causal shortcuts.
  for(const [id,spec] of Object.entries(C)){
   if(age<spec.min||age>spec.max||m.conditions.some(c=>c.id===id&&c.status==='active'))continue;
   const parentAffected=parents.some(parent=>parent&&ensure(parent).conditions.some(c=>c.id===id&&c.status==='active'));
   const heredity=parentAffected&&spec.chronic?1.25:1;
   const ageFactor=age>60&&['heart','hypertension','cancer','dementia','diabetes'].includes(id)?1.55:1;
   const chance=spec.rate*heredity*ageFactor*(physical<30?1.13:1);
   if(rnd()<chance){
    const entry=add(p,id,year,rnd()<.43);
    if(entry){events.push({type:'health',message:(entry.diagnosed?'Diagnosed with ':'Developed symptoms consistent with ')+spec.name+'.'});}
   }
  }
  let cause=null;
  for(const c of m.conditions){
   if(c.status!=='active')continue;
   const spec=C[c.id];if(!spec)continue;
   const treated=c.treated;
   if(!spec.chronic&&year>c.since){
    if(rnd()<(treated?.94:.76)){c.status='resolved';events.push({type:'health',message:'Recovered from '+spec.name+'.'});continue;}
   }
   if(spec.chronic&&rnd()<(treated?.035:.12))c.stage=clamp(c.stage+1,1,4);
   const hazard=spec.lifeRisk*(c.stage/2)*(treated?.28:1)*(age>75?1.2:1);
   if(hazard>0&&rnd()<hazard){cause='Complications of '+spec.name.toLowerCase();break;}
   if(stats){if(['depression','anxiety'].includes(c.id))stats.mental=clamp(stats.mental-(treated?0.3:1.2));else stats.physical=clamp(stats.physical-(treated?.25:1));}
   c.treated=treated&&rnd()<.85;
  }
  return {events,cause};
 }
 function current(p){const m=ensure(p),active=conditions(p);return {insurance:m.insurance,active,history:m.history.slice(-12),undiagnosed:active.filter(c=>!c.diagnosed).length};}
 root.LEGACY_MEDICINE={catalog:C,services:careTypes,ensure,add,conditions,care,annual,current};
})(typeof window==='undefined'?globalThis:window);
