'use strict';
/* Stylized household economy with explicit ledgers. Numbers are game rules, not financial forecasts. */
(function(root){
 const money=x=>Math.round(Number.isFinite(x)?x:0);
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
 const region={'New York':1.45,Boston:1.37,'San Francisco':1.85,Seattle:1.36,'San Diego':1.42,Chicago:1.06,Philadelphia:1.08,Austin:1.12,Denver:1.18,Atlanta:1.06,Portland:1.21,Nashville:1.07,Minneapolis:1.08,Raleigh:1.03};
 function netWorth(f){return money(f.cash+f.investments+f.propertyValue-f.mortgage-f.consumerDebt);}
 function ensure(p){
  if(!p.finance||typeof p.finance!=='object'){
   const initial=money(p.wealth||0);
   p.finance={cash:Math.max(0,initial),investments:0,propertyValue:0,mortgage:0,consumerDebt:Math.max(0,-initial),budgetMode:'standard',history:[],lastYear:null,lastStatement:null};
  }
  const f=p.finance;
  for(const k of ['cash','investments','propertyValue','mortgage','consumerDebt'])if(!Number.isFinite(f[k]))f[k]=0;
  for(const k of ['investments','propertyValue','mortgage','consumerDebt'])f[k]=Math.max(0,f[k]);
  if(!['standard','careful','generous'].includes(f.budgetMode))f.budgetMode='standard';
  if(!Array.isArray(f.history))f.history=[];
  return f;
 }
 function reconcile(p){
  const f=ensure(p),difference=money(p.wealth)-netWorth(f);
  if(difference>0){
   const paid=Math.min(f.consumerDebt,difference);
   f.consumerDebt-=paid;f.cash+=difference-paid;
  }else if(difference<0){
   f.cash+=difference;
   if(f.cash<0){f.consumerDebt+=-f.cash;f.cash=0;}
  }
  return f;
 }
 function statement(p){const f=reconcile(p);return {...f,netWorth:netWorth(f),equity:Math.round(f.propertyValue-f.mortgage)};}
 function annual(p,{year,age,income=0,city='New York',dependents=0,hasPartner=false,rnd=()=>.5}){
  const f=reconcile(p);if(f.lastYear===year)return f.lastStatement;const before=netWorth(f);
  const regionFactor=region[city]||1.1;
  const workAge=age>=18&&age<67&&!p.retired;
  const wages=workAge?Math.max(0,money(income)):0;
  const pension=age>=67||p.retired?Math.max(8500,money(income*.16)):0;
  const tax=money(wages*(wages<40000?.115:wages<85000?.17:.23)+pension*.04);
  // Partnered adults split essential living costs, but retain separate personal accounts.
  const share=hasPartner?.60:1;
  const housing=money((f.propertyValue>0?(f.mortgage>0?11000:3900)+f.propertyValue*.014:16500)*regionFactor*share);
  const groceries=money(5700*share+Math.max(0,dependents)*2600*(hasPartner?.5:1));
  const transport=money(4200*share);
  const healthcare=money((age>65?3800:2500)*share);
  const other=money((f.budgetMode==='careful'?4400:f.budgetMode==='generous'?11000:7600)*share);
  const living=housing+groceries+transport+healthcare+other;
  const gross=wages+pension,netIncome=gross-tax;
  const investmentReturn=money(f.investments*(.035+(rnd()-.5)*.10));
  const houseGrowth=money(f.propertyValue*(.01+(rnd()-.5)*.03));
  const mortgageInterest=money(f.mortgage*.05);
  const mortgagePayment=f.mortgage>0?Math.min(f.mortgage,money(Math.max(1000,f.mortgage*.025))):0;
  const debtInterest=money(f.consumerDebt*.085);
  f.investments=money(f.investments+investmentReturn);
  f.propertyValue=Math.max(0,f.propertyValue+houseGrowth);
  f.mortgage=Math.max(0,money(f.mortgage+mortgageInterest-mortgagePayment));
  f.consumerDebt=Math.max(0,money(f.consumerDebt+debtInterest));
  f.cash+=netIncome-living-mortgagePayment;
  if(f.cash<0){f.consumerDebt+=-f.cash;f.cash=0;}
  // Household surplus pays unsecured debts before funding investments.
  const paydown=Math.min(f.consumerDebt,Math.max(0,money(f.cash-3500))*.35);
  f.consumerDebt-=paydown;f.cash-=paydown;
  if(f.cash>18000){
   const deposit=money(Math.min(f.cash-15000,(f.cash-15000)*.25));
   f.cash-=deposit;f.investments+=deposit;
  }
  f.cash=money(f.cash);f.consumerDebt=money(f.consumerDebt);
  f.lastYear=year;
  p.wealth=netWorth(f);
  const update={year,gross,tax,living,netIncome,investmentReturn,houseGrowth,mortgageInterest,mortgagePayment,debtInterest,netChange:p.wealth-before,netWorth:p.wealth};
  f.lastStatement=update;
  f.history.push({year,netWorth:p.wealth,gross,expenses:living+tax,debt:f.mortgage+f.consumerDebt});
  if(f.history.length>30)f.history.shift();
  return update;
 }
 function purchaseHome(p,{age=0,partnerHome=false}={}){
  const f=reconcile(p);
  if(age<21)return {ok:false,message:'You must be at least 21 to purchase a home.'};
  if(partnerHome||f.propertyValue>0)return {ok:false,message:'This household already owns a home.'};
  if(f.cash<18000||f.consumerDebt>40000)return {ok:false,message:'A down payment of $18,000 and manageable debt are required.'};
  const price=180000;const down=18000;
  f.cash-=down;f.propertyValue=price;f.mortgage=price-down;
  p.wealth=netWorth(f);
  return {ok:true,message:'Purchased a $180,000 home with an $18,000 down payment and a $162,000 mortgage.'};
 }
 function changeBudget(p){
  const f=reconcile(p);
  f.budgetMode=f.budgetMode==='standard'?'careful':f.budgetMode==='careful'?'generous':'standard';
  return f.budgetMode;
 }
 function chart(p){const f=ensure(p);return f.history.slice(-15).map(v=>({...v}));}
 root.LEGACY_ECONOMY={ensure,reconcile,statement,annual,purchaseHome,changeBudget,chart,netWorth};
})(typeof window==='undefined'?globalThis:window);
