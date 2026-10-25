import { validateState } from './planner.mjs';

// The assistant can adjust existing row quantities; names, descriptions and
// units belong to the manual inventory editor and must never be overwritten.
export function applyAssistantChanges(state, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid proposed changes.');
  const allowed = ['guests', 'burners', 'volunteers', 'minutes', 'budget', 'inventory'];
  if (Object.keys(raw).some(key => !allowed.includes(key))) throw new Error('The assistant proposed an unsupported field. No changes applied.');
  const changes = {};
  for (const key of allowed.filter(key => key !== 'inventory')) if (Object.hasOwn(raw, key)) changes[key] = raw[key];
  const inventory = state.inventory.map(item => ({ ...item }));
  if (Object.hasOwn(raw, 'inventory')) {
    if (!Array.isArray(raw.inventory)) throw new Error('Inventory changes must be a list.');
    const ids = new Set();
    changes.inventory = raw.inventory.map(edit => {
      if (!edit || typeof edit !== 'object' || Object.keys(edit).some(key => !['id', 'quantity'].includes(key))) throw new Error('The assistant may only change the quantity of existing ingredients.');
      const item = inventory.find(item => item.id === edit.id);
      if (!item || ids.has(edit.id)) throw new Error('The assistant referenced an unknown or duplicate ingredient.');
      ids.add(edit.id);
      item.quantity = edit.quantity;
      return { id: edit.id, quantity: edit.quantity };
    });
    if (!changes.inventory.length) delete changes.inventory;
  }
  return { changes, proposedState: validateState({ ...state, ...changes, inventory }) };
}
