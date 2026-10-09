'use strict';
/* Pathway-oriented education; entry rules and tuition are fictional gameplay approximations. */
(function(root){
 const programs={
  ged:{name:'GED / high-school equivalency',years:1,cost:900,minAge:16,requires:[],grants:'hs',level:1,category:'Foundation'},
  trade:{name:'Trade apprenticeship',years:3,cost:3500,minAge:17,requires:['hs'],grants:'trade',level:2,category:'Skilled trades'},
  cdl:{name:'Commercial driving license',years:1,cost:2400,minAge:21,requires:['hs'],grants:'cdl',level:2,category:'Transport'},
  culinary:{name:'Culinary certificate',years:1,cost:2400,minAge:17,requires:['hs'],grants:'culinary',level:2,category:'Hospitality'},
  it:{name:'IT support certification',years:1,cost:1900,minAge:17,requires:['hs'],grants:'it',level:2,category:'Technology'},
  emt:{name:'Emergency medical training',years:1,cost:2800,minAge:18,requires:['hs'],grants:'emt',level:2,category:'Healthcare'},
  associate:{name:'Associate degree',years:2,cost:8500,minAge:17,requires:['hs'],grants:'associate',level:2,category:'College'},
  bachelor:{name:"Bachelor's degree",years:4,cost:30000,minAge:17,requires:['hs'],grants:'bachelor',level:3,category:'College'},
  nursing:{name:'Nursing qualification',years:3,cost:24000,minAge:18,requires:['hs'],grants:'nursing',level:3,category:'Healthcare'},
  engineer:{name:'Engineering degree',years:4,cost:37000,minAge:18,requires:['hs'],grants:'engineer',level:3,category:'Engineering'},
  master:{name:"Master's degree",years:2,cost:19000,minAge:21,requires:['bachelor'],grants:'master',level:4,category:'Graduate'},
  law:{name:'Law school and bar',years:3,cost:46000,minAge:21,requires:['bachelor'],grants:'law',level:4,category:'Law'},
  medicine:{name:'Medical school and residency',years:7,cost:96000,minAge:22,requires:['bachelor'],grants:'doctor',level:4,category:'Medicine'},
  doctorate:{name:'Research doctorate',years:5,cost:35000,minAge:21,requires:['bachelor'],grants:'doctorate',level:4,category:'Research'}
 };
 function ensure(p){
  if(!p.schooling||typeof p.schooling!=='object'){
   const level=Number(p.education)||0;
   p.schooling={credentials:level>=4?['hs','associate','bachelor','master']:level===3?['hs','associate','bachelor']:level===2?['hs','associate']:level===1?['hs']:[],
   current:null,history:[],lastYear:null};
  }
  const s=p.schooling;
  if(!Array.isArray(s.credentials))s.credentials=[];
  if(!Array.isArray(s.history))s.history=[];
  if(!s.current||typeof s.current!=='object')s.current=null;
  return s;
 }
 const has=(p,id)=>ensure(p).credentials.includes(id);
 function canEnroll(p,id,age){
  const c=programs[id],s=ensure(p);
  if(!c)return {ok:false,reason:'Unknown program.'};
  if(p.deathYear)return {ok:false,reason:'This person is deceased.'};
  if(age<c.minAge)return {ok:false,reason:'Minimum enrollment age: '+c.minAge+'.'};
  if(s.current)return {ok:false,reason:'Already enrolled in '+programs[s.current.id]?.name+'.'};
  if(has(p,c.grants))return {ok:false,reason:'Credential already earned.'};
  const missing=c.requires.filter(r=>!has(p,r));if(missing.length)return {ok:false,reason:'Requires '+missing.join(', ')+'.'};
  return {ok:true,reason:'Eligible'};
 }
 function enroll(p,id,age,year){
  const possible=canEnroll(p,id,age);if(!possible.ok)return {ok:false,message:possible.reason};
  const s=ensure(p),c=programs[id];
  const upfront=Math.min(Math.max(0,p.wealth),Math.round(c.cost*.45));
  const debt=c.cost-upfront;
  p.wealth-=upfront;
  if(!p.lifePath||typeof p.lifePath!=='object')p.lifePath={};
  p.lifePath.educationDebt=(Number(p.lifePath.educationDebt)||0)+debt;
  s.current={id,started:year,progress:0,years:c.years,paid:upfront,financed:debt};
  s.history.push({year,event:'enrolled',id});return {ok:true,message:'Enrolled in '+c.name+'. '+c.years+' year(s) expected; $'+upfront.toLocaleString()+' paid and $'+debt.toLocaleString()+' financed.'};
 }
 function annual(p,age,year,rnd=()=>.5){
  const s=ensure(p),events=[];if(s.lastYear===year)return events;s.lastYear=year;
  if(age===18&&!has(p,'hs')&&!s.current&&rnd()<.82){
   s.credentials.push('hs');p.education=Math.max(1,p.education||0);
   s.history.push({year,event:'completed',id:'ged'});events.push('Completed secondary education.');
  }
  const current=s.current;if(!current)return events;
  // Serious untreated illness may interrupt schooling. A single annual update advances at most once.
  const conditionCount=p.medical?.conditions?.filter(c=>c.status==='active'&&c.stage>=3&&!c.treated).length||0;
  if(conditionCount&&rnd()<.35){events.push('Study progress was delayed by illness.');return events;}
  current.progress++;
  if(current.progress>=current.years){
   const c=programs[current.id];if(c&&!s.credentials.includes(c.grants))s.credentials.push(c.grants);
   if(c)p.education=Math.max(p.education||0,c.level);
   if(p.lifePath){p.lifePath.skills=Math.min(12,(p.lifePath.skills||0)+1);}
   s.history.push({year,event:'completed',id:current.id});
   events.push('Completed '+(c?.name||'a training program')+'.');
   s.current=null;
  }
  if(s.history.length>45)s.history.splice(0,s.history.length-45);
  return events;
 }
 function details(p,age){
  const s=ensure(p);
  return {credentials:s.credentials.map(id=>({id,name:programs[id]?.name||({'hs':'High school','master':"Master's degree"}[id]||id)})),current:s.current?{...s.current,name:programs[s.current.id]?.name||s.current.id}:null,
   programs:Object.entries(programs).map(([id,c])=>({id,...c,eligibility:canEnroll(p,id,age)})),history:s.history.slice(-20)};
 }
 root.LEGACY_EDUCATION={programs,ensure,has,canEnroll,enroll,annual,details};
})(typeof window==='undefined'?globalThis:window);
