'use strict';
/* Attention inbox. Only material life events generate notifications, never every yearly tick.
   Alerts are kept in the saved dynasty, not sent as OS push notifications. */
(function(root){
 const MAX_ALERTS=120, MAX_EVENT_IDS=7;
 const clean=x=>String(x||'').trim();
 function ensure(state){
  if(!state.attention||typeof state.attention!=='object')state.attention={items:[],enabled:true};
  if(!Array.isArray(state.attention.items))state.attention.items=[];
  if(typeof state.attention.enabled!=='boolean')state.attention.enabled=true;
  return state.attention;
 }
 function category(event){
  const msg=clean(event?.message).toLowerCase(),type=event?.type;
  switch(type){
   case 'death':return {kind:'loss',priority:4,label:'Family loss'};
   case 'health':
    return /diagnosed|developed symptoms|serious|hospital|emergency|complications|pneumonia|stroke/.test(msg)?
     {kind:'health',priority:4,label:'Health update'}:null;
   case 'birth':case 'adoption':return {kind:'family',priority:3,label:'New family member'};
   case 'relationship':
    return /separat|widow|divorc|estrang|tension/.test(msg)?
      {kind:'relationship',priority:3,label:'Relationship change'}:{kind:'relationship',priority:2,label:'Relationship news'};
   case 'career':
    return /hired|promot|lost|left work|laid off|advanced|new job|resign|retire|career/.test(msg)?
      {kind:'career',priority:2,label:'Career update'}:null;
   case 'education':
    return /complet|graduat|certif|enroll/.test(msg)?
      {kind:'education',priority:2,label:'Education milestone'}:null;
   case 'inheritance':return {kind:'money',priority:3,label:'Inheritance'};
   case 'housing':return {kind:'money',priority:2,label:'Housing change'};
   case 'move':return {kind:'move',priority:2,label:'Life change'};
   case 'family':return {kind:'family',priority:2,label:'Family situation'};
   default:return null;
  }
 }
 function recipients(state,event){
  const ids=[...new Set((event.personIds||[]).filter(id=>state.people?.[id]?.inFamily))];
  if(event.type==='inheritance'&&ids.length>1)return ids.slice(1,5);
  if(event.type==='birth'||event.type==='adoption'||event.type==='death')return ids.slice(0,1);
  return ids.slice(0,2);
 }
 function add(state,event){
  const store=ensure(state),type=category(event);
  if(!store.enabled||!type||!event||!Number.isFinite(event.id))return 0;
  let changed=0;
  for(const personId of recipients(state,event)){
   const person=state.people[personId];
   const existing=store.items.find(a=>a.personId===personId&&a.year===event.year&&!a.read);
   if(existing){
    if(!existing.eventIds.includes(event.id)){
     existing.eventIds.push(event.id);
     if(existing.eventIds.length>MAX_EVENT_IDS)existing.eventIds.shift();
    }
    if(type.priority>existing.priority||type.priority===existing.priority){
     existing.priority=type.priority;existing.kind=type.kind;existing.label=type.label;
     existing.message=clean(event.message);existing.eventId=event.id;
    }
    changed++;continue;
   }
   // Notifications created after a reviewed event in the same year should still be visible.
   const record={id:'alert-'+event.id+'-'+personId,eventId:event.id,eventIds:[event.id],personId,
    year:event.year,kind:type.kind,priority:type.priority,label:type.label,
    message:clean(event.message),read:false};
   store.items.push(record);changed++;
  }
  if(store.items.length>MAX_ALERTS){
   store.items.sort((a,b)=>Number(a.read)-Number(b.read)||b.year-a.year||b.priority-a.priority||b.eventId-a.eventId);
   store.items.length=MAX_ALERTS;
  }
  return changed;
 }
 function unread(state,personId){
  return ensure(state).items.filter(a=>!a.read&&(!personId||a.personId===personId)&&!!state.people?.[a.personId])
   .sort((a,b)=>b.year-a.year||b.priority-a.priority||b.eventId-a.eventId);
 }
 function counts(state){
  const summary=new Map();
  for(const a of unread(state)){
   const v=summary.get(a.personId)||{count:0,priority:0};
   v.count++;v.priority=Math.max(v.priority,a.priority);summary.set(a.personId,v);
  }
  return summary;
 }
 function readPerson(state,id){
  let read=0;
  for(const item of ensure(state).items)if(item.personId===id&&!item.read){item.read=true;read++;}
  return read;
 }
 function dismiss(state,id){
  const a=ensure(state).items.find(x=>x.id===id);
  if(!a||a.read)return false;
  a.read=true;return true;
 }
 function dismissAll(state){
  let n=0;for(const a of ensure(state).items)if(!a.read){a.read=true;n++;}
  return n;
 }
 root.LEGACY_ATTENTION={ensure,category,recipients,add,unread,counts,readPerson,dismiss,dismissAll};
})(typeof window==='undefined'?globalThis:window);
