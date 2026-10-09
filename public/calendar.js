'use strict';
/* LEGACY World Calendar. Proleptic Gregorian dates; civil time rendered with IANA Intl time zones.
   Public holidays and occupation shifts are baseline simulation rules, not individual employment contracts.
   Future DST/holiday law is projected using current time-zone data and known rules. */
(function(root){
 const DAY=86400000, HOUR=3600000;
 const LOCATIONS={
  'New York':['America/New_York','US','NY'],Boston:['America/New_York','US','MA'],
  Philadelphia:['America/New_York','US','PA'],Chicago:['America/Chicago','US','IL'],
  Denver:['America/Denver','US','CO'],Atlanta:['America/New_York','US','GA'],
  Seattle:['America/Los_Angeles','US','WA'],Austin:['America/Chicago','US','TX'],
  Portland:['America/Los_Angeles','US','OR'],'San Francisco':['America/Los_Angeles','US','CA'],
  Nashville:['America/Chicago','US','TN'],Minneapolis:['America/Chicago','US','MN'],
  Raleigh:['America/New_York','US','NC'],'San Diego':['America/Los_Angeles','US','CA'],
  London:['Europe/London','GB','ENG'],Manchester:['Europe/London','GB','ENG'],
  Toronto:['America/Toronto','CA','ON'],Vancouver:['America/Vancouver','CA','BC'],
  Berlin:['Europe/Berlin','DE','BE'],Paris:['Europe/Paris','FR','IDF'],
  Tokyo:['Asia/Tokyo','JP','TK'],Sydney:['Australia/Sydney','AU','NSW'],
  Melbourne:['Australia/Melbourne','AU','VIC'],Mumbai:['Asia/Kolkata','IN','MH'],
  Delhi:['Asia/Kolkata','IN','DL']
 };
 const utc=(y,m,d)=>Date.UTC(y,m-1,d,12); // noon avoids local DST date boundaries
 const iso=(y,m,d)=>String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 const parse=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s));if(!m)return null;const y=+m[1],mo=+m[2],d=+m[3];return y>=1900&&y<=9998&&mo>=1&&mo<=12&&d>=1&&d<=daysInMonth(y,mo)?{year:y,month:mo,day:d}:null};
 const leap=y=>y%4===0&&(y%100!==0||y%400===0);
 const daysInMonth=(y,m)=>[31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]||0;
 const dayOfYear=(y,m,d)=>Math.round((utc(y,m,d)-utc(y,1,1))/DAY)+1;
 const weekday=(y,m,d)=>new Date(utc(y,m,d)).getUTCDay();
 const shiftDays=(date,days)=>{const a=parse(date);if(!a||!Number.isFinite(days))throw Error('Invalid calendar day');const t=new Date(utc(a.year,a.month,a.day)+Math.round(days)*DAY);return iso(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate())};
 const shiftMonths=(date,amount)=>{const a=parse(date);if(!a||!Number.isFinite(amount))throw Error('Invalid calendar month');const base=a.year*12+a.month-1+Math.trunc(amount),y=Math.floor(base/12),m=((base%12)+12)%12+1;if(y<1900||y>9998)throw Error('Calendar year out of range');return iso(y,m,Math.min(a.day,daysInMonth(y,m)))};
 const shiftYears=(date,years)=>shiftMonths(date,Math.trunc(years)*12);
 const nth=(y,m,day,n)=>{const first=weekday(y,m,1);return iso(y,m,1+(day-first+7)%7+(n-1)*7)};
 const last=(y,m,day)=>{const final=daysInMonth(y,m);return iso(y,m,final-(weekday(y,m,final)-day+7)%7)};
 const offset=(date,days)=>shiftDays(date,days);
 const easter=y=>{const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return iso(y,month,day)};
 const observedUS=(y,m,d)=>{const w=weekday(y,m,d),base=iso(y,m,d);return w===6?shiftDays(base,-1):w===0?shiftDays(base,1):base};
 function holidaysFor(y,country='US',region=''){
  const holidays=new Map();
  const add=(date,name)=>{if(!holidays.has(date))holidays.set(date,name)};
  const fixed=(month,day,name,observe='')=>{
   const exact=iso(y,month,day);add(exact,name);
   if(observe==='US'){const substitute=observedUS(y,month,day);if(substitute!==exact)add(substitute,name+' (observed)');}
   if(observe==='MON'){
    const w=weekday(y,month,day);
    if(w===6||w===0)add(shiftDays(exact,w===6?2:1),name+' (observed)');
   }
  };
  const e=easter(y);
  if(country==='US'){
   fixed(1,1,"New Year's Day",'US');add(nth(y,1,1,3),'Martin Luther King Jr. Day');
   add(nth(y,2,1,3),"Washington's Birthday");add(last(y,5,1),'Memorial Day');
   fixed(6,19,'Juneteenth','US');fixed(7,4,'Independence Day','US');
   add(nth(y,9,1,1),'Labor Day');add(nth(y,10,1,2),'Columbus Day / Indigenous Peoples Day');
   fixed(11,11,'Veterans Day','US');add(nth(y,11,4,4),'Thanksgiving');
   fixed(12,25,'Christmas Day','US');
  }else if(country==='GB'){
   fixed(1,1,"New Year's Day",'MON');add(offset(e,-2),'Good Friday');add(offset(e,1),'Easter Monday');
   add(nth(y,5,1,1),'Early May bank holiday');add(last(y,5,1),'Spring bank holiday');
   add(last(y,8,1),'Summer bank holiday');
   fixed(12,25,'Christmas Day');fixed(12,26,'Boxing Day');
   // A substitute bank holiday is the next free weekday, not necessarily the next Monday.
   for(const [m,d,name] of [[12,25,'Christmas Day'],[12,26,'Boxing Day']]){
    const w=weekday(y,m,d);if(w===0||w===6){
     let candidate=shiftDays(iso(y,m,d),1);
     while(weekday(+candidate.slice(0,4),+candidate.slice(5,7),+candidate.slice(8,10))%6===0||holidays.has(candidate))candidate=shiftDays(candidate,1);
     add(candidate,name+' (substitute day)');
    }
   }
  }else if(country==='CA'){
   fixed(1,1,"New Year's Day",'MON');add(nth(y,2,1,3),'Family Day (regional)');
   add(offset(e,-2),'Good Friday');add(shiftDays(iso(y,5,25),-((weekday(y,5,25)+6)%7+1)),'Victoria Day');
   fixed(7,1,'Canada Day','MON');add(nth(y,9,1,1),'Labour Day');fixed(9,30,'National Day for Truth and Reconciliation','MON');
   add(nth(y,10,1,2),'Thanksgiving');fixed(11,11,'Remembrance Day','MON');
   fixed(12,25,'Christmas Day','MON');fixed(12,26,'Boxing Day','MON');
  }else if(country==='DE'){
   fixed(1,1,"New Year's Day");add(offset(e,-2),'Good Friday');add(offset(e,1),'Easter Monday');
   fixed(5,1,'Labour Day');add(offset(e,39),'Ascension Day');add(offset(e,50),'Whit Monday');
   fixed(10,3,'German Unity Day');fixed(12,25,'Christmas Day');fixed(12,26,'Second Christmas Day');
  }else if(country==='FR'){
   fixed(1,1,"New Year's Day");add(offset(e,1),'Easter Monday');
   fixed(5,1,'Labour Day');fixed(5,8,'Victory Day');add(offset(e,39),'Ascension Day');add(offset(e,50),'Whit Monday');
   fixed(7,14,'Bastille Day');fixed(8,15),'Assumption Day';
   fixed(11,1,'All Saints Day');fixed(11,11,'Armistice Day');fixed(12,25,'Christmas Day');
  }else if(country==='JP'){
   fixed(1,1,"New Year's Day");add(nth(y,1,1,2),'Coming of Age Day');
   fixed(2,11,'National Foundation Day','MON');fixed(2,23,"Emperor's Birthday",'MON');
   fixed(3,20,'Vernal Equinox (approx.)');fixed(4,29,'Showa Day');
   fixed(5,3,'Constitution Memorial Day');fixed(5,4,'Greenery Day');fixed(5,5,"Children's Day");
   add(nth(y,7,1,3),'Marine Day');fixed(8,11,'Mountain Day');
   add(nth(y,9,1,3),'Respect for the Aged Day');fixed(9,23,'Autumnal Equinox (approx.)');
   add(nth(y,10,1,2),'Sports Day');fixed(11,3,'Culture Day');fixed(11,23,'Labour Thanksgiving Day');
  }else if(country==='AU'){
   fixed(1,1,"New Year's Day",'MON');fixed(1,26,'Australia Day','MON');
   add(offset(e,-2),'Good Friday');add(offset(e,1),'Easter Monday');fixed(4,25,'ANZAC Day');
   add(nth(y,6,1,2),"King's Birthday (regional)");fixed(12,25,'Christmas Day','MON');fixed(12,26,'Boxing Day','MON');
  }else if(country==='IN'){
   fixed(1,26,'Republic Day');fixed(8,15,'Independence Day');fixed(10,2,'Gandhi Jayanti');
  }
  return holidays;
 }
 const holidayCache=new Map();
 function holiday(date,city='New York'){
  const parsed=parse(date);if(!parsed)return null;
  const [,country='US',region='NY']=LOCATIONS[city]||LOCATIONS['New York'];
  let matched=null;
  for(const y of [parsed.year-1,parsed.year,parsed.year+1]){
   const key=country+':'+region+':'+y;
   if(!holidayCache.has(key)){if(holidayCache.size>100)holidayCache.clear();holidayCache.set(key,holidaysFor(y,country,region));}
   matched=holidayCache.get(key).get(date);
   if(matched)break;
  }
  return matched||null;
 }
 const zones=new Map();
 function localParts(instant,zone='America/New_York'){
  if(!zones.has(zone))zones.set(zone,new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short',timeZoneName:'short'}));
  const parts=Object.fromEntries(zones.get(zone).formatToParts(new Date(instant)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:iso(+parts.year,+parts.month,+parts.day),year:+parts.year,month:+parts.month,day:+parts.day,
   minutes:+parts.hour*60+(+parts.minute),weekday:parts.weekday,abbreviation:parts.timeZoneName||zone};
 }
 function instantFor(date,minutes,zone){
  const p=parse(date);if(!p)throw Error('Invalid local calendar date');
  const desired=Date.UTC(p.year,p.month-1,p.day,0,Math.trunc(minutes));
  let time=desired;
  for(let i=0;i<5;i++){
   const actual=localParts(time,zone);
   const z=Date.UTC(actual.year,actual.month-1,actual.day,0,actual.minutes);
   const delta=desired-z;
   if(delta===0)break;
   time+=delta;
  }
  return time;
 }
 function cityInfo(city){const [zone,country,region]=LOCATIONS[city]||LOCATIONS['New York'];return {city,zone,country,region};}
 function ensure(state){
  if(!state.calendar||typeof state.calendar!=='object')state.calendar={date:iso(state.year||2026,1,1),minutes:9*60,daysElapsed:0};
  const c=state.calendar;
  if(!parse(c.date))c.date=iso(state.year||2026,1,1);
  if(!Number.isFinite(c.minutes)||c.minutes<0||c.minutes>=1440)c.minutes=9*60;
  if(!Number.isFinite(c.daysElapsed)||c.daysElapsed<0)c.daysElapsed=0;
  if(!Array.isArray(c.dailyJournal))c.dailyJournal=[];
  return c;
 }
 function dateLabel(date){const p=parse(date);if(!p)return '';
  const month=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(utc(p.year,p.month,p.day)));
  const suffix=p.day%100>=11&&p.day%100<=13?'th':p.day%10===1?'st':p.day%10===2?'nd':p.day%10===3?'rd':'th';
  return month+' • '+p.day+suffix+' • '+p.year;
 }
 function weekdayLabel(date){const p=parse(date);return p?new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(utc(p.year,p.month,p.day))):'';}
 function masterZone(state){return cityInfo(state.people?.[state.controlledId]?.city||'New York').zone;}
 function clock(state){const c=ensure(state);return localParts(instantFor(c.date,c.minutes,masterZone(state)),masterZone(state));}
 function updateFromInstant(state,ms){
  const c=ensure(state),before=c.date,after=localParts(ms,masterZone(state));
  c.date=after.date;c.minutes=after.minutes;
  c.daysElapsed+=Math.round((utc(after.year,after.month,after.day)-utc(+before.slice(0,4),+before.slice(5,7),+before.slice(8,10)))/DAY);
  return {from:before,to:c.date,clock:after};
 }
 function atPerson(state,p){
  const c=ensure(state);
  const place=cityInfo(p?.city||'New York');
  const when=instantFor(c.date,c.minutes,masterZone(state));
  return {...localParts(when,place.zone),...place};
 }
 const schedules={
  Retail:{days:[1,2,3,4,5,6],start:9*60,end:17*60,holiday:'open'},
  Trades:{days:[1,2,3,4,5],start:7*60,end:15*60+30,holiday:'closed'},
  Transport:{days:[1,2,3,4,5],start:6*60,end:16*60,holiday:'open'},
  Hospitality:{days:[0,2,3,4,5,6],start:15*60,end:23*60,holiday:'open'},
  Technology:{days:[1,2,3,4,5],start:9*60,end:17*60,holiday:'closed'},
  Engineering:{days:[1,2,3,4,5],start:8*60,end:17*60,holiday:'closed'},
  Healthcare:{days:[0,1,2,3,4,5,6],start:7*60,end:19*60,holiday:'essential'},
  Legal:{days:[1,2,3,4,5],start:9*60,end:17*60,holiday:'closed'},
  Education:{days:[1,2,3,4,5],start:8*60,end:15*60,holiday:'closed'},
  Business:{days:[1,2,3,4,5],start:9*60,end:17*60,holiday:'closed'},
  Science:{days:[1,2,3,4,5],start:9*60,end:17*60,holiday:'closed'}
 };
 function schedule(p,state,jobCatalog={}){
  const here=atPerson(state,p),date=here.date,parsed=parse(date),day=weekday(parsed.year,parsed.month,parsed.day);
  const job=jobCatalog[p?.career?.jobId],sector=job?.sector||'Business',pattern=schedules[sector]||schedules.Business;
  const holidayName=holiday(date,p?.city);
  if(!p||p.deathYear||p.retired)return {...here,sector,holiday:holidayName,working:false,scheduled:false,reason:p?.deathYear?'Remembered':'Retired',hours:0};
  if(!job||parsed.year-p.birthYear<job.minAge)return {...here,sector,holiday:holidayName,working:false,scheduled:false,reason:'Not employed',hours:0};
  if(!pattern.days.includes(day))return {...here,sector,holiday:holidayName,working:false,scheduled:false,reason:'Scheduled day off',hours:0};
  if(sector==='Education'&&(parsed.month===7||parsed.month===8))return {...here,sector,holiday:holidayName,working:false,scheduled:false,reason:'Summer break',hours:0};
  if(holidayName&&pattern.holiday==='closed')return {...here,sector,holiday:holidayName,working:false,scheduled:false,reason:'Holiday leave',hours:0};
  // Essential healthcare remains operational on public holidays. Retail/hospitality may operate.
  const working=here.minutes>=pattern.start&&here.minutes<pattern.end;
  return {...here,sector,holiday:holidayName,working,scheduled:true,reason:working?'On shift':here.minutes<pattern.start?'Shift later today':'Shift finished',
   hours:(pattern.end-pattern.start)/60,start:pattern.start,end:pattern.end};
 }
 function dayReport(state,jobCatalog){
  const c=ensure(state),person=state.people?.[state.controlledId];if(!person)return null;
  const status=schedule(person,state,jobCatalog);
  const entry={date:c.date,personId:person.id,location:person.city,sector:status.sector,hours:status.hours,holiday:status.holiday,reason:status.reason};
  c.dailyJournal.push(entry);if(c.dailyJournal.length>70)c.dailyJournal.splice(0,c.dailyJournal.length-70);
  return entry;
 }
 root.LEGACY_CALENDAR={LOCATIONS,leap,daysInMonth,dayOfYear,weekday,shiftDays,shiftMonths,shiftYears,parse,dateLabel,weekdayLabel,
  easter,holiday,holidaysFor,cityInfo,localParts,instantFor,ensure,clock,masterZone,atPerson,schedule,dayReport,updateFromInstant};
})(typeof window==='undefined'?globalThis:window);
