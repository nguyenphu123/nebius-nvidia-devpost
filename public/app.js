const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = value => Number(value.toFixed(2)).toString();
const foodTypes = { unknown: 'Not specified', regular: 'Regular / pantry food', fresh: 'Fresh / raw food' };
let config, state, plan, approved = false, dirty = false, tab = 'timeline', pending = null, busy = false;
const form = $('#kitchen-form');
const storageKey = 'second-serving-kitchen-v2';
function saveKitchen() {
  try { localStorage.setItem(storageKey, JSON.stringify({ version: 2, state })); $('#save-status').textContent = 'Last built plan saved locally. Unbuilt edits and approvals are not saved.'; }
  catch { $('#save-status').textContent = 'Browser storage unavailable. Export your plan to keep it.'; }
}

async function api(path, body) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to complete the request.');
  return data;
}
function setForm() {
  for (const key of ['guests', 'budget', 'burners', 'volunteers', 'minutes']) form.elements[key].value = state[key];
  form.elements.bufferMinutes.value = state.bufferMinutes ?? 0;
  $('#inventory').replaceChildren();
  state.inventory.forEach(appendIngredient);
  updateInventoryCount();
}
function appendIngredient(item) {
  const row = document.createElement('div');
  row.className = 'ingredient-card'; row.dataset.id = item.id;
  const id = escapeHTML(item.id);
  row.innerHTML = `<div class="ingredient-name-row"><label for="name-${id}">Ingredient name<input id="name-${id}" data-field="name" type="text" maxlength="120" value="${escapeHTML(item.name)}" placeholder="e.g. Rau muống" required></label><button type="button" class="remove-ingredient" aria-label="Remove ${escapeHTML(item.name || 'ingredient')}" title="Remove ingredient">×</button></div><label for="description-${id}">Description <span class="optional">optional</span><input id="description-${id}" data-field="description" type="text" maxlength="300" value="${escapeHTML(item.description)}" placeholder="e.g. Fresh, washed; or 400 g per pack"></label><div class="ingredient-measure"><label for="quantity-${id}">Quantity<input id="quantity-${id}" data-field="quantity" type="number" min="0" max="1000000000" step="any" value="${escapeHTML(item.quantity)}" placeholder="0" required></label><label for="unit-${id}">Unit<input id="unit-${id}" data-field="unit" type="text" list="ingredient-units" maxlength="24" value="${escapeHTML(item.unit)}" placeholder="kg, g, packs…" required></label></div>`;
  const typeLabel = document.createElement('label');
  typeLabel.className = 'food-type-label';
  typeLabel.htmlFor = `food-type-${item.id}`;
  typeLabel.innerHTML = `Food type<select id="food-type-${id}" data-field="foodType">${Object.entries(foodTypes).map(([value, label]) => `<option value="${value}"${value === (item.foodType || 'unknown') ? ' selected' : ''}>${label}</option>`).join('')}</select>`;
  row.querySelector('.ingredient-measure').before(typeLabel);
  const mapping = document.createElement('details');
  mapping.className = 'mapping-editor';
  mapping.innerHTML = `<summary>Use in sample recipes</summary><p class="tiny muted">Kitchen lead: confirm suitability for the selected recipe role, preparation and allergens. This is your assumption, not an AI safety check. For packages, enter measured edible kg per unit.</p><label>Recipe role<select data-field="recipeRole"><option value="">No manual mapping</option>${config.ingredients.map(i => `<option value="${i.id}"${item.mapping?.ingredientId === i.id ? ' selected' : ''}>${escapeHTML(i.name)}</option>`).join('')}</select></label><label>Measured edible kg per unit<input data-field="kgPerUnit" type="number" min="0.000001" max="1000" step="any" value="${item.mapping?.kgPerUnit ?? (item.unit === 'kg' ? 1 : item.unit === 'g' ? .001 : '')}" placeholder="Weigh first; never guess"></label><label class="mapping-confirm"><input type="checkbox" data-field="mappingConfirmed"${item.mapping ? ' checked' : ''}> I confirm this ingredient fits this recipe role and the conversion is measured.</label>`;
  const extra = document.createElement('details');
  extra.className = 'ingredient-extra';
  const summary = document.createElement('summary'); summary.textContent = 'Description, food type & recipe use'; extra.append(summary);
  extra.append(row.querySelector('[data-field="description"]').closest('label'), typeLabel, mapping);
  row.append(extra);
  $('#inventory').append(row);
  return row;
}
function updateInventoryCount() {
  filterInventory();
  const count = $('#inventory').children.length;
  $('#inventory-count').textContent = `${count} ingredient${count === 1 ? '' : 's'}`;
  $('#inventory-feedback').textContent = count ? 'Any local name or unit is welcome. Descriptions are optional.' : 'Your pantry is empty. Add an ingredient to start.';
  $('#add-ingredient').disabled = busy || count >= 200;
}
function filterInventory() {
  const query = $('#inventory-search').value.trim().toLowerCase();
  let visible = 0;
  for (const row of $('#inventory').children) {
    row.hidden = !row.querySelector('[data-field="name"]').value.toLowerCase().includes(query);
    if (!row.hidden) visible++;
  }
  $('#search-status').textContent = query ? `${visible} matching ingredient${visible === 1 ? '' : 's'} · all ingredients remain in the plan` : '';
}
$('#inventory-search').addEventListener('input', filterInventory);
$('#inventory-search').addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
form.addEventListener('invalid', event => {
  const row = event.target.closest('.ingredient-card');
  if (row) { $('#inventory-search').value = ''; filterInventory(); }
  for (let parent = event.target.parentElement; parent && parent !== form; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
}, true);
function readForm() {
  if (!form.reportValidity()) return null;
  const inventory = [...$('#inventory').children].map(row => {
    const value = field => row.querySelector(`[data-field="${field}"]`).value;
    const item = { id: row.dataset.id, name: value('name'), description: value('description'), quantity: Number(value('quantity')), unit: value('unit'), foodType: value('foodType') };
    if (value('recipeRole')) {
      item.mapping = { ingredientId: value('recipeRole'), kgPerUnit: Number(value('kgPerUnit')), confirmed: row.querySelector('[data-field="mappingConfirmed"]').checked, signature: JSON.stringify([item.name.trim(), item.description.trim(), item.unit.trim().toLowerCase(), item.foodType]) };
    }
    return item;
  });
  return { ...Object.fromEntries(['guests', 'budget', 'burners', 'volunteers', 'minutes', 'bufferMinutes'].map(k => [k, Number(form.elements[k].value)])), inventory };
}
function message(text, kind = 'bot') {
  const node = document.createElement('div'); node.className = `message ${kind}`; node.textContent = text;
  $('#conversation').append(node); node.scrollIntoView({ block: 'nearest' });
}
function updateButtons() {
  document.body.classList.toggle('plan-dirty', dirty);
  $('#build').textContent = busy ? 'Updating…' : dirty ? 'Update my plan →' : 'Build kitchen plan →';
  $('#compare-options').disabled = !plan || dirty || busy;
  for (const field of $('#options-result').querySelectorAll('button, input')) field.disabled = dirty || busy;
  $('#approve').disabled = !plan || dirty || busy || plan.shortage > 0 || approved;
  $('#export').disabled = !plan || dirty || busy;
  $('#approve').textContent = approved ? 'Plan approved ✓' : 'Approve plan';
  $('#build').disabled = busy; $('#scenario').disabled = busy; $('#reset').disabled = busy; $('#send').disabled = busy;
  for (const field of form.querySelectorAll('input, select')) field.disabled = busy;
  for (const button of form.querySelectorAll('.remove-ingredient')) button.disabled = busy;
  $('#add-ingredient').disabled = busy || $('#inventory').children.length >= 200;
  $('#approval-copy').textContent = dirty ? 'Kitchen changed. Rebuild before approving.' : approved ? 'Approved for this session. Export your plan to keep a copy.' : plan?.shortage ? 'Resolve the portion shortfall before approval.' : 'Review the plan with your kitchen lead.';
}
function render() {
  const unmatched = plan.unplannedIngredients;
  $('#inventory-notice').hidden = !unmatched.length;
  $('#inventory-notice').textContent = unmatched.length ? `Not counted in recipes: ${unmatched.map(i => `${i.name} (${fmt(i.quantity)} ${i.unit})`).join(', ')}. Open “Use in sample recipes” on a row to confirm a suitable recipe role and measured weight. No automatic substitution or recipe generation.` : '';
  $('#buffer-status').textContent = `Finish at minute ${plan.finish}; ${plan.slackMinutes} minutes before service, including ${state.bufferMinutes} reserved. ${plan.slackMinutes < 15 ? 'Tight schedule: consider reserving more time and comparing options.' : 'Review these sample timing assumptions with your kitchen lead.'}`;
  $('#plan-status').className = plan.shortage ? 'status-warn' : 'status-ok';
  $('#plan-status').textContent = plan.shortage ? `△ ${plan.shortage} guests still need a meal. Current kitchen capacity is ${plan.portions} portions.` : `✓ ${plan.status} · ${plan.state.guests} guests covered within the entered limits.`;
  const metrics = [
    ['PORTIONS PLANNED', `${plan.portions}<small> / ${plan.state.guests}</small>`, plan.shortage ? `${plan.shortage} portions short` : 'Every guest accounted for'],
    ['EXTRA INGREDIENTS', `$${fmt(plan.cost)}`, `Within $${fmt(plan.state.budget)} purchase budget`],
    ['PANTRY STOCK USED', `${fmt(plan.inventoryUsage.reduce((sum, i) => sum + (i.factor ? i.usedQuantity * i.factor : 0), 0))}<small> kg</small>`, 'Matched weights in this plan']
  ];
  $('#metrics').innerHTML = metrics.map(([label, value, note]) => `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div><p>${note}</p></div>`).join('');
  $('#meals').innerHTML = plan.meals.length ? plan.meals.map(r => `<article class="meal"><div class="meal-number">${r.symbol}</div><div class="meal-info"><h3>${escapeHTML(r.name)}</h3><p>${escapeHTML(r.subtitle)}</p></div><div class="meal-qty">${r.portions}<span>portions</span></div></article>`).join('') : '<p class="muted">No complete batch fits these constraints. Add stock, budget or time.</p>';
  renderDetails(); updateButtons();
}
function renderDetails() {
  if (!plan) return;
  if (tab === 'timeline') {
    const row = (time, title, note) => `<div class="timeline-row"><div class="timeline-time">${time}</div><div class="timeline-job"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(note)}</span></div></div>`;
    $('#detail-content').innerHTML = plan.portions ? row(`0–${plan.prep} min`, 'Prep together', `${state.volunteers} volunteers · wash, portion and prepare ingredients`) + plan.schedule.map(j => row(`${j.start}–${j.end} min`, `Burner ${j.burner} · ${j.recipe}`, 'One batch · 10 portions')).join('') + row(`${plan.finish - plan.pack}–${plan.finish} min`, 'Pack & label', `All volunteers · ready with ${state.minutes - plan.finish} minutes to spare`) : '<p class="muted">A timeline will appear when a batch is feasible.</p>';
  } else if (tab === 'shopping') {
    $('#detail-content').innerHTML = plan.shopping.length ? plan.shopping.map(i => `<div class="data-row"><strong>${escapeHTML(i.name)}</strong><span>${fmt(i.quantity)} kg · $${fmt(i.quantity * i.price)}</span></div>`).join('') + '<p class="tiny muted">Sample prices. Confirm availability and delivery before prep.</p>' : '<p>No additional purchases planned.</p><p class="tiny muted">Oil, seasoning and water are assumed available.</p>';
  } else {
    $('#detail-content').innerHTML = plan.inventoryUsage.length ? plan.inventoryUsage.map(i => `<div class="data-row"><div><strong>${escapeHTML(i.name)}</strong><p class="tiny muted">${foodTypes[i.foodType] || foodTypes.unknown}</p>${i.description ? `<p class="tiny muted">${escapeHTML(i.description)}</p>` : ''}${i.reason ? `<p class="tiny unmatched">${escapeHTML(i.reason)}</p>` : ''}</div><span>${fmt(i.usedQuantity)} ${escapeHTML(i.unit)} used · ${fmt(i.remainingQuantity)} ${escapeHTML(i.unit)} left</span></div>`).join('') : '<p class="muted">No ingredients entered.</p>';
  }
}
async function rebuild(next, compare = true) {
  busy = true; updateButtons(); $('#plan-status').textContent = 'Checking recipe combinations, stock and cooking time…';
  try {
    const result = await api('/api/plan', { state: next });
    const previous = plan;
    state = result.state; plan = result; dirty = false; approved = false; setForm(); render(); saveKitchen(); $('#options-result').replaceChildren();
    const comparison = $('#plan-comparison');
    comparison.hidden = !previous || !compare;
    if (previous && compare) comparison.innerHTML = `<h3>What changed since the last plan</h3><div class="data-row"><strong>Guests</strong><span>${previous.state.guests} → ${plan.state.guests}</span></div><div class="data-row"><strong>Planned portions</strong><span>${previous.portions} → ${plan.portions}</span></div><div class="data-row"><strong>Uncovered guests</strong><span>${previous.shortage} → ${plan.shortage}</span></div><div class="data-row"><strong>Purchases</strong><span>$${fmt(previous.cost)} → $${fmt(plan.cost)}</span></div><div class="data-row"><strong>Finish after start</strong><span>${previous.finish} → ${plan.finish} min</span></div><p class="tiny muted">Calculated with sample recipes, not a prediction of real-world service.</p>`;
  }
  catch (error) { $('#plan-status').textContent = error.message; $('#plan-status').className = 'status-warn'; dirty = true; }
  finally { busy = false; updateButtons(); }
}
function clearProposal() { pending = null; $('#proposal').replaceChildren(); }

function markDirty() { dirty = true; approved = false; clearProposal(); updateButtons(); $('#plan-status').textContent = 'Settings changed. Build the plan to refresh results.'; $('#plan-status').className = 'status-warn'; }
form.addEventListener('input', event => {
  if (event.target.id === 'inventory-search') return;
  const row = event.target.closest('.ingredient-card');
  if (row && ['name','description','unit','foodType','recipeRole','kgPerUnit'].includes(event.target.dataset.field)) {
    row.querySelector('[data-field="mappingConfirmed"]').checked = false;
    if (event.target.dataset.field === 'unit') row.querySelector('[data-field="kgPerUnit"]').value = event.target.value.trim().toLowerCase() === 'kg' ? 1 : event.target.value.trim().toLowerCase() === 'g' ? .001 : '';
    let notice = row.querySelector('.mapping-notice');
    if (!notice) { notice = document.createElement('p'); notice.className = 'mapping-notice'; notice.setAttribute('role', 'status'); row.querySelector('.mapping-editor').before(notice); }
    notice.textContent = 'Ingredient details changed. Review “Use in sample recipes” below; unconfirmed custom ingredients are not counted.';
  }
  if (event.target.dataset.field === 'name') event.target.closest('.ingredient-card').querySelector('.remove-ingredient').setAttribute('aria-label', `Remove ${event.target.value || 'ingredient'}`);
  if (event.target.dataset.field === 'mappingConfirmed' && event.target.checked) row.querySelector('.mapping-notice')?.remove();
  markDirty();
});
$('#add-ingredient').addEventListener('click', () => {
  if (busy || $('#inventory').children.length >= 200) return;
  $('#inventory-search').value = '';
  const row = appendIngredient({ id: crypto.randomUUID(), name: '', description: '', quantity: '', unit: 'kg' });
  updateInventoryCount(); markDirty(); row.querySelector('[data-field="name"]').focus();
});
$('#inventory').addEventListener('click', event => {
  const button = event.target.closest('.remove-ingredient'); if (!button || busy) return;
  button.closest('.ingredient-card').remove(); updateInventoryCount(); markDirty(); $('#add-ingredient').focus();
});
form.addEventListener('submit', event => { event.preventDefault(); const next = readForm(); if (next) { clearProposal(); rebuild(next); } });
$('#reset').addEventListener('click', async () => { clearProposal(); $('#conversation').replaceChildren(); message("Sample kitchen restored. What's changing today?"); await rebuild(structuredClone(config.initialState), false); });
$('#scenario').addEventListener('click', async () => {
  const next = readForm(); if (!next) return;
  clearProposal();
  next.inventory.filter(i => i.mapping ? i.mapping.ingredientId === 'lentils' : i.name.trim().toLowerCase() === 'lentils (dry)' && !i.description.trim()).forEach(i => { i.quantity = 0; });
  next.guests = Math.min(300, next.guests + 20); next.burners = Math.max(1, next.burners - 1);
  message('Sample event: lentils unavailable, 20 additional guests, one fewer working burner.', 'user');
  await rebuild(next);
  if (!dirty) message(`Recalculated using the planning engine. ${plan.portions} portions fit; ${plan.shortage} guests remain uncovered. Review equipment, stock and service constraints before approving. No AI request was made for this sample event.`);
});
$('.tabs').addEventListener('click', event => { const button = event.target.closest('[data-tab]'); if (button) selectTab(button); });
function selectTab(button) {
  tab = button.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(b => { b.setAttribute('aria-selected', String(b === button)); b.tabIndex = b === button ? 0 : -1; });
  $('#detail-content').setAttribute('aria-labelledby', button.id); renderDetails();
}
$('.tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault(); const tabs = [...document.querySelectorAll('[data-tab]')]; const index = tabs.indexOf(document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  selectTab(tabs[next]); tabs[next].focus();
});
$('#approve').addEventListener('click', () => { if (!dirty && !plan.shortage) { approved = true; updateButtons(); $('#plan-status').textContent = '✓ Plan approved for this session. Any kitchen change will require a new review.'; } });
$('#export').addEventListener('click', () => {
  const report = { application: 'Second Serving', exportedAt: new Date().toISOString(), approved, ...plan, assumptions: 'Illustrative recipes and prices. Staff must verify availability, food handling and allergens. Not a nutrition assessment.' };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'second-serving-plan.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#assistant-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const current = readForm(); if (!current) return;
  const text = $('#message').value.trim(); if (!text) return;
  clearProposal(); message(text, 'user'); $('#message').value = ''; busy = true; updateButtons(); $('#send').textContent = 'Nemotron is reading your update…';
  try {
    const result = await api('/api/assistant', { state: current, message: text });
    message(result.summary + (result.question ? `\n\n${result.question}` : ''));
    if (Object.keys(result.changes).length) {
      pending = result.proposedState;
      const changes = Object.entries(result.changes).flatMap(([key, value]) => key === 'inventory' ? value.map(edit => { const item = current.inventory.find(i => i.id === edit.id); return `${item.name}: ${item.quantity} → ${edit.quantity} ${item.unit}`; }) : [`${key}: ${current[key]} → ${value}`]);
      $('#proposal').innerHTML = `<p><strong>Proposed kitchen update</strong></p><p>${changes.map(escapeHTML).join('<br>')}</p><button class="button primary full" id="apply-proposal">Apply & rebuild plan</button><button class="button secondary full" id="dismiss-proposal">Dismiss</button>`;
      $('#apply-proposal').addEventListener('click', async () => { const next = pending; clearProposal(); if (next) await rebuild(next); });
      $('#dismiss-proposal').addEventListener('click', clearProposal);
    }
  } catch (error) { message(error.message, 'error'); }
  finally { busy = false; updateButtons(); $('#send').innerHTML = 'Ask kitchen assistant <span>✳</span>'; }
});

$('#compare-options').addEventListener('click', async () => {
  if (dirty || busy || !plan) return;
  clearProposal(); busy = true; updateButtons();
  try {
    const result = await api('/api/options', { state });
    $('#options-result').innerHTML = result.options.map((o, index) => `<article class="option-card"><h3>${escapeHTML(o.title)}</h3><p>${o.portions}/${state.guests} portions · ${o.shortage} short · $${fmt(o.cost)}</p><p class="tiny">Finish ${o.finish} min · ${o.slackMinutes} min until service · ${o.bufferMinutes} reserved</p><p class="tiny muted">${escapeHTML(o.condition)}</p>${o.id !== 'current' ? `<label class="mapping-confirm"><input type="checkbox" id="option-confirm-${index}"> I have confirmed these changes.</label><button class="button secondary" data-option="${index}">Apply this option</button>` : ''}</article>`).join('');
    for (const button of $('#options-result').querySelectorAll('[data-option]')) button.addEventListener('click', async () => {
      if (dirty || busy) return;
      const index = Number(button.dataset.option);
      const confirm = $(`#option-confirm-${index}`);
      if (!confirm.checked) { confirm.focus(); return; }
      await rebuild({ ...state, ...result.options[index].patch });
    });
  } catch (error) { $('#options-result').textContent = error.message; }
  finally { busy = false; updateButtons(); }
});

try {
  config = await api('/api/config'); state = structuredClone(config.initialState);
  let restored = false;
  try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (saved?.version === 2 && saved.state) { const checked = await api('/api/plan', { state: saved.state }); state = checked.state; restored = true; } }
  catch { $('#save-status').textContent = 'Saved data unavailable or invalid; loaded sample kitchen.'; }
  setForm(); $('#engine').textContent = config.aiConfigured ? 'Nemotron Super · API key configured' : 'Nemotron Super · API key missing'; await rebuild(state);
  if (restored) $('#save-status').textContent = 'Restored your last built kitchen. Review again before approval.';
}
catch (error) { $('#plan-status').textContent = `Could not load kitchen: ${error.message}`; for (const b of document.querySelectorAll('button')) b.disabled = true; }
