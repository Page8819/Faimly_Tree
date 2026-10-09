'use strict';
/* Succession selects an heir from living descendants or the wider family tree. */
(function(root){
 const alive=p=>p&&!p.deathYear;
 function descendants(state,ancestorId){
  const people=Object.values(state.people);
  const children=new Map();
  for(const p of people)for(const parentId of [...(p.parentIds||[]),...(p.adoptiveParentIds||[])]){
   if(!children.has(parentId))children.set(parentId,[]);
   children.get(parentId).push(p.id);
  }
  const dist=new Map(),queue=[ancestorId];dist.set(ancestorId,0);
  for(let i=0;i<queue.length;i++){
   const current=queue[i];
   for(const id of children.get(current)||[])if(!dist.has(id)){dist.set(id,dist.get(current)+1);queue.push(id);}
  }
  dist.delete(ancestorId);return dist;
 }
 function candidates(state,fromId){
  const from=state.people[fromId];if(!from)return [];
  const distance=descendants(state,fromId),living=Object.values(state.people).filter(p=>alive(p)&&p.inFamily&&p.id!==fromId);
  const fromParents=new Set([...(from.parentIds||[]),...(from.adoptiveParentIds||[])]);
  const role=p=>{
   const d=distance.get(p.id);if(d===1)return 'Child';if(d===2)return 'Grandchild';if(d>2)return 'Descendant · '+d+' generations';
   if((p.parentIds||[]).some(id=>fromParents.has(id))||(p.adoptiveParentIds||[]).some(id=>fromParents.has(id)))return 'Sibling';
   if((from.parentIds||[]).includes(p.id)||(from.adoptiveParentIds||[]).includes(p.id))return 'Parent';
   return 'Extended family';
  };
  const rank=p=>{
   const d=distance.get(p.id);
   if(d!==undefined)return d-1;
   return role(p)==='Sibling'?9:role(p)==='Parent'?12:20;
  };
  living.sort((a,b)=>rank(a)-rank(b)||
   (Math.abs((state.year-a.birthYear)-25)-Math.abs((state.year-b.birthYear)-25))||
   a.birthYear-b.birthYear||a.id.localeCompare(b.id));
  // Descendants come first; player can choose several competing heirs rather than being assigned one.
  return living.slice(0,8).map(p=>({id:p.id,role:role(p),age:state.year-p.birthYear,
   gen:p.gen+1,name:p.first+' '+p.last,city:p.city,wealth:Math.round(p.wealth)}));
 }
 function familyLegacy(state){
  const family=Object.values(state.people).filter(p=>p.inFamily);
  const living=family.filter(alive),generations=family.reduce((n,p)=>Math.max(n,p.gen+1),0);
  return {generations,living:living.length,recorded:family.length,
   wealth:Math.round(living.reduce((s,p)=>s+p.wealth,0))};
 }
 function prepare(state,fromId){
  if(state.pendingSuccession)return state.pendingSuccession;
  const from=state.people[fromId];if(!from)return null;
  const options=candidates(state,fromId);
  state.pendingSuccession={fromId,year:state.year,candidateIds:options.map(x=>x.id)};
  return state.pendingSuccession;
 }
 function choose(state,toId){
  const pending=state.pendingSuccession;if(!pending)return null;
  const from=state.people[pending.fromId],options=candidates(state,pending.fromId);
  const to=options.find(p=>p.id===toId);
  if(!to)return null;
  state.controlledId=to.id;state.selectedId=to.id;state.pendingSuccession=null;
  if(!Array.isArray(state.successionLog))state.successionLog=[];
  state.successionLog.push({year:state.year,fromId:from.id,toId:to.id});
  return {from,to,legacy:familyLegacy(state)};
 }
 root.LEGACY_SUCCESSION={descendants,candidates,familyLegacy,prepare,choose};
})(typeof window==='undefined'?globalThis:window);
