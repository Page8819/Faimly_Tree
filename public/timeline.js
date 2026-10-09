'use strict';
/* Living Timeline pacing: a game year takes the selected number of REAL minutes.
   Simulated dates remain Gregorian and obey the same annual interruption rules. */
(function(root){
 const SPEEDS=[1,5,15,30,60];
 const validSpeed=n=>SPEEDS.includes(Number(n))?Number(n):15;
 function ensure(state){
  if(!state.timeline||typeof state.timeline!=='object')state.timeline={speedMinutes:15};
  state.timeline.speedMinutes=validSpeed(state.timeline.speedMinutes);
  return state.timeline;
 }
 function step({date,elapsedMs=0,remainderMs=0,speedMinutes=15,maxDays=32}){
  const C=root.LEGACY_CALENDAR;
  if(!C||!C.parse(date))throw Error('Timeline requires valid game calendar date');
  const speed=validSpeed(speedMinutes);
  let next=date,remaining=Math.max(0,remainderMs)+Math.max(0,elapsedMs),days=0;
  const cap=Math.max(1,Math.min(64,Math.floor(maxDays)));
  while(days<cap){
   const year=C.parse(next).year;
   const dayMs=speed*60000/(C.leap(year)?366:365);
   if(remaining<dayMs)break;
   remaining-=dayMs;
   next=C.shiftDays(next,1);
   days++;
  }
  return {date:next,days,remainderMs:remaining,speedMinutes:speed};
 }
 function progress(date,partialDay=0){
  const C=root.LEGACY_CALENDAR,p=C.parse(date);
  if(!p)return 0;
  return Math.max(0,Math.min(1,(C.dayOfYear(p.year,p.month,p.day)-1+Math.max(0,Math.min(.999,partialDay)))/(C.leap(p.year)?366:365)));
 }
 function remaining(date,speedMinutes){
  const C=root.LEGACY_CALENDAR,p=C.parse(date);
  const total=C.leap(p.year)?366:365;
  return (total-C.dayOfYear(p.year,p.month,p.day)+1)*validSpeed(speedMinutes)*60/total;
 }
 function months(date){
  const C=root.LEGACY_CALENDAR,p=C.parse(date);
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((label,i)=>({
   label,active:p.month===i+1,passed:p.month>i+1,
   position:((C.dayOfYear(p.year,i+1,1)-1)/(C.leap(p.year)?366:365))*100
  }));
 }
 root.LEGACY_TIMELINE={SPEEDS,validSpeed,ensure,step,progress,remaining,months};
})(typeof window==='undefined'?globalThis:window);
