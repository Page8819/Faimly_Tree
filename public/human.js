'use strict';
/* Character-needs model: deterministic, bounded GAMEPLAY parameters, not medical predictions. */
(function(root){
 const clamp=(x,lo=0,hi=100)=>Math.max(lo,Math.min(hi,Number.isFinite(x)?x:50));
 const rounded=x=>Math.round(clamp(x));
 const seeded=(p,age)=>({
  physical:rounded(86-Math.max(0,age-42)*.36+((p.traits?.conscientiousness??50)-50)*.09),
  mental:rounded(66+((p.traits?.agreeableness??50)-50)*.12),
  energy:rounded(75-Math.max(0,age-35)*.25),
  stress:rounded(29+((p.traits?.emotionality??50)-50)*.3),
  resilience:rounded(53+((p.traits?.conscientiousness??50)-50)*.16),
  agency:rounded(52+((p.traits?.openness??50)-50)*.15)
 });
 function ensure(p,age){
  if(!p.needs||typeof p.needs!=='object')p.needs=seeded(p,age??Math.max(0,2026-p.birthYear));
  for(const [key,value] of Object.entries(seeded(p,age??25)))if(!Number.isFinite(p.needs[key]))p.needs[key]=value;
  return p.needs;
 }
 function annual(p,{age,year,rnd,financialPressure=0,support=50}){
  const n=ensure(p,age);if(p.needsYear===year)return n;
  const random=()=>((typeof rnd==='function'?rnd():.5)-.5)*5;
  const stable=p.traits?.conscientiousness??50,emotional=p.traits?.emotionality??50;
  const work=(age>=18&&age<=67&&!p.retired)?1:0;
  const ageing=Math.max(0,age-48)*.22;
  n.stress=rounded(n.stress*.83+5.4+financialPressure*.105+(100-support)*.045+work*2.1+(emotional-50)*.026+random());
  n.physical=rounded(n.physical+(age<18?.6:-.15)-ageing+(100-n.stress)*.013+(stable-50)*.018+random()*.8);
  n.mental=rounded(n.mental+(support-50)*.035-(n.stress-45)*.075+(n.resilience-50)*.035+random());
  n.energy=rounded(n.energy*.68+(n.physical*.16)+(n.mental*.14)-n.stress*.05+random());
  n.resilience=rounded(n.resilience+(n.mental-50)*.013+(stable-50)*.012+random()*.28);
  n.agency=rounded(n.agency+(n.mental-50)*.024-(n.stress-40)*.019+random()*.34);
  p.needsYear=year;
  return n;
 }
 function effect(p,action){
  const n=ensure(p);
  const change=(field,d)=>n[field]=rounded(n[field]+d);
  switch(action){
   case 'college':change('stress',9);change('agency',4);change('energy',-4);break;
   case 'trade':change('agency',5);change('energy',-2);break;
   case 'work':case 'promotion':change('agency',3);change('stress',5);break;
   case 'business':change('stress',11);change('agency',5);break;
   case 'stable':case 'budget':change('stress',-5);change('resilience',2);break;
   case 'quality':case 'financial':case 'visit':case 'care':case 'mentor':case 'support':change('mental',5);change('stress',-4);break;
   case 'balance':case 'retire':change('stress',-12);change('mental',6);change('energy',4);break;
   case 'independent':case 'solo':change('agency',4);break;
   case 'retrain':case 'educate':change('stress',3);change('agency',3);break;
   case 'reconcile':case 'repair':change('mental',4);break;
   case 'setback':case 'borrow':change('stress',7);change('mental',-2);break;
   case 'move':case 'relocate':change('stress',6);change('agency',3);break;
  }
  return n;
 }
 function careerModifier(p){
  const n=ensure(p);
  return Math.max(.75,Math.min(1.2,.92+(n.energy-50)*.0022+(n.agency-50)*.0018-(n.stress-50)*.0015));
 }
 function deathRiskModifier(p){const n=ensure(p);return Math.max(.88,Math.min(1.16,1+(52-n.physical)*.002));}
 function snapshot(p,age){const n=ensure(p,age);return {...n};}
 root.LEGACY_HUMAN={ensure,annual,effect,careerModifier,deathRiskModifier,snapshot};
})(typeof window==='undefined'?globalThis:window);
