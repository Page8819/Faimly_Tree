'use strict';
/* Occupational ladder for gameplay. Salary figures are illustrative, not verified live wage quotes. */
(function(root){
 const jobs={
  service:{name:'Retail associate',sector:'Retail',salary:32000,minAge:16,requires:[],xp:0},
  supervisor:{name:'Retail supervisor',sector:'Retail',salary:49000,minAge:18,requires:[],xp:3},
  store_manager:{name:'Store manager',sector:'Retail',salary:74000,minAge:21,requires:[],xp:6},
  carpenter:{name:'Carpenter',sector:'Trades',salary:57000,minAge:18,requires:['trade'],xp:0},
  electrician:{name:'Electrician',sector:'Trades',salary:67000,minAge:18,requires:['trade'],xp:0},
  plumber:{name:'Plumber',sector:'Trades',salary:65000,minAge:18,requires:['trade'],xp:0},
  hvac:{name:'HVAC technician',sector:'Trades',salary:62000,minAge:18,requires:['trade'],xp:0},
  construction_manager:{name:'Construction manager',sector:'Trades',salary:98000,minAge:25,requires:['trade'],xp:6},
  driver:{name:'Commercial truck driver',sector:'Transport',salary:61000,minAge:21,requires:['cdl'],xp:0},
  chef:{name:'Chef',sector:'Hospitality',salary:59000,minAge:18,requires:['culinary'],xp:0},
  it:{name:'IT support specialist',sector:'Technology',salary:61000,minAge:18,requires:['it'],xp:0},
  software:{name:'Software developer',sector:'Technology',salary:116000,minAge:20,requires:['bachelor'],xp:0},
  engineer:{name:'Engineer',sector:'Engineering',salary:108000,minAge:22,requires:['engineer'],xp:0},
  nurse:{name:'Registered nurse',sector:'Healthcare',salary:88000,minAge:21,requires:['nursing'],xp:0},
  emt:{name:'Emergency medical technician',sector:'Healthcare',salary:42000,minAge:18,requires:['emt'],xp:0},
  physician:{name:'Physician',sector:'Healthcare',salary:194000,minAge:26,requires:['doctor'],xp:0},
  lawyer:{name:'Lawyer',sector:'Legal',salary:139000,minAge:24,requires:['law'],xp:0},
  teacher:{name:'Teacher',sector:'Education',salary:62000,minAge:21,requires:['bachelor'],xp:0},
  accountant:{name:'Accountant',sector:'Business',salary:78000,minAge:21,requires:['bachelor'],xp:0},
  researcher:{name:'Research scientist',sector:'Science',salary:119000,minAge:26,requires:['doctorate'],xp:0},
  office:{name:'Office administrator',sector:'Business',salary:45000,minAge:18,requires:['hs'],xp:0},
  entrepreneur:{name:'Small business owner',sector:'Business',salary:54000,minAge:18,requires:[],xp:0}
 };
 const q=(p,id)=>!jobs[id]?.requires?.length||jobs[id].requires.every(r=>p.schooling?.credentials?.includes(r));
 function ensure(p){
  if(!p.career||typeof p.career!=='object'){
   const experience=Math.max(0,Math.min(20,Math.max(0,(Number(p.jobLevel)||0)-1)*3));
   const level=Number(p.jobLevel)||0;
   p.career={jobId:level>=4?'store_manager':level===3?'supervisor':level===2?'office':level===1?'service':null,
    grade:level>=4?3:1,experience,tenure:0,performance:50,history:[],lastYear:null,lastApplication:null};
  }
  const c=p.career;
  if(!Array.isArray(c.history))c.history=[];
  for(const [key,val] of [['grade',1],['experience',0],['tenure',0],['performance',50]])if(!Number.isFinite(c[key]))c[key]=val;
  return c;
 }
 function canApply(p,id,age){
  const job=jobs[id],c=ensure(p);
  if(!job)return {ok:false,reason:'Unknown occupation.'};
  if(p.deathYear)return {ok:false,reason:'Character is deceased.'};
  if(age<job.minAge)return {ok:false,reason:'Minimum age '+job.minAge+'.'};
  if(!q(p,id))return {ok:false,reason:'Requires '+job.requires.join(', ')+'.'};
  if(c.experience<job.xp)return {ok:false,reason:'Needs '+job.xp+' years of work experience.'};
  if(c.jobId===id)return {ok:false,reason:'Currently employed here.'};
  if(p.retired)return {ok:false,reason:'Must return from retirement first.'};
  return {ok:true,reason:'Eligible'};
 }
 function income(p){
  const c=ensure(p),job=jobs[c.jobId];
  if(!job||p.retired)return 0;
  const grade=Math.max(1,Math.min(5,c.grade));
  const seniority=Math.min(.22,c.tenure*.009);
  const performance=(Math.max(0,Math.min(100,c.performance))-50)*.001;
  const base=Math.round(job.salary*(1+(grade-1)*.1+seniority+performance));
  const illness=p.medical?.conditions?.some(x=>x.status==='active'&&x.stage>=3&&!x.treated);
  return Math.max(0,Math.round(base*(illness?.68:1)));
 }
 function apply(p,id,age,year,rnd=()=>.5){
  const chk=canApply(p,id,age),c=ensure(p);
  if(!chk.ok)return {ok:false,message:chk.reason};
  if(c.lastApplication===year)return {ok:false,message:'Already applied for another occupation this year.'};
  c.lastApplication=year;
  const job=jobs[id],qualified=p.schooling?.credentials?.length||0;
  const odds=Math.max(.33,Math.min(.93,.62+(qualified-2)*.035+(c.performance-50)*.003));
  if(rnd()>odds){
   c.history.push({year,event:'application declined',id});
   return {ok:false,message:'Application for '+job.name+' was declined. Try another year.'};
  }
  const before=c.jobId;
  c.jobId=id;c.grade=1;c.tenure=0;p.jobLevel=1;
  c.history.push({year,event:'hired',id,previous:before});
  if(c.history.length>40)c.history.shift();
  return {ok:true,message:'Hired as '+job.name+'. Estimated starting pay '+Math.round(job.salary).toLocaleString('en-US')+' per year.'};
 }
 function promote(p,year,rnd=()=>0){
  const c=ensure(p);if(!c.jobId||p.retired)return {ok:false,message:'Not currently employed.'};
  if(c.grade>=5)return {ok:false,message:'Already at the top career grade.'};
  if(rnd()>.85)return {ok:false,message:'Promotion not granted this year.'};
  c.grade++;c.performance=Math.min(100,c.performance+4);p.jobLevel=Math.min(6,c.grade+1);
  c.history.push({year,event:'promoted',id:c.jobId,grade:c.grade});
  return {ok:true,message:'Promoted to grade '+c.grade+' as '+jobs[c.jobId].name+'.'};
 }
 function annual(p,age,year,rnd=()=>.5,autonomous=false){
  const c=ensure(p),events=[];if(c.lastYear===year)return events;c.lastYear=year;
  if(age<16||p.retired||p.deathYear)return events;
  if(c.jobId){
   c.tenure++;c.experience++;
   c.performance=Math.max(15,Math.min(95,c.performance+Math.round((rnd()-.5)*11)+(p.needs?.agency>65?1:0)));
   if(c.grade<5&&c.tenure>2&&rnd()<.038+(c.performance-50)*.00065){
    const r=promote(p,year,()=>0);if(r.ok)events.push(r.message);
   }
   const ill=p.medical?.conditions?.some(x=>x.status==='active'&&x.stage>=3&&!x.treated);
   if(ill&&rnd()<.045){c.jobId=null;c.grade=1;p.jobLevel=0;events.push('Left work after serious illness.');}
   else if(rnd()<.008){c.jobId=null;c.grade=1;p.jobLevel=0;events.push('Lost their job after a workplace restructuring.');}
  }else if(autonomous){
   c.experience=Math.max(0,c.experience);
  }
  // NPCs can pursue realistic career opportunities with earned qualifications.
  if(autonomous&&age>=18&&age<66&&rnd()<.05){
   const currentPay=c.jobId?jobs[c.jobId].salary:0;
   const possible=Object.keys(jobs).filter(id=>canApply(p,id,age).ok&&jobs[id].salary>currentPay*1.12);
   if(possible.length){const id=possible[Math.floor(rnd()*possible.length)];c.lastApplication=null;
    const r=apply(p,id,age,year,rnd);if(r.ok)events.push(r.message);}
  }
  if(c.history.length>40)c.history.splice(0,c.history.length-40);
  return events;
 }
 function details(p,age){
  const c=ensure(p);
  return {current:c.jobId?{id:c.jobId,...jobs[c.jobId]}:null,grade:c.grade,experience:c.experience,tenure:c.tenure,performance:c.performance,
   salary:income(p),history:c.history.slice(-15),
   opportunities:Object.entries(jobs).map(([id,j])=>({id,...j,eligibility:canApply(p,id,age)}))};
 }
 root.LEGACY_CAREERS={jobs,ensure,canApply,income,apply,promote,annual,details};
})(typeof window==='undefined'?globalThis:window);
