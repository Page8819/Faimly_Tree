'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/calendar.js');
require('../public/timeline.js');
const C=globalThis.LEGACY_CALENDAR,T=globalThis.LEGACY_TIMELINE;
test('year duration presets match one, five, fifteen, thirty and sixty real minutes',()=>{
 assert.deepEqual(T.SPEEDS,[1,5,15,30,60]);
 for(const speed of T.SPEEDS){
  const dayMs=speed*60000/365;
  const one=T.step({date:'2083-01-01',elapsedMs:dayMs+.001,speedMinutes:speed});
  assert.equal(one.days,1,'speed '+speed+' minutes/year');
  assert.equal(one.date,'2083-01-02');
 }
 assert.equal(T.validSpeed(9),15);
});
test('15 minutes per game year by default with no automatic playing state in saves',()=>{
 const game={year:2083};
 assert.equal(T.ensure(game).speedMinutes,15);
 assert.equal(Object.hasOwn(game.timeline,'playing'),false);
 game.timeline.speedMinutes=60;
 assert.equal(T.ensure(game).speedMinutes,60);
});
test('one minute advances a non-leap game year without skipping a day',()=>{
 let date='2083-01-01',fraction=0,total=0;
 for(let i=0;i<60;i++){
  const r=T.step({date,elapsedMs:1000,remainderMs:fraction,speedMinutes:1});
  date=r.date;fraction=r.remainderMs;total+=r.days;
 }
 assert.equal(total,365);
 assert.equal(date,'2084-01-01');
});
test('leap year contains all 366 days and February 29 during accelerated playback',()=>{
 let date='2084-01-01',fraction=0,total=0,visitedLeap=false;
 for(let i=0;i<60;i++){
  const r=T.step({date,elapsedMs:1000,remainderMs:fraction,speedMinutes:1});
  if(date<='2084-02-29'&&r.date>='2084-02-29')visitedLeap=true;
  date=r.date;fraction=r.remainderMs;total+=r.days;
 }
 assert.equal(total,366);assert.equal(date,'2085-01-01');assert.equal(visitedLeap,true);
});
test('progress bar and month markers reflect actual Gregorian calendar',()=>{
 assert.equal(T.progress('2083-01-01'),0);
 assert.ok(T.progress('2083-07-01')>.49);
 assert.ok(T.progress('2083-12-31')>.99);
 assert.equal(T.months('2083-07-01').filter(m=>m.active)[0].label,'Jul');
 assert.ok(T.remaining('2083-01-01',15)>899&&T.remaining('2083-01-01',15)<901);
});
test('time accumulator preserves fractions of a day between frames',()=>{
 const part=T.step({date:'2083-01-01',elapsedMs:50,speedMinutes:15});
 assert.equal(part.days,0);
 const second=T.step({date:part.date,elapsedMs:2500,remainderMs:part.remainderMs,speedMinutes:15});
 assert.equal(second.days,1);assert.ok(second.remainderMs>0);
});
