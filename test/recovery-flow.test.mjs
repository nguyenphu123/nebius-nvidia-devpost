import test from 'node:test';
import assert from 'node:assert/strict';
import {applyOperation,migrateOperations,recovery,stock} from '../operations.mjs';
import {recoveryDishes,recoveryOptionsHTML} from '../public/recovery-view.mjs';
const admin={id:'owner',username:'owner',role:'admin'},manager={username:'east manager',role:'manager',branchIds:['a']};
function fixture(){return migrateOperations({users:[],branches:[{id:'a',name:'East',active:true,dishIds:['dish','other']},{id:'b',name:'Support',active:true,dishIds:['dish']}],dishes:[{id:'dish',name:'Karaage',active:true,recipe:[{ingredientId:'chicken',quantity:.2}],requiredEquipment:['fryer'],prepMinutes:8,packMinutes:3,maxTravelMinutes:20},{id:'other',name:'Salad',active:true,recipe:[],requiredEquipment:[]}],ingredients:[{id:'chicken',name:'Chicken',unit:'kg',active:true}],equipment:[{id:'ea',branchId:'a',name:'Fryer',type:'fryer',status:'working'},{id:'eb',branchId:'b',name:'Fryer',type:'fryer',status:'working'}],movements:[{branchId:'b',ingredientId:'chicken',delta:8}],routes:[{from:'b',to:'a',minutes:12,cost:650,approved:true}]});}
const report=d=>{const saved=applyOperation(d,manager,'incident.create',{branchId:'a',type:'equipment',targetId:'ea',description:'Fryer fault',confirmed:true});return d.incidents.find(i=>i.id===saved.id);};
const details=id=>({id,dishId:'dish',portions:10,deadline:40,confirmed:true});
test('an existing report can gain a confirmed recovery request and complete a transfer',()=>{
 const d=fixture(),i=report(d);assert.deepEqual(recovery(d,i.id),[]);
 applyOperation(d,manager,'incident.recovery',details(i.id));
 assert.equal(d.incidents.length,1);assert.equal(i.type,'equipment');assert.equal(i.targetId,'ea');assert.match(i.events.at(-1).note,/Recovery details confirmed/);
 const [option]=recovery(d,i.id);assert.equal(option.eligible,true);assert.equal(option.eta,23);assert.deepEqual(option.timing,{queue:0,prepare:8,pack:3,travel:12});
 const t=applyOperation(d,manager,'transfer.request',{incidentId:i.id,from:'b',confirmed:true});
 for(const status of ['approved','preparing','in_transit','received'])applyOperation(d,admin,'transfer.advance',{id:t.id,status});
 assert.equal(stock(d,'b','chicken'),6);assert.equal(d.transfers[0].status,'received');
 assert.throws(()=>applyOperation(d,manager,'incident.recovery',details(i.id)),/already has a transfer/);
});
test('recovery detail edits enforce scope, explicit confirmation, menu and whole quantities without partial mutation',()=>{
 const d=fixture(),i=report(d),before=structuredClone(d);
 for(const payload of [{confirmed:false},{portions:0},{portions:1.5},{deadline:4},{deadline:500},{dishId:'missing'}]){
  assert.throws(()=>applyOperation(d,manager,'incident.recovery',{...details(i.id),...payload}));assert.deepEqual(d,before);
 }
 assert.throws(()=>applyOperation(d,{role:'manager',branchIds:['b']},'incident.recovery',details(i.id)),/cannot change/);
 d.dishes[0].active=false;assert.throws(()=>applyOperation(d,manager,'incident.recovery',details(i.id)),/active dish/);d.dishes[0].active=true;
 d.branches[0].dishIds=['other'];assert.throws(()=>applyOperation(d,manager,'incident.recovery',details(i.id)),/receiving branch menu/);
});
test('expired details can be revised before requesting, but open transfers and resolved incidents cannot be overwritten',()=>{
 const d=fixture(),i=report(d);applyOperation(d,manager,'incident.recovery',details(i.id));i.dueAt=new Date(0).toISOString();
 applyOperation(d,manager,'incident.recovery',{...details(i.id),deadline:60});assert.ok(Date.parse(i.dueAt)>Date.now());
 const t=applyOperation(d,manager,'transfer.request',{incidentId:i.id,from:'b',confirmed:true});
 assert.throws(()=>applyOperation(d,manager,'incident.recovery',{...details(i.id),portions:5}),/already has a transfer/);
 applyOperation(d,manager,'transfer.advance',{id:t.id,status:'cancelled'});applyOperation(d,manager,'incident.recovery',{...details(i.id),portions:5});assert.equal(i.portions,5);
 applyOperation(d,manager,'incident.update',{id:i.id,status:'resolved',note:'Repair verified'});assert.throws(()=>applyOperation(d,manager,'incident.recovery',details(i.id)),/resolved/);
});
test('dish suggestions use the incident branch and affected asset or ingredient, not the selected workspace',()=>{
 const d=fixture(),i=report(d);assert.deepEqual(recoveryDishes(d,i).map(x=>[x.id,x.related]),[['dish',true],['other',false]]);
 assert.equal(recoveryDishes(d,{...i,type:'stock',targetId:'chicken'})[0].id,'dish');d.branches[0].dishIds=[];assert.deepEqual(recoveryDishes(d,i),[]);
});

test('a closed or inactive receiving branch cannot start a recovery request',()=>{
 for(const unavailable of [{status:'closed'},{active:false}]){
  const d=fixture(),i=report(d);applyOperation(d,manager,'incident.recovery',details(i.id));Object.assign(d.branches[0],unavailable);
  const before=structuredClone(d),[option]=recovery(d,i.id);
  assert.equal(option.eligible,false);assert.ok(option.reasons.includes('Receiving branch is closed or inactive.'));
  assert.throws(()=>applyOperation(d,manager,'transfer.request',{incidentId:i.id,from:'b',confirmed:true}),/eligible/);
  assert.deepEqual(d,before);assert.equal(stock(d,'b','chicken'),8);
 }
});

test('destination closure between request and approval leaves stock and transfer unchanged',()=>{
 for(const unavailable of [{status:'closed'},{active:false}]){
  const d=fixture(),i=report(d);applyOperation(d,manager,'incident.recovery',details(i.id));
  const t=applyOperation(d,manager,'transfer.request',{incidentId:i.id,from:'b',confirmed:true});Object.assign(d.branches[0],unavailable);
  const before=structuredClone(d);
  assert.throws(()=>applyOperation(d,admin,'transfer.advance',{id:t.id,status:'approved'}),/Receiving branch is closed or inactive/);
  assert.deepEqual(d,before);assert.equal(d.transfers[0].status,'requested');assert.equal(stock(d,'b','chicken'),8);
  applyOperation(d,manager,'transfer.advance',{id:t.id,status:'cancelled'});assert.equal(d.transfers[0].status,'cancelled');
 }
});

test('destination closure after approval prevents preparation and preserves cancellation',()=>{
 for(const unavailable of [{status:'closed'},{active:false}]){
  const d=fixture(),i=report(d);applyOperation(d,manager,'incident.recovery',details(i.id));
  const t=applyOperation(d,manager,'transfer.request',{incidentId:i.id,from:'b',confirmed:true});applyOperation(d,admin,'transfer.advance',{id:t.id,status:'approved'});Object.assign(d.branches[0],unavailable);
  const before=structuredClone(d);
  assert.throws(()=>applyOperation(d,admin,'transfer.advance',{id:t.id,status:'preparing'}),/Receiving branch is closed or inactive/);
  assert.deepEqual(d,before);assert.equal(d.transfers[0].status,'approved');assert.equal(stock(d,'b','chicken'),8);
  applyOperation(d,manager,'transfer.advance',{id:t.id,status:'cancelled'});assert.equal(d.transfers[0].status,'cancelled');assert.equal(stock(d,'b','chicken'),8);
 }
});
test('blocked recovery cards explain fixes while keeping unavailable branches unselectable',()=>{
 const d=fixture(),i=report(d);applyOperation(d,manager,'incident.recovery',details(i.id));d.routes=[];
 const options=recovery(d,i.id),html=recoveryOptionsHTML({incident:i,options,isAdmin:true});
 assert.match(html,/No branch can cover/);assert.match(html,/Set delivery route/);assert.doesNotMatch(html,/data-action="request"/);
 assert.doesNotMatch(recoveryOptionsHTML({incident:i,options,isAdmin:false}),/Set delivery route/);
 const safe=recoveryOptionsHTML({incident:i,options:[{...options[0],name:'<img src=x onerror=alert(1)>',eligible:true,reasons:[]}]});assert.match(safe,/&lt;img/);assert.doesNotMatch(safe,/<img/);
});
