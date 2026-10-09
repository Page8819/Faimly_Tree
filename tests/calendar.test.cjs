'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/calendar.js');
const C=globalThis.LEGACY_CALENDAR;
const make=(date='2026-01-01',city='New York',jobId='carpenter')=>({
 year:+date.slice(0,4),
 calendar:{date,minutes:9*60,daysElapsed:0,dailyJournal:[]},
 controlledId:'p',people:{p:{id:'p',first:'Alex',birthYear:2000,city,
 career:{jobId},retired:false,needs:{physical:70,mental:70}}}
});
const jobs={
 carpenter:{name:'Carpenter',sector:'Trades',minAge:18},
 service:{name:'Retail associate',sector:'Retail',minAge:16},
 physician:{name:'Physician',sector:'Healthcare',minAge:26},
 teacher:{name:'Teacher',sector:'Education',minAge:21}
};
test('proleptic Gregorian leap-day and centennial rules work in distant years',()=>{
 assert.equal(C.leap(2084),true);assert.equal(C.leap(2100),false);assert.equal(C.leap(2400),true);
 assert.equal(C.daysInMonth(2084,2),29);
 assert.equal(C.shiftDays('2084-02-28',1),'2084-02-29');
 assert.equal(C.shiftDays('2084-02-29',1),'2084-03-01');
 assert.equal(C.shiftMonths('2084-01-31',1),'2084-02-29');
 assert.equal(C.shiftYears('2084-02-29',1),'2085-02-28');
 assert.equal(C.dayOfYear(2084,12,31),366);
 assert.equal(C.dateLabel('2083-01-01'),'January • 1st • 2083');
 assert.equal(C.dateLabel('2083-01-02'),'January • 2nd • 2083');
 assert.equal(C.dateLabel('2083-01-03'),'January • 3rd • 2083');
});
test('IANA time zones respect a one-hour spring DST jump in New York',()=>{
 const zone='America/New_York';
 const before=C.instantFor('2026-03-08',90,zone);
 const local=C.localParts(before,zone);
 assert.equal(local.date,'2026-03-08');assert.equal(local.minutes,90);
 const oneHour=C.localParts(before+3600000,zone);
 assert.equal(oneHour.date,'2026-03-08');
 assert.equal(oneHour.minutes,210,'one real hour after 1:30 AM becomes 3:30 AM');
 assert.ok(/EDT|GMT-4/.test(oneHour.abbreviation));
});
test('DST fall-back repeats the 1 AM hour and does not invent an extra calendar day',()=>{
 const zone='America/New_York';
 const early=C.instantFor('2026-11-01',30,zone);
 const first=C.localParts(early+3600000,zone);
 const second=C.localParts(early+7200000,zone);
 assert.equal(first.date,'2026-11-01');assert.equal(second.date,'2026-11-01');
 assert.equal(first.minutes,90);assert.equal(second.minutes,90);
});
test('same instant shows different local dates and hours by character city',()=>{
 const state=make('2083-01-01');
 state.calendar.minutes=21*60;
 const ny=C.atPerson(state,state.people.p),tokyo=C.atPerson(state,{city:'Tokyo'});
 assert.equal(ny.date,'2083-01-01');
 assert.equal(tokyo.date,'2083-01-02');
 assert.equal(tokyo.minutes,11*60);
 assert.equal(C.cityInfo('London').zone,'Europe/London');
 assert.equal(C.cityInfo('Sydney').zone,'Australia/Sydney');
});
test('region-specific modeled public holidays and US observed days apply',()=>{
 assert.match(C.holiday('2026-07-03','New York'),/Independence Day/);
 assert.match(C.holiday('2026-11-26','Boston'),/Thanksgiving/);
 assert.match(C.holiday('2027-12-27','London'),/Christmas Day/);
 assert.match(C.holiday('2027-12-28','London'),/Boxing Day/);
 assert.equal(C.holiday('2026-07-03','London'),null);
 assert.match(C.holiday('2026-10-03','Berlin'),/German Unity/);
 assert.match(C.holiday('2026-01-26','Mumbai'),/Republic Day/);
});
test('trade work stops for modeled holidays but essential healthcare remains staffed',()=>{
 const state=make('2026-07-03');
 const carpenter=C.schedule(state.people.p,state,jobs);
 assert.equal(carpenter.scheduled,false);assert.equal(carpenter.reason,'Holiday leave');
 state.people.p.career.jobId='physician';
 const doctor=C.schedule(state.people.p,state,jobs);
 assert.equal(doctor.scheduled,true);assert.equal(doctor.working,true);
 assert.equal(doctor.hours,12);
 state.people.p.career.jobId='teacher';state.calendar.date='2026-07-06';
 assert.equal(C.schedule(state.people.p,state,jobs).reason,'Summer break');
});
test('actual location and working hour determine whether character is on shift',()=>{
 const state=make('2026-10-12');
 assert.equal(C.schedule(state.people.p,state,jobs).scheduled,false,'federal holiday');
 state.calendar.date='2026-10-13';
 assert.equal(C.schedule(state.people.p,state,jobs).working,true);
 state.calendar.minutes=19*60;
 assert.equal(C.schedule(state.people.p,state,jobs).working,false);
});
test('old saves acquire valid dates without rewriting years, and day reports are bounded',()=>{
 const state={year:2113,people:{p:{city:'Chicago',career:{jobId:'carpenter'},birthYear:2080}},controlledId:'p'};
 C.ensure(state);
 assert.equal(state.calendar.date,'2113-01-01');
 assert.equal(state.year,2113);
 for(let i=0;i<100;i++)C.dayReport(state,jobs);
 assert.equal(state.calendar.dailyJournal.length,70);
});
