import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { INITIAL_MASTERS } from '../utils/constants';

seedInitialData();

export const getMasters = () => {
  const data = getStoredItem(STORAGE_KEYS.MASTERS, INITIAL_MASTERS);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ...INITIAL_MASTERS };
  }
  const merged = { ...INITIAL_MASTERS, ...data };
  if (!merged.expenseCategories || !Array.isArray(merged.expenseCategories) || merged.expenseCategories.length === 0) {
    merged.expenseCategories = [...INITIAL_MASTERS.expenseCategories];
  }
  return merged;
};

export const addMasterItem = (category, item) => {
  const masters = getMasters();
  if (!masters[category]) masters[category] = [];

  const rawVal = item.name || item.vehicleNo || item.ownerName || '';
  const cleanVal = String(rawVal).trim();

  // Deduplicate if already present
  if (cleanVal) {
    const existing = masters[category].find((m) => {
      const existingVal = String(m.name || m.vehicleNo || m.ownerName || '').trim();
      return existingVal.toLowerCase() === cleanVal.toLowerCase();
    });
    if (existing) {
      return existing;
    }
  }

  const newItem = {
    ...item,
    id: `${category.slice(0, 2)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    active: true,
  };

  masters[category].push(newItem);
  setStoredItem(STORAGE_KEYS.MASTERS, masters);
  return newItem;
};

export const ensureMasterItem = (category, valOrObj) => {
  if (!category || !valOrObj) return null;

  const rawVal =
    typeof valOrObj === 'string'
      ? valOrObj
      : valOrObj.name || valOrObj.vehicleNo || valOrObj.ownerName || '';

  const cleanName = String(rawVal).trim();
  // Don't save placeholder or empty values
  if (!cleanName || cleanName === '...' || cleanName === '-' || cleanName.length < 2) {
    return null;
  }

  const masters = getMasters();
  if (!masters[category]) masters[category] = [];

  // Check case-insensitive if it already exists
  const existing = masters[category].find((item) => {
    const itemVal = String(item.name || item.vehicleNo || item.ownerName || '').trim();
    return itemVal.toLowerCase() === cleanName.toLowerCase();
  });

  if (existing) {
    return existing; // Already in master list
  }

  const upperVal = cleanName.toUpperCase();
  let newItem = typeof valOrObj === 'object' && valOrObj !== null ? { ...valOrObj } : {};

  newItem = {
    ...newItem,
    id: `${category.slice(0, 2)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: category === 'expenseCategories' ? cleanName : upperVal,
    active: true,
  };

  if (category === 'vehicles') {
    newItem.vehicleNo = upperVal;
    if (!newItem.type) newItem.type = 'Own';
    if (!newItem.capacity) newItem.capacity = '10 Ton';
  } else if (category === 'owners') {
    newItem.ownerName = upperVal;
  } else if (category === 'stations') {
    if (!newItem.state) newItem.state = 'MH';
  }

  masters[category].push(newItem);
  setStoredItem(STORAGE_KEYS.MASTERS, masters);
  return newItem;
};

export const ensureMultipleMasterItems = (entries = []) => {
  if (!entries || !entries.length) return false;

  const masters = getMasters();
  let changed = false;

  entries.forEach(({ category, value, extra = {} }) => {
    if (!category || !value) return;

    const rawVal =
      typeof value === 'string'
        ? value
        : value.name || value.vehicleNo || value.ownerName || '';
    const cleanName = String(rawVal).trim();
    if (!cleanName || cleanName === '...' || cleanName === '-' || cleanName.length < 2) {
      return;
    }

    if (!masters[category]) masters[category] = [];

    const exists = masters[category].some((item) => {
      const itemVal = String(item.name || item.vehicleNo || item.ownerName || '').trim();
      return itemVal.toLowerCase() === cleanName.toLowerCase();
    });

    if (!exists) {
      const upperVal = cleanName.toUpperCase();
      let newItem = {
        ...extra,
        id: `${category.slice(0, 2)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: upperVal,
        active: true,
      };

      if (category === 'vehicles') {
        newItem.vehicleNo = upperVal;
        if (!newItem.type) newItem.type = 'Own';
        if (!newItem.capacity) newItem.capacity = '10 Ton';
      } else if (category === 'owners') {
        newItem.ownerName = upperVal;
      } else if (category === 'stations') {
        if (!newItem.state) newItem.state = 'MH';
      }

      masters[category].push(newItem);
      changed = true;
    }
  });

  if (changed) {
    setStoredItem(STORAGE_KEYS.MASTERS, masters);
  }
  return changed;
};

export const updateMasterItem = (category, id, updatedFields) => {
  const masters = getMasters();
  if (!masters[category]) return null;

  masters[category] = masters[category].map((item) =>
    item.id === id ? { ...item, ...updatedFields } : item
  );
  setStoredItem(STORAGE_KEYS.MASTERS, masters);
  return true;
};

export const deleteMasterItem = (category, id) => {
  const masters = getMasters();
  if (!masters[category]) return null;

  masters[category] = masters[category].filter((item) => item.id !== id);
  setStoredItem(STORAGE_KEYS.MASTERS, masters);
  return true;
};
