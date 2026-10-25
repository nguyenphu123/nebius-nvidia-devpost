import { applyOperation, readiness, recovery, stock } from '../operations.mjs';

export const SCENARIO_MARKER = 'second-serving-recording-v1';
const note = `${SCENARIO_MARKER}: fictional recording data, not real food-safety approval.`;
const names = {
  branches: {receiving:'DEMO Shinjuku East',support:'DEMO Yotsuya Kitchen',nearby:'DEMO Akasaka Pickup'},
  dishes: {hero:'DEMO Chicken Karaage',other:'DEMO Veggie Rice Bowl'},
  ingredients: {chicken:'DEMO Chicken thigh',coating:'DEMO Karaage coating',oil:'DEMO Frying oil',rice:'DEMO Uncooked rice',vegetables:'DEMO Mixed vegetables'}
};
const matches = (items, name) => items.find(item => item.name.toLowerCase() === name.toLowerCase());
const marked = item => item?.description?.includes(SCENARIO_MARKER);

function summary(state, created) {
  const branches = Object.fromEntries(Object.entries(names.branches).map(([key,name]) => [key,matches(state.branches,name)]));
  const ingredients = Object.fromEntries(Object.entries(names.ingredients).map(([key,name]) => [key,matches(state.ingredients,name)]));
  return {
    created, scenario:SCENARIO_MARKER,
    branches:Object.fromEntries(Object.entries(branches).map(([key,b]) => [key,{id:b.id,name:b.name}])),
    dish:matches(state.dishes,names.dishes.hero), ingredients,
    receivingFryer:state.equipment.find(e=>e.branchId===branches.receiving.id&&e.name==='DEMO East Fryer 01'),
    expected:{servings:6,deadlineMinutes:60,etaMinutes:25,cost:650}
  };
}

// Uses the normal domain APIs. The PostgreSQL wrapper buffers the whole batch
// and persists once, under the same chain lock as operational writes.
export async function seedRecordingScenario(store, actor) {
  if (actor?.role !== 'admin' || actor.active === false) throw Error('An active administrator is required to add recording data.');
  const before = await store.operations(actor);
  const expectedGroups = [['branches',names.branches],['dishes',names.dishes],['ingredients',names.ingredients]];
  const found = expectedGroups.flatMap(([collection,group]) => Object.values(group).map(name=>({item:matches(before[collection],name),name})));
  if (found.some(({item})=>item)) {
    if (!found.every(({item})=>marked(item))) throw Error('Demo names already exist or the dataset is incomplete. Existing records were not changed.');
    const existing = summary(before,false);
    if (!existing.receivingFryer) throw Error('The existing demo dataset was changed. No records were reset or refilled.');
    return existing;
  }
  if (expectedGroups.some(([collection])=>before[collection].some(marked))) throw Error('A renamed demo dataset already exists. No records were changed.');

  const ingredientSpecs = {
    chicken:{unit:'kg',foodType:'fresh'},coating:{unit:'kg',foodType:'pantry'},
    oil:{unit:'l',foodType:'pantry'},rice:{unit:'kg',foodType:'pantry'},vegetables:{unit:'kg',foodType:'fresh'}
  };
  const ingredients = {};
  for (const [key,spec] of Object.entries(ingredientSpecs)) ingredients[key] = await store.operate(actor,'ingredient.save',{name:names.ingredients[key],...spec,description:note,active:true});
  const dish = await store.save('dishes',{name:names.dishes.hero,category:'Demo sides',price:480,description:`${note} Illustrative planning recipe only.`,allergens:'Demo notes: wheat and soy; verify actual recipe/cross-contact separately.',active:true},actor);
  const other = await store.save('dishes',{name:names.dishes.other,category:'Demo rice bowls',price:650,description:note,allergens:'Demo notes only; verify actual ingredients separately.',active:true},actor);
  await store.operate(actor,'recipe.save',{id:dish.id,recipe:[{ingredientId:ingredients.chicken.id,quantity:.2},{ingredientId:ingredients.coating.id,quantity:.03},{ingredientId:ingredients.oil.id,quantity:.02}],requiredEquipment:['fryer'],prepMinutes:8,packMinutes:3,maxTravelMinutes:20});
  await store.operate(actor,'recipe.save',{id:other.id,recipe:[{ingredientId:ingredients.rice.id,quantity:.1},{ingredientId:ingredients.vegetables.id,quantity:.08}],requiredEquipment:['rice-cooker'],prepMinutes:6,packMinutes:2,maxTravelMinutes:20});

  const branches = {};
  const specs = {
    receiving:{queue:0,capacity:20,stock:{chicken:2,coating:1,oil:1.5,rice:3,vegetables:2},assets:[['DEMO East Fryer 01','fryer'],['DEMO East Rice Cooker 01','rice-cooker']]},
    support:{queue:2,capacity:30,stock:{chicken:8,coating:2,oil:3,rice:5,vegetables:4},assets:[['DEMO Yotsuya Fryer 01','fryer'],['DEMO Yotsuya Rice Cooker 01','rice-cooker']]},
    nearby:{queue:0,capacity:15,stock:{rice:2,vegetables:2},assets:[['DEMO Akasaka Rice Cooker 01','rice-cooker']]}
  };
  for (const [key,spec] of Object.entries(specs)) {
    const dishIds = key==='nearby'?[other.id]:[dish.id,other.id];
    const b = branches[key] = await store.save('branches',{name:names.branches[key],address:'Tokyo — fictional demo location; travel times are scenario assumptions.',description:note,active:true,dishIds},actor);
    await store.operate(actor,'branch.configure',{id:b.id,hours:'11:00–22:00 (demo; status is set manually)',manager:'Demo shift manager',status:'open',queueMinutes:spec.queue,batchCapacity:spec.capacity,dishIds});
    for (const [name,type] of spec.assets) await store.operate(actor,'equipment.save',{branchId:b.id,name,type,status:'working',notes:note});
    for (const [ingredientKey,quantity] of Object.entries(spec.stock)) await store.operate(actor,'stock.move',{branchId:b.id,ingredientId:ingredients[ingredientKey].id,type:'receive',quantity,reason:`${SCENARIO_MARKER}: fictional opening stock for recording`});
  }
  await store.operate(actor,'route.save',{from:branches.support.id,to:branches.receiving.id,minutes:12,cost:650,approved:true});
  await store.operate(actor,'route.save',{from:branches.nearby.id,to:branches.receiving.id,minutes:5,cost:250,approved:true});
  return summary(await store.operations(actor),true);
}

// This exercises transitions on a clone, never on the persistent recording data.
// No claim is made that a physical meal has been cooked, dispatched or received.
export function simulateRecordingRecovery(snapshot, actor, scenario) {
  const data = structuredClone(snapshot);
  const receiving = scenario.branches.receiving.id, support = scenario.branches.support.id;
  const ingredient = scenario.ingredients.chicken.id, dishId = scenario.dish.id;
  const readyBefore = readiness(data,receiving,dishId);
  if (!readyBefore.canSell) throw Error('The recording recipient is not initially ready. No data was consumed.');
  const donorBefore = stock(data,support,ingredient), recipientBefore = stock(data,receiving,ingredient);
  const report = applyOperation(data,actor,'incident.create',{branchId:receiving,type:'equipment',targetId:scenario.receivingFryer.id,description:'DEMO: fryer stopped heating during lunch service.',equipmentStatus:'broken',confirmEquipment:true,confirmed:true});
  if (readiness(data,receiving,dishId).canSell) throw Error('The demo equipment fault did not block the intended dish.');
  applyOperation(data,actor,'incident.recovery',{id:report.id,dishId,portions:scenario.expected.servings,deadline:scenario.expected.deadlineMinutes,confirmed:true});
  const options = recovery(data,report.id), choice = options.find(o=>o.branchId===support);
  const nearby = options.find(o=>o.branchId===scenario.branches.nearby.id);
  if (!choice?.eligible || choice.eta!==scenario.expected.etaMinutes || choice.cost!==scenario.expected.cost || nearby?.eligible) throw Error('Recording preflight failed: the support branch is unavailable or the timing/route assumptions did not pass domain checks.');
  const transfer = applyOperation(data,actor,'transfer.request',{incidentId:report.id,from:support,confirmed:true});
  for (const status of ['approved','preparing','in_transit','received']) applyOperation(data,actor,'transfer.advance',{id:transfer.id,status});
  const received = data.transfers.find(t=>t.id===transfer.id);
  const donorAfter = stock(data,support,ingredient), recipientAfter = stock(data,receiving,ingredient);
  if (received.status!=='received' || donorAfter!==6.8 || recipientAfter!==recipientBefore) throw Error('Demo stock/receipt verification failed.');
  return {status:received.status,etaMinutes:choice.eta,donorChickenBefore:donorBefore,donorChickenAfter:donorAfter,recipientChickenBefore:recipientBefore,recipientChickenAfter:recipientAfter};
}
