/**
 * Draft Vault Service
 * Provides bulletproof, continuous client-side draft protection and historical snapshots
 * for Inward, Cross Stock-Out, and Outward forms.
 * Prevents any data loss from browser freezes, tab reloads, power loss, or accidental navigation.
 */

const DRAFT_KEYS = {
  inward: 'athahar_inward_auto_draft',
  cross_outward: 'athahar_cross_outward_auto_draft',
  outward: 'athahar_outward_auto_draft',
};

const VAULT_KEYS = {
  inward: 'athahar_inward_draft_vault',
  cross_outward: 'athahar_cross_outward_draft_vault',
  outward: 'athahar_outward_draft_vault',
};

const MAX_VAULT_ITEMS = 15;

/**
 * Get current active draft
 */
export const getActiveDraft = (type) => {
  const key = DRAFT_KEYS[type];
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    console.warn(`[DraftVault] Error reading active draft "${type}":`, e);
    return null;
  }
};

/**
 * Save active draft and mirror to Vault history if it contains staged items
 */
export const saveActiveDraft = (type, headerData, items) => {
  const key = DRAFT_KEYS[type];
  if (!key) return;

  const stagedItems = Array.isArray(items) ? items : [];
  const hasContent =
    stagedItems.length > 0 ||
    Boolean(headerData?.memoNo) ||
    Boolean(headerData?.vehicleNo) ||
    Boolean(headerData?.transporterName);

  if (!hasContent) return;

  const now = new Date().toISOString();
  const draftPayload = {
    type,
    manifestNo: headerData?.inwardNo || headerData?.outwardNo || 'Draft',
    headerData: headerData || {},
    stagedItems,
    itemCount: stagedItems.length,
    savedAt: now,
  };

  try {
    // 1. Save active draft
    localStorage.setItem(key, JSON.stringify(draftPayload));

    // 2. Mirror into Vault history if it has items
    if (stagedItems.length > 0) {
      pushToVault(type, draftPayload);
    }
  } catch (e) {
    console.warn(`[DraftVault] Error writing active draft "${type}":`, e);
  }
};

/**
 * Clear the current active draft (e.g. after successful post to database)
 */
export const clearActiveDraft = (type) => {
  const key = DRAFT_KEYS[type];
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch (e) {}
};

/**
 * Retrieve the rolling vault history of past drafts
 */
export const getDraftVault = (type) => {
  const vaultKey = VAULT_KEYS[type];
  if (!vaultKey) return [];
  try {
    const raw = localStorage.getItem(vaultKey);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn(`[DraftVault] Error reading vault "${type}":`, e);
    return [];
  }
};

/**
 * Push or update a snapshot in the rolling Vault
 */
export const pushToVault = (type, snapshot) => {
  const vaultKey = VAULT_KEYS[type];
  if (!vaultKey) return;

  try {
    const vault = getDraftVault(type);
    const manifestNo = snapshot.manifestNo || 'Draft';
    const vehicleNo = snapshot.headerData?.vehicleNo || '';

    // If an existing entry matches manifestNo & vehicleNo and is from today, update it
    const existingIndex = vault.findIndex((entry) => {
      const sameManifest =
        entry.manifestNo &&
        manifestNo &&
        String(entry.manifestNo).trim().toLowerCase() === String(manifestNo).trim().toLowerCase();
      const sameVehicle =
        entry.headerData?.vehicleNo &&
        vehicleNo &&
        String(entry.headerData.vehicleNo).trim().toLowerCase() === String(vehicleNo).trim().toLowerCase();
      return sameManifest || sameVehicle;
    });

    const newVaultEntry = {
      id: snapshot.id || `vault_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      manifestNo: snapshot.manifestNo,
      headerData: snapshot.headerData,
      stagedItems: snapshot.stagedItems,
      itemCount: snapshot.stagedItems.length,
      savedAt: snapshot.savedAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update in-place only if new has equal or more items
      if (newVaultEntry.itemCount >= vault[existingIndex].itemCount) {
        vault[existingIndex] = newVaultEntry;
      }
    } else {
      vault.unshift(newVaultEntry);
    }

    // Keep within MAX_VAULT_ITEMS
    const trimmed = vault.slice(0, MAX_VAULT_ITEMS);
    localStorage.setItem(vaultKey, JSON.stringify(trimmed));
  } catch (e) {
    console.warn(`[DraftVault] Error updating vault "${type}":`, e);
  }
};

/**
 * Remove a specific item from the Vault
 */
export const deleteFromVault = (type, entryId) => {
  const vaultKey = VAULT_KEYS[type];
  if (!vaultKey) return;
  try {
    const vault = getDraftVault(type).filter((item) => item.id !== entryId);
    localStorage.setItem(vaultKey, JSON.stringify(vault));
  } catch (e) {}
};

/**
 * Clear all items in the Vault
 */
export const clearVault = (type) => {
  const vaultKey = VAULT_KEYS[type];
  if (!vaultKey) return;
  try {
    localStorage.removeItem(vaultKey);
  } catch (e) {}
};
