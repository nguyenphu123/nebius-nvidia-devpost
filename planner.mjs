export const ingredients = [
  { id: 'rice', name: 'Rice (dry)', unit: 'kg', price: 2, maxBuy: 10, urgent: false },
  { id: 'lentils', name: 'Lentils (dry)', unit: 'kg', price: 4, maxBuy: 0, urgent: false },
  { id: 'chickpeas', name: 'Chickpeas (cooked)', unit: 'kg', price: 3, maxBuy: 8, urgent: false },
  { id: 'vegetables', name: 'Mixed vegetables', unit: 'kg', price: 2.5, maxBuy: 10, urgent: true },
  { id: 'tomatoes', name: 'Tomatoes', unit: 'kg', price: 2, maxBuy: 10, urgent: true },
  { id: 'bread', name: 'Bread', unit: 'kg', price: 2.5, maxBuy: 0, urgent: true }
];

// Illustrative batch recipes, not nutritional or food-safety certification.
// Each batch is 10 portions. Duration includes cooking; prep and packing follow below.
export const recipes = [
  { id: 'lentil', name: 'Tomato & lentil rice bowls', subtitle: 'Warm, comforting · plant-based', minutes: 35, needs: { rice: .8, lentils: .6, vegetables: .6, tomatoes: .5 }, symbol: '01' },
  { id: 'chickpea', name: 'Chickpea garden stew', subtitle: 'One-pot stew · served with bread', minutes: 25, needs: { chickpeas: 1, vegetables: .8, tomatoes: .6, bread: .6 }, symbol: '02' },
  { id: 'rice', name: 'Chickpea & vegetable rice', subtitle: 'Pantry-friendly · plant-based', minutes: 30, needs: { rice: .9, chickpeas: .8, vegetables: .8, tomatoes: .3 }, symbol: '03' }
];

export const initialState = {
  guests: 120, burners: 2, volunteers: 4, minutes: 240, budget: 30,
  inventory: ingredients.map((item, index) => ({
    id: item.id, name: item.name, description: '',
    quantity: [7, 5, 5, 9, 6, 4][index], unit: 'kg',
    foodType: ['regular', 'regular', 'unknown', 'fresh', 'fresh', 'regular'][index]
  }))
};

// Match only the exact sample names with no extra preparation description.
// A local name, changed description or incompatible unit stays in inventory,
// but is not silently treated as an equivalent sample ingredient.
export function matchSampleIngredient(item) {
  if (item.mapping) return ingredients.find(i => i.id === item.mapping.ingredientId) || null;
  if (item.description.trim()) return null;
  return ingredients.find(i => i.name.toLocaleLowerCase() === item.name.trim().toLocaleLowerCase()) || null;
}

export function resolveInventory(inventory) {
  const available = Object.fromEntries(ingredients.map(i => [i.id, 0]));
  const rows = inventory.map(item => {
    const match = matchSampleIngredient(item);
    const factor = item.mapping?.kgPerUnit ?? (item.unit === 'kg' ? 1 : item.unit === 'g' ? .001 : null);
    const matched = Boolean(match && factor);
    if (matched) available[match.id] += item.quantity * factor;
    return { ...item, ingredientId: matched ? match.id : null, factor: matched ? factor : null,
      reason: matched ? null : match ? 'This recipe needs a measured weight in kg or g.' : 'No matching sample recipe ingredient yet.' };
  });
  return { available, rows };
}

export function validateState(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Kitchen settings are required.');
  const ranges = { guests: [10, 300], burners: [1, 4], volunteers: [1, 12], minutes: [30, 480], budget: [0, 200] };
  const state = { inventory: [] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const value = raw[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (key !== 'budget' && !Number.isInteger(value))) throw new Error(`Invalid ${key}: use ${min}–${max}.`);
    state[key] = value;
  }
  state.bufferMinutes = raw.bufferMinutes ?? 0;
  if (!Number.isInteger(state.bufferMinutes) || state.bufferMinutes < 0 || state.bufferMinutes > 60 || state.bufferMinutes >= state.minutes) throw new Error('Reserve 0–60 minutes, less than the service window.');
  if (!Array.isArray(raw.inventory) || raw.inventory.length > 200) throw new Error('Inventory must be a list of up to 200 ingredients.');
  const ids = new Set();
  state.inventory = raw.inventory.map((item, index) => {
    const label = `Ingredient ${index + 1}`;
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error(`${label}: invalid or duplicate row ID.`);
    ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 120) throw new Error(`${label}: enter a name (up to 120 characters).`);
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 300)) throw new Error(`${label}: description must be up to 300 characters.`);
    if (typeof item.unit !== 'string' || !item.unit.trim() || item.unit.trim().length > 24) throw new Error(`${label}: enter a unit (up to 24 characters).`);
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity < 0 || item.quantity > 1e9) throw new Error(`${label}: enter a non-negative quantity up to 1 billion.`);
    const foodType = item.foodType === undefined ? 'unknown' : item.foodType;
    if (!['unknown', 'regular', 'fresh'].includes(foodType)) throw new Error(`${label}: choose a valid food type.`);
    const row = { id: item.id, name: item.name.trim(), description: (item.description || '').trim(), quantity: item.quantity, unit: item.unit.trim().toLowerCase(), foodType };
    if (item.mapping != null) {
      const m = item.mapping;
      if (!m || !ingredients.some(i => i.id === m.ingredientId) || m.confirmed !== true || typeof m.kgPerUnit !== 'number' || !Number.isFinite(m.kgPerUnit) || m.kgPerUnit <= 0 || m.kgPerUnit > 1000) throw new Error(`${label}: recipe mapping needs a confirmed category and measured edible kg per unit.`);
      if ((row.unit === 'kg' && m.kgPerUnit !== 1) || (row.unit === 'g' && m.kgPerUnit !== .001)) throw new Error(`${label}: kg/g must use exact mass conversion.`);
      const signature = JSON.stringify([row.name, row.description, row.unit, row.foodType]);
      if (m.signature !== signature) throw new Error(`${label}: ingredient details changed. Reconfirm its recipe mapping.`);
      row.mapping = { ingredientId: m.ingredientId, kgPerUnit: m.kgPerUnit, confirmed: true, signature };
    }
    return row;
  });
  return state;
}

function evaluate(counts, state) {
  const batches = counts.reduce((a, b) => a + b, 0);
  // Aggregate labor stages; one volunteer can prep/pack 10 portions per 8/4 minutes.
  const prep = Math.ceil(batches * 8 / state.volunteers);
  const pack = Math.ceil(batches * 4 / state.volunteers);
  const lanes = Array(state.burners).fill(prep);
  const jobs = recipes.flatMap((r, i) => Array.from({ length: counts[i] }, () => r)).sort((a, b) => b.minutes - a.minutes);
  const schedule = [];
  for (const recipe of jobs) {
    const lane = lanes.indexOf(Math.min(...lanes));
    const start = lanes[lane];
    lanes[lane] += recipe.minutes;
    schedule.push({ recipe: recipe.name, burner: lane + 1, start, end: lanes[lane] });
  }
  const finish = Math.max(...lanes) + pack;
  if (finish > state.minutes - state.bufferMinutes) return null;
  const used = Object.fromEntries(ingredients.map(i => [i.id, 0]));
  recipes.forEach((r, index) => Object.entries(r.needs).forEach(([id, qty]) => { used[id] += qty * counts[index]; }));
  const shopping = ingredients.map(i => ({ ...i, quantity: Math.max(0, used[i.id] - state.inventory[i.id]) })).filter(i => i.quantity > .00001);
  if (shopping.some(i => i.quantity > i.maxBuy + .00001)) return null;
  const cost = shopping.reduce((sum, i) => sum + i.quantity * i.price, 0);
  if (cost > state.budget + .00001) return null;
  const urgentUsed = ingredients.filter(i => i.urgent).reduce((sum, i) => sum + Math.min(used[i.id], state.inventory[i.id]), 0);
  return { counts, portions: batches * 10, finish, prep, pack, schedule, used, shopping, cost, urgentUsed };
}

export function planKitchen(raw) {
  const state = validateState(raw);
  const resolved = resolveInventory(state.inventory);
  const calculationState = { ...state, inventory: resolved.available };
  const maxBatches = Math.ceil(state.guests / 10);
  let best = null;
  // Exhaustive search of recipe combinations; each receives a feasible greedy schedule.
  // Maximize covered guests, then use-soon stock, then minimize purchasing.
  for (let a = 0; a <= maxBatches; a++) for (let b = 0; b <= maxBatches - a; b++) for (let c = 0; c <= maxBatches - a - b; c++) {
    const candidate = evaluate([a, b, c], calculationState);
    if (!candidate) continue;
    const score = Math.min(candidate.portions, state.guests) * 10000 + candidate.urgentUsed * 100 - candidate.cost;
    if (!best || score > best.score) best = { ...candidate, score };
  }
  const shortage = Math.max(0, state.guests - best.portions);
  const remainingUse = { ...best.used };
  const inventoryUsage = resolved.rows.map(item => {
    const usedKg = item.ingredientId ? Math.min(item.quantity * item.factor, remainingUse[item.ingredientId]) : 0;
    if (item.ingredientId) remainingUse[item.ingredientId] -= usedKg;
    const usedQuantity = item.factor ? usedKg / item.factor : 0;
    return { ...item, usedQuantity, remainingQuantity: Math.max(0, item.quantity - usedQuantity) };
  });
  return {
    ...best, shortage, state, inventoryUsage, slackMinutes: state.minutes - best.finish,
    unplannedIngredients: inventoryUsage.filter(i => !i.ingredientId),
    status: shortage ? 'Needs a decision' : 'Ready for review',
    meals: recipes.map((r, i) => ({ ...r, portions: best.counts[i] * 10 })).filter(r => r.portions),
    leftovers: ingredients.map(i => ({ ...i, quantity: Math.max(0, resolved.available[i.id] - best.used[i.id]) })),
    notes: [
      shortage ? `The current constraints leave ${shortage} guests without a planned portion. Add cooking time, equipment, or an outside meal source.` : `All ${state.guests} guests have a planned portion within the entered limits.`,
      best.shopping.length ? 'Purchases are assumed to arrive before prep starts. Confirm availability before approving.' : 'This plan uses stock already entered in the kitchen.',
      'Sample recipes exclude dairy. Verify ingredient labels and cross-contact procedures with the kitchen lead.'
    ]
  };
}

// Independent what-if calculations. Never mutate or apply the user's state.
export function compareOptions(raw) {
  const state = validateState(raw);
  const candidates = [
    { id: 'current', title: 'Current resources', patch: {}, condition: 'No resource changes.' },
    ...(state.burners < 4 ? [{ id: 'burner', title: 'One additional burner', patch: { burners: state.burners + 1 }, condition: 'Confirm a compatible burner and cookware are available before prep.' }] : []),
    ...(state.minutes < 480 ? [{ id: 'time', title: '60 more minutes', patch: { minutes: Math.min(480, state.minutes + 60) }, condition: 'Confirm a later service time with the kitchen lead.' }] : []),
    ...(state.burners < 4 && state.minutes < 480 ? [{ id: 'both', title: 'Burner + 60 minutes', patch: { burners: state.burners + 1, minutes: Math.min(480, state.minutes + 60) }, condition: 'Confirm both the extra burner and later service time.' }] : [])
  ];
  return candidates.map(option => {
    const p = planKitchen({ ...state, ...option.patch });
    return { ...option, portions: p.portions, shortage: p.shortage, cost: p.cost, finish: p.finish, slackMinutes: p.slackMinutes, bufferMinutes: p.state.bufferMinutes };
  });
}
