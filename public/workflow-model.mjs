export function branchIngredients(state,branchId){
 const b=state.branches.find(b=>b.id===branchId);
 const ids=new Set(b?.ingredientIds??[]);
 for(const d of state.dishes.filter(d=>b?.dishIds.includes(d.id)))for(const r of d.recipe??[])ids.add(r.ingredientId);
 for(const m of state.movements.filter(m=>m.branchId===branchId))ids.add(m.ingredientId);
 for(const s of state.stock.filter(s=>s.branchId===branchId&&(s.quantity!==0||s.reserved!==0)))ids.add(s.ingredientId);
 return state.ingredients.filter(i=>ids.has(i.id));
}
export function setupSteps(state,branchId){
 const b=state.branches.find(b=>b.id===branchId);
 if(!b)return [{label:'Create your first branch',done:false,action:'branch',id:''}];
 const dishes=state.dishes.filter(d=>b.dishIds.includes(d.id)&&d.active);
 const missing=dishes.filter(d=>!d.recipe?.length);
 const types=[...new Set(dishes.flatMap(d=>d.requiredEquipment??[]))];
 const absent=types.filter(type=>!state.equipment.some(e=>e.branchId===branchId&&e.type===type));
 const ingredients=branchIngredients(state,branchId),needed=new Set(dishes.flatMap(d=>(d.recipe??[]).map(r=>r.ingredientId)));
 const stockMissing=ingredients.filter(i=>needed.has(i.id)&&!(state.stock.find(s=>s.branchId===branchId&&s.ingredientId===i.id)?.quantity>0));
 return [
  {label:'Create shared menu items',done:state.dishes.some(d=>d.active),action:'dish',id:''},
  {label:`Assign menu to ${b.name}`,done:!!dishes.length,action:'configure',id:b.id},
  {label:'Create shared ingredient definitions',done:state.ingredients.some(i=>i.active),action:'ingredient',id:''},
  {label:missing.length?`Configure recipes: ${missing.map(d=>d.name).join(', ')}`:'Configure recipes for assigned dishes',done:!!dishes.length&&!missing.length,action:'recipe',id:missing[0]?.id??dishes[0]?.id??''},
  {label:absent.length?`Add required equipment: ${absent.join(', ')}`:'Register required equipment',done:!!dishes.length&&!missing.length&&!absent.length,action:'equipment',id:''},
  {label:stockMissing.length?`Receive stock: ${stockMissing.map(i=>i.name).join(', ')}`:'Receive opening stock',done:!!needed.size&&!stockMissing.length,action:'movement',id:stockMissing[0]?.id??''}
 ];
}
