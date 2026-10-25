import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, planKitchen, validateState, compareOptions } from '../planner.mjs';
import { applyAssistantChanges } from '../assistant-changes.mjs';

function localRow() {
  const item = { id:'local-greens', name:'Rau muống', description:'Weighed edible portion; kitchen lead reviewed recipe suitability', quantity: 3, unit:'bó', foodType:'fresh' };
  item.mapping = { ingredientId:'vegetables', kgPerUnit: .4, confirmed:true, signature:JSON.stringify([item.name,item.description,item.unit,item.foodType]) };
  return item;
}
test('confirmed local ingredient converts measured units and contributes to plan', () => {
  const row = localRow();
  const p = planKitchen({...initialState, inventory:[row], guests:10, budget:0});
  const use = p.inventoryUsage[0];
  assert.equal(use.ingredientId,'vegetables'); assert.equal(use.factor,.4);
  const withStock = planKitchen({...initialState, inventory:initialState.inventory.map(i=>i.id==='vegetables'?row:i)});
  assert.ok(withStock.inventoryUsage.find(i=>i.id===row.id).usedQuantity>0);
  assert.equal(withStock.state.inventory.find(i=>i.id===row.id).name,'Rau muống');
});
test('unconfirmed, stale, unknown and incorrect mass mappings are rejected', () => {
  for(const patch of [{confirmed:false},{ingredientId:'mystery'},{kgPerUnit:0},{kgPerUnit:NaN},{signature:'stale'}]) {
    const row=localRow(); row.mapping={...row.mapping,...patch};
    assert.throws(()=>validateState({...initialState,inventory:[row]}));
  }
  const row=localRow(); row.name='Other food'; assert.throws(()=>validateState({...initialState,inventory:[row]}));
  row.name='Rau muống'; row.unit='kg'; row.mapping.signature=JSON.stringify([row.name,row.description,row.unit,row.foodType]);
  assert.throws(()=>validateState({...initialState,inventory:[row]}),/exact mass/);
});
test('assistant quantity changes preserve confirmed mapping and cannot overwrite it', () => {
  const s={...initialState,inventory:[localRow()]};
  const result=applyAssistantChanges(s,{inventory:[{id:'local-greens',quantity:5}]});
  assert.deepEqual(result.proposedState.inventory[0].mapping,s.inventory[0].mapping);
  assert.throws(()=>applyAssistantChanges(s,{inventory:[{id:'local-greens',quantity:5,mapping:{}}]}));
});
test('buffer is enforced and recovery options are isolated, bounded and reproducible', () => {
  const s={...initialState,guests:140,burners:1,bufferMinutes:20,inventory:initialState.inventory.map(i=>i.id==='lentils'?{...i,quantity:0}:i)};
  const original=structuredClone(s);
  const p=planKitchen(s); assert.ok(p.finish<=220); assert.ok(p.slackMinutes>=20);
  const options=compareOptions(s); assert.equal(options.length,4);
  for(const option of options) {
    const exact=planKitchen({...s,...option.patch});
    assert.equal(option.portions,exact.portions); assert.equal(option.cost,exact.cost);
    assert.ok(option.slackMinutes>=20);
  }
  assert.deepEqual(s,original);
  assert.equal(compareOptions({...s,burners:4,minutes:480}).length,1);
});
test('invalid buffers rejected and legacy input defaults to zero', () => {
  assert.equal(validateState(initialState).bufferMinutes,0);
  for(const bufferMinutes of [-1,61,1.5,'20']) assert.throws(()=>planKitchen({...initialState,bufferMinutes}));
  assert.throws(()=>planKitchen({...initialState,minutes:30,bufferMinutes:30}));
});
