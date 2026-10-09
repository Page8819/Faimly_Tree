'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../public/economy.js');const E=globalThis.LEGACY_ECONOMY;
const person=(wealth=30000)=>({wealth,finance:null});
test('existing saves migrate to balanced asset and debt ledger',()=>{
 const p=person(-5000),f=E.ensure(p);
 assert.equal(f.cash,0);assert.equal(f.consumerDebt,5000);assert.equal(E.netWorth(f),-5000);
 p.wealth=3000;E.reconcile(p);assert.equal(E.statement(p).netWorth,3000);
});
test('annual household economy accounts for income and costs once per year',()=>{
 const p=person(90000);
 const args={year:2030,age:35,income:75000,city:'Boston',dependents:2,hasPartner:true,rnd:()=>.5};
 const r=E.annual(p,args);const wealth=p.wealth;
 assert.ok(r.gross===75000&&r.tax>0&&r.living>0);
 assert.ok(wealth===E.netWorth(p.finance));
 assert.equal(E.annual(p,args),r);
 assert.equal(p.wealth,wealth);
 assert.equal(p.finance.history.length,1);
});
test('home purchase exchanges down payment for equity without inventing net worth',()=>{
 const p=person(70000);const before=p.wealth;
 let sale=E.purchaseHome(p,{age:30});
 assert.ok(sale.ok);assert.equal(p.finance.propertyValue,180000);
 assert.equal(p.finance.mortgage,162000);
 assert.equal(p.wealth,before);
 assert.equal(E.purchaseHome(p,{age:30}).ok,false);
});
test('budgets change future living costs and keep histories bounded',()=>{
 const a=person(60000),b=person(60000),base={year:2028,age:40,income:60000,hasPartner:false,dependents:0,rnd:()=>.5};
 assert.equal(E.changeBudget(a),'careful');
 const careful=E.annual(a,base),normal=E.annual(b,base);
 assert.ok(careful.living<normal.living);
 for(let y=2029;y<2065;y++)E.annual(a,{...base,year:y,age:40+y-2028});
 assert.ok(E.chart(a).length<=15);
});
