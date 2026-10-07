import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';

seedInitialData();

export const getMasters = () => {
  return getStoredItem(STORAGE_KEYS.MASTERS);
};

export const addMasterItem = (category, item) => {
  const masters = getMasters();
  if (!masters[category]) masters[category] = [];
  
  const newItem = {
    ...item,
    id: `${category.slice(0, 2)}-${Date.now()}`,
    active: true,
  };
  
  masters[category].push(newItem);
  setStoredItem(STORAGE_KEYS.MASTERS, masters);
  return newItem;
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

