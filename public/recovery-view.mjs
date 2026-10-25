const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recoveryDishes(state,incident){
 const branch=state.branches.find(b=>b.id===incident.branchId),asset=state.equipment.find(e=>e.id===incident.targetId);
 return state.dishes.filter(d=>d.active&&branch?.dishIds.includes(d.id)).map(d=>({id:d.id,name:d.name,related:incident.type==='equipment'?(d.requiredEquipment??[]).includes(asset?.type):incident.type==='stock'?(d.recipe??[]).some(r=>r.ingredientId===incident.targetId):false})).sort((a,b)=>Number(b.related)-Number(a.related)||a.name.localeCompare(b.name));
}
export function recoveryProgress(step){return `<ol class="recovery-steps" aria-label="Branch help progress">${['What is needed','Choose a branch','Send request'].map((name,i)=>`<li ${step===i+1?'aria-current="step"':''} class="${step>i+1?'complete':''}"><span>${step>i+1?'✓':i+1}</span>${name}</li>`).join('')}</ol>`;}
export function linkedTransfer(state,incidentId){return state.transfers.find(t=>t.incidentId===incidentId&&t.status!=='cancelled');}
function plainReason(reason,option,incident){
 if(reason==='No approved transport route.')return 'No approved delivery route to the receiving branch.';
 if(reason==='Dish transport policy is missing or exceeded.')return !option.transportLimit?'A maximum travel time must be set for this dish.':`Travel takes ${option.timing.travel} min; this dish allows ${option.transportLimit} min.`;
 if(reason==='Cannot meet the recorded deadline.')return Date.parse(incident.dueAt)<=Date.now()?'The customer deadline has passed.':option.eta===null?'Delivery time cannot be checked until a route is configured.':`The ${option.eta} min total cannot meet the customer deadline.`;
 if(reason==='Recipe quantities have not been configured.')return 'Set the per-serving recipe so ingredient availability can be checked.';
 return reason;
}
export function recoveryOptionsHTML({incident,options,isAdmin=false}){
 const ready=options.filter(o=>o.eligible),blocked=options.filter(o=>!o.eligible),esc=escape;
 const card=(o,index)=>{
  const reasons=o.reasons.filter(r=>!(r==='Insufficient ingredients for one serving.'&&o.reasons.some(x=>x.includes('servings available from ingredients.')))&&!(r==='Cannot meet the recorded deadline.'&&o.eta===null&&o.reasons.includes('No approved transport route.'))).map(r=>plainReason(r,o,incident));
  const timing=o.timing?`${o.timing.queue} min queue + ${o.timing.prepare} min prep + ${o.timing.pack} min packing + ${o.timing.travel??'unknown'} min travel`:'';
  const fixes=[];
  if(o.reasons.includes('Dish is inactive or not assigned to this branch.'))fixes.push(['recoverySourceMenu','Review source menu']);
  if(o.reasons.some(r=>r.startsWith('Working equipment required:')))fixes.push(['recoverySourceEquipment','Review source equipment']);
  if(o.reasons.some(r=>r.includes('servings available from ingredients.')||r.startsWith('Inactive ingredient:')))fixes.push(['recoverySourceStock','Review source inventory']);
  if(o.reasons.includes('Recipe quantities have not been configured.')||o.reasons.includes('Dish transport policy is missing or exceeded.')&&!o.transportLimit)fixes.push(['recoveryRecipe','Review dish setup']);
  if(o.reasons.includes('No approved transport route.'))fixes.push(['recoveryRoute','Set delivery route']);
  return `<article class="recovery-option ${o.eligible&&index===0?'recovery-best':''}"><div class="recovery-option-heading"><h3>${esc(o.name)}</h3><span class="badge ${o.eligible?'':'warn'}">${o.eligible?index===0?'Fastest available':'Available':'Unavailable'}</span></div><div class="recovery-facts"><strong>${o.eta===null?'Delivery time not set':`${o.eta} min total`}</strong><span>${o.cost===null?'Cost not set':`¥${Number(o.cost).toLocaleString('en-US')} transfer cost`}</span></div>${o.eligible?`<p>Can cover all ${incident.portions} requested servings.</p><details><summary>Time and capacity breakdown</summary><p>${esc(timing)}</p><p>${o.portions} servings supported by stock · ${o.capacity} batch capacity available.</p></details><button type="button" data-action="request" data-id="${esc(incident.id)}" data-from="${esc(o.branchId)}">Choose ${esc(o.name)} →</button>`:`<ul class="list">${reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>${isAdmin&&fixes.length?`<div class="actions">${fixes.map(([action,label])=>`<button type="button" class="quiet" data-action="${action}" data-id="${esc(incident.id)}" data-from="${esc(o.branchId)}">${label}</button>`).join('')}</div>`:''}`}</article>`;
 };
 if(!options.length)return '<div class="recovery-empty"><h3>No other branches to check</h3><p>Add another branch to the chain, assign its menu and set up a delivery route to this branch.</p></div>';
 return `${!ready.length?'<div class="recovery-empty"><h3>No branch can cover this request yet</h3><p>Review the missing setup below. Change request lets you revise the servings or agree a new deadline.</p></div>':`<p class="recovery-result-count"><strong>${ready.length} ${ready.length===1?'branch can':'branches can'} help</strong> · sorted by estimated total time</p><div class="recovery-options">${ready.map(card).join('')}</div>`}${blocked.length?`<details class="recovery-blocked" ${!ready.length?'open':''}><summary>Why ${blocked.length} ${blocked.length===1?'branch is':'branches are'} unavailable</summary><div class="recovery-options">${blocked.map(card).join('')}</div></details>`:''}`;
}
