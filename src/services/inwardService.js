import { getStoredItem, setStoredItem, setStoredItemLocalOnly, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { STATUS } from '../utils/constants';
import { compareDescendingDocNo } from '../utils/numberUtils';

seedInitialData();

export const getAllInwards = () => {
  const raw = getStoredItem(STORAGE_KEYS.INWARDS);
  if (!Array.isArray(raw)) return [];
  return [...raw].sort((a, b) =>
    compareDescendingDocNo(a.inwardNo, b.inwardNo, a.date, b.date, a.id, b.id)
  );
};

export const getNextInwardNo = (inwardsList) => {
  const list = inwardsList || getAllInwards();
  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);

  const fromInwards = (list || [])
    .map((item) => {
      const match = String(item.inwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const fromItems = (inwardItems || [])
    .map((item) => {
      const match = String(item.inwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const serialNums = [...fromInwards, ...fromItems]
    .filter((num) => !isNaN(num) && num > 0 && num < 1000);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `INW-${String(nextNum).padStart(2, '0')}`;
};

let cachedInwardItems = null;
let lastRawInwardItemsRef = null;
let cachedPendingStock = null;
let lastInwardItemsForPendingRef = null;
let cachedPendingMap = null;
let lastPendingItemsRef = null;

export const clearInwardCaches = () => {
  cachedInwardItems = null;
  lastRawInwardItemsRef = null;
  cachedPendingStock = null;
  lastInwardItemsForPendingRef = null;
  cachedPendingMap = null;
  lastPendingItemsRef = null;
};

export const getAllInwardItems = () => {
  const rawList = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
  if (!Array.isArray(rawList)) return [];

  if (cachedInwardItems && rawList === lastRawInwardItemsRef) {
    return cachedInwardItems;
  }

  const seenMap = new Map();
  let hasDuplicates = false;

  for (const item of rawList) {
    if (!item) continue;
    const inwKey = String(item.inwardNo || item.inwardId || '').trim().toLowerCase();
    const lrKey = String(item.lrNo ?? '').trim().toLowerCase();
    // Unique key respects distinct items (item.id), preventing deletion of multiple LRs
    const uniqueKey = item.id ? String(item.id).trim() : `${inwKey}__${lrKey}__${item.consigneeName || ''}__${item.pkg || ''}`;

    if (!uniqueKey) continue;

    if (!seenMap.has(uniqueKey)) {
      seenMap.set(uniqueKey, item);
    } else {
      hasDuplicates = true;
      const existing = seenMap.get(uniqueKey);
      const isDelivered =
        existing.status === STATUS.DELIVERED ||
        item.status === STATUS.DELIVERED ||
        Boolean(item.outwardNo && item.outwardNo !== '-' && !item.outwardNo.toUpperCase().startsWith('STOCK-OUT'));

      const resolvedOutNo =
        item.outwardNo && item.outwardNo !== '-' ? item.outwardNo : existing.outwardNo;
      const resolvedOutDate =
        item.outwardDate && item.outwardDate !== '-' ? item.outwardDate : existing.outwardDate;

      seenMap.set(uniqueKey, {
        ...existing,
        ...item,
        status: isDelivered ? STATUS.DELIVERED : (existing.status || item.status || STATUS.PENDING),
        outwardNo: resolvedOutNo || existing.outwardNo || item.outwardNo || '-',
        outwardDate: resolvedOutDate || existing.outwardDate || item.outwardDate || '-',
        pkg: Math.max(Number(existing.pkg) || 0, Number(item.pkg) || 0),
        toPayAmount: Math.max(Number(existing.toPayAmount) || 0, Number(item.toPayAmount) || 0),
        tbbAmount: Math.max(Number(existing.tbbAmount) || 0, Number(item.tbbAmount) || 0),
        paidAmount: Math.max(Number(existing.paidAmount) || 0, Number(item.paidAmount) || 0),
      });
    }
  }

  const deduplicated = Array.from(seenMap.values());
  if (hasDuplicates && deduplicated.length !== rawList.length) {
    setStoredItemLocalOnly(STORAGE_KEYS.INWARD_ITEMS, deduplicated);
  }
  cachedInwardItems = deduplicated;
  lastRawInwardItemsRef = deduplicated;
  return deduplicated;
};

export const getPendingStockItems = () => {
  const items = getAllInwardItems();
  if (cachedPendingStock && items === lastInwardItemsForPendingRef) {
    return cachedPendingStock;
  }

  const seenMap = new Map();

  for (const item of items) {
    if (!item) continue;
    // Exclude delivered or already dispatched items
    if (item.status === STATUS.DELIVERED) continue;
    if (item.outwardNo && item.outwardNo !== '-' && !item.outwardNo.toUpperCase().startsWith('STOCK-OUT')) {
      continue;
    }
    if (item.status !== STATUS.PENDING) continue;

    const uniqueKey = item.id
      ? String(item.id).trim()
      : `${item.inwardNo || ''}_${item.lrNo}_${item.consigneeName || ''}_${item.pkg || ''}`;

    if (!seenMap.has(uniqueKey)) {
      seenMap.set(uniqueKey, item);
    } else {
      const existing = seenMap.get(uniqueKey);
      seenMap.set(uniqueKey, { ...existing, ...item });
    }
  }

  const pendingList = Array.from(seenMap.values()).sort((a, b) =>
    compareDescendingDocNo(a.inwardNo, b.inwardNo, a.date || a.inwardDate, b.date || b.inwardDate, a.id, b.id)
  );
  cachedPendingStock = pendingList;
  lastInwardItemsForPendingRef = items;
  return pendingList;
};

/**
 * Resolves the transporter name for an inward item, checking item.transporterName
 * and falling back to its parent inward header.
 */
export const resolveItemTransporter = (item, inwardsList = null) => {
  if (item?.transporterName && String(item.transporterName).trim() && String(item.transporterName).trim() !== '-') {
    return String(item.transporterName).trim();
  }
  const inwards = inwardsList || getAllInwards();
  const parentInw = inwards.find(
    (inw) => (item?.inwardId && inw.id === item.inwardId) || (item?.inwardNo && inw.inwardNo === item.inwardNo)
  );
  return String(parentInw?.transporterName || '').trim();
};

// High-performance in-memory index for Pending Stock to turn 30-million-iteration scans into instant O(1) lookups
export const getPendingStockIndex = () => {
  const items = getPendingStockItems();
  if (cachedPendingMap && items === lastPendingItemsRef) {
    return cachedPendingMap;
  }

  const inwards = getAllInwards();
  const inwardsMap = new Map();
  for (const inw of inwards || []) {
    if (inw.id) inwardsMap.set(String(inw.id).toLowerCase(), inw);
    if (inw.inwardNo) inwardsMap.set(String(inw.inwardNo).toLowerCase(), inw);
  }

  const map = new Map();
  for (const item of items || []) {
    const lr = String(item.lrNo ?? '').trim().toLowerCase();
    if (!lr) continue;
    let trans = String(item.transporterName ?? '').trim();
    let parent = null;
    if (item.inwardId) parent = inwardsMap.get(String(item.inwardId).toLowerCase());
    if (!parent && item.inwardNo) parent = inwardsMap.get(String(item.inwardNo).toLowerCase());

    if (!trans || trans === '-') {
      trans = parent?.transporterName || '';
    }

    const itemWithMeta = {
      ...item,
      resolvedTransporter: trans,
      parentInward: parent,
    };

    if (!map.has(lr)) map.set(lr, []);
    map.get(lr).push(itemWithMeta);
  }

  cachedPendingMap = map;
  lastPendingItemsRef = items;
  return map;
};

/**
 * Checks if an LR number is already present in Pending Stock.
 * Scoped by Transporter: Different transport carriers maintain independent LR books and CAN share the same LR number.
 * Ultra-fast O(1) lookup avoiding browser freeze.
 */
export const checkDuplicatePendingLR = (lrNo, transporterName = '', excludeInwardId = null) => {
  const cleanLR = String(lrNo ?? '').trim().toLowerCase();
  if (!cleanLR) return false;

  const index = getPendingStockIndex();
  const candidates = index.get(cleanLR);
  if (!candidates || candidates.length === 0) return false;

  const targetTransporter = String(transporterName ?? '').trim().toLowerCase();
  const excludeStr = excludeInwardId ? String(excludeInwardId).toLowerCase() : null;

  return candidates.some((item) => {
    if (excludeStr && (
      (item.inwardId && String(item.inwardId).toLowerCase() === excludeStr) ||
      (item.inwardNo && String(item.inwardNo).toLowerCase() === excludeStr) ||
      (item.id && String(item.id).toLowerCase() === excludeStr)
    )) {
      return false;
    }

    if (targetTransporter && item.resolvedTransporter) {
      if (item.resolvedTransporter.toLowerCase() !== targetTransporter) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Retrieves details of an existing pending item that shares the same LR number and transporter.
 * Ultra-fast O(1) lookup avoiding browser freeze.
 */
export const getDuplicatePendingLRDetails = (lrNo, transporterName = '', excludeInwardId = null) => {
  const cleanLR = String(lrNo ?? '').trim().toLowerCase();
  if (!cleanLR) return null;

  const index = getPendingStockIndex();
  const candidates = index.get(cleanLR);
  if (!candidates || candidates.length === 0) return null;

  const targetTransporter = String(transporterName ?? '').trim().toLowerCase();
  const excludeStr = excludeInwardId ? String(excludeInwardId).toLowerCase() : null;

  const matched = candidates.find((item) => {
    if (excludeStr && (
      (item.inwardId && String(item.inwardId).toLowerCase() === excludeStr) ||
      (item.inwardNo && String(item.inwardNo).toLowerCase() === excludeStr) ||
      (item.id && String(item.id).toLowerCase() === excludeStr)
    )) {
      return false;
    }

    if (targetTransporter && item.resolvedTransporter) {
      if (item.resolvedTransporter.toLowerCase() !== targetTransporter) {
        return false;
      }
    }

    return true;
  });

  if (!matched) return null;

  const parentInward = matched.parentInward;

  return {
    id: matched.id,
    lrNo: matched.lrNo,
    inwardNo: matched.inwardNo || parentInward?.inwardNo || '-',
    date: matched.inwardDate || matched.date || parentInward?.date || '-',
    transporterName: matched.transporterName || parentInward?.transporterName || targetTransporter || '-',
    vehicleNo: matched.vehicleNo || parentInward?.vehicleNo || '-',
    pkg: matched.pkg || 0,
    consignorName: matched.consignorName || '-',
    consigneeName: matched.consigneeName || '-',
    ctTo: matched.ctTo || '-',
    toPayAmount: Number(matched.toPayAmount) || 0,
    tbbAmount: Number(matched.tbbAmount) || 0,
    paidAmount: Number(matched.paidAmount) || 0,
  };
};

/**
 * Finds all items in a list that already exist in Pending Stock for the given transporter.
 */
export const findDuplicatePendingLRs = (lrItems, defaultTransporter = '', excludeInwardId = null) => {
  if (!Array.isArray(lrItems)) return [];
  const duplicates = [];
  for (const item of lrItems) {
    const cleanLR = String(item.lrNo ?? '').trim();
    if (!cleanLR || cleanLR === '...') continue;
    const itemTransporter = String(item.transporterName || defaultTransporter || '').trim();
    const existing = getDuplicatePendingLRDetails(cleanLR, itemTransporter, excludeInwardId);
    if (existing) {
      duplicates.push({
        currentItem: item,
        existing,
      });
    }
  }
  return duplicates;
};

export const createInward = (headerData, lrItems, currentUser = 'Operator', allowPendingDuplicates = false) => {
  // Validate LR entries
  if (!lrItems || lrItems.length === 0) {
    throw new Error('Inward must contain at least one LR entry.');
  }

  const inwardTransporter = String(headerData.transporterName || '').trim();

  // Validate that LR entries are not blank and verify pending duplicates
  for (const item of lrItems) {
    const cleanLR = String(item.lrNo).trim();
    if (!cleanLR) {
      throw new Error('LR No. cannot be empty.');
    }

    const itemTransporter = String(item.transporterName || inwardTransporter).trim();
    if (!allowPendingDuplicates && checkDuplicatePendingLR(cleanLR, itemTransporter)) {
      const transMsg = itemTransporter ? ` for transporter "${itemTransporter}"` : '';
      throw new Error(`LR No. "${cleanLR}"${transMsg} is already present in Pending Stock.`);
    }
  }

  const inwards = getAllInwards();
  const inwardItems = getAllInwardItems();

  const inwardId = `inw-${Date.now()}`;
  const totalQty = lrItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = lrItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = lrItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = lrItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

  const consignorName = Array.from(new Set(lrItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(lrItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const newInwardHeader = {
    id: inwardId,
    inwardNo: headerData.inwardNo || getNextInwardNo(inwards),
    date: headerData.date,
    transporterName: headerData.transporterName || 'ATHAHAR ROADWAYS MAIN',
    vehicleNo: headerData.vehicleNo || 'MH-04-FK-1234',
    driverName: headerData.driverName || 'RAMESH KUMAR',
    ownerName: headerData.ownerName || '',
    from: headerData.from || headerData.fromStation || 'MUMBAI',
    memoNo: headerData.memoNo || '',
    consignorName,
    consigneeName,
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    createdAt: new Date().toISOString(),
    createdBy: currentUser,
  };

  const newItems = lrItems.map((item, index) => ({
    id: `item-${Date.now()}-${index}`,
    inwardId,
    inwardNo: newInwardHeader.inwardNo,
    inwardDate: headerData.date,
    transporterName: newInwardHeader.transporterName,
    vehicleNo: newInwardHeader.vehicleNo,
    driverName: newInwardHeader.driverName,
    ownerName: newInwardHeader.ownerName,
    from: item.from || headerData.from || 'MUMBAI',
    memoNo: newInwardHeader.memoNo,
    srNo: index + 1,
    lrNo: String(item.lrNo).trim(),
    date: item.date || headerData.date,
    pkg: Number(item.pkg) || 1,
    invoiceNo: item.invoiceNo || '',
    ctTo: item.ctTo || item.destinationStation || 'SANGLI',
    consignorName: item.consignorName || '',
    consignorAddress: item.consignorAddress || '',
    consignorGst: item.consignorGst || '',
    consigneeName: item.consigneeName || '',
    consigneeAddress: item.consigneeAddress || '',
    consigneeGst: item.consigneeGst || '',
    freight: Number(item.freight) || 0,
    hamali: Number(item.hamali) || 0,
    otherCharges: Number(item.otherCharges) || 0,
    statCharges: Number(item.statCharges) || 0,
    totalFreight: Number(item.totalFreight) || Number(item.toPayAmount) || 0,
    paymentType: item.paymentType || 'TOPAY',
    toPayAmount: Number(item.toPayAmount) || (item.paymentType === 'TOPAY' ? Number(item.totalFreight) : 0),
    tbbAmount: Number(item.tbbAmount) || (item.paymentType === 'TBB' ? Number(item.totalFreight) : 0),
    paidAmount: Number(item.paidAmount) || (item.paymentType === 'PAID' ? Number(item.totalFreight) : 0),
    status: STATUS.PENDING,
    createdAt: new Date().toISOString(),
  }));

  inwards.push(newInwardHeader);
  inwards.sort((a, b) =>
    compareDescendingDocNo(a.inwardNo, b.inwardNo, a.date, b.date, a.id, b.id)
  );
  const updatedInwardItems = [...newItems, ...inwardItems];

  clearInwardCaches();
  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);

  return newInwardHeader;
};

export const deleteInward = (inwardId) => {
  let inwards = getAllInwards();
  let inwardItems = getAllInwardItems();

  inwards = inwards.filter((inv) => inv.id !== inwardId);
  inwardItems = inwardItems.filter((item) => item.inwardId !== inwardId);

  clearInwardCaches();
  clearInwardCaches();
  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  return true;
};

export const deleteInwardItem = (itemId) => {
  let inwardItems = getAllInwardItems();
  let inwards = getAllInwards();

  const targetItem = inwardItems.find((item) => item.id === itemId);
  if (!targetItem) return false;

  inwardItems = inwardItems.filter((item) => item.id !== itemId);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);

  // Recalculate totals for parent inward header
  const parentInwardId = targetItem.inwardId;
  if (parentInwardId) {
    const parentItems = inwardItems.filter((item) => item.inwardId === parentInwardId);
    inwards = inwards.map((inv) => {
      if (inv.id === parentInwardId) {
        return {
          ...inv,
          totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
          totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
          totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
          totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
        };
      }
      return inv;
    });
    setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  }

  return true;
};

export const updateInwardHeader = (inwardId, updatedFields) => {
  let inwards = getAllInwards();
  let inwardItems = getAllInwardItems();

  inwards = inwards.map((inv) =>
    inv.id === inwardId ? { ...inv, ...updatedFields } : inv
  ).sort((a, b) =>
    compareDescendingDocNo(a.inwardNo, b.inwardNo, a.date, b.date, a.id, b.id)
  );

  // Propagate updated header fields down to child items
  inwardItems = inwardItems.map((item) => {
    if (item.inwardId === inwardId) {
      return {
        ...item,
        vehicleNo: updatedFields.vehicleNo ?? item.vehicleNo,
        inwardVehicleNo: updatedFields.vehicleNo ?? item.inwardVehicleNo ?? item.vehicleNo,
        driverName: updatedFields.driverName ?? item.driverName,
        inwardDriverName: updatedFields.driverName ?? item.inwardDriverName ?? item.driverName,
        ownerName: updatedFields.ownerName ?? item.ownerName,
        inwardOwnerName: updatedFields.ownerName ?? item.inwardOwnerName ?? item.ownerName,
        memoNo: updatedFields.memoNo ?? item.memoNo,
        from: updatedFields.from ?? item.from,
        date: updatedFields.date ?? item.date,
        inwardDate: updatedFields.date ?? item.inwardDate,
      };
    }
    return item;
  });

  clearInwardCaches();
  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  return true;
};

export const updateInwardItem = (itemId, updatedFields) => {
  let inwardItems = getAllInwardItems();
  let inwards = getAllInwards();
  let outwardItems = getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS);
  let outwards = getStoredItem(STORAGE_KEYS.OUTWARDS);

  const oldItem = inwardItems.find((item) => item.id === itemId);

  inwardItems = inwardItems.map((item) => {
    if (item.id === itemId) {
      const pkg = updatedFields.pkg !== undefined ? Number(updatedFields.pkg) : item.pkg;
      const freight = updatedFields.freight !== undefined ? Number(updatedFields.freight) : item.freight;
      const hamali = updatedFields.hamali !== undefined ? Number(updatedFields.hamali) : item.hamali;
      const otherCharges = updatedFields.otherCharges !== undefined ? Number(updatedFields.otherCharges) : item.otherCharges;
      const statCharges = updatedFields.statCharges !== undefined ? Number(updatedFields.statCharges) : item.statCharges;
      const totalFreight = freight + hamali + otherCharges + statCharges;
      const paymentType = updatedFields.paymentType || item.paymentType;
      
      const toPayAmount = updatedFields.toPayAmount !== undefined
        ? Number(updatedFields.toPayAmount)
        : (paymentType === 'TOPAY' ? totalFreight : 0);
      const tbbAmount = updatedFields.tbbAmount !== undefined
        ? Number(updatedFields.tbbAmount)
        : (paymentType === 'TBB' ? totalFreight : 0);
      const paidAmount = updatedFields.paidAmount !== undefined
        ? Number(updatedFields.paidAmount)
        : (paymentType === 'PAID' ? totalFreight : 0);

      return {
        ...item,
        ...updatedFields,
        pkg,
        freight,
        hamali,
        otherCharges,
        statCharges,
        totalFreight,
        paymentType,
        toPayAmount,
        tbbAmount,
        paidAmount,
      };
    }
    return item;
  });

  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);

  const targetItem = inwardItems.find((item) => item.id === itemId);

  // Sync with outwardItems if this LR was already delivered
  if (targetItem && outwardItems.length > 0) {
    let outwardChanged = false;
    outwardItems = outwardItems.map((outItem) => {
      const isIdMatch = outItem.inwardItemId === targetItem.id || outItem.id === targetItem.id;
      const isLinkedOutward = targetItem.outwardNo && outItem.outwardNo &&
        String(outItem.outwardNo).trim().toLowerCase() === String(targetItem.outwardNo).trim().toLowerCase() &&
        (oldItem && String(outItem.lrNo).trim().toLowerCase() === String(oldItem.lrNo).trim().toLowerCase());

      if (isIdMatch || isLinkedOutward) {
        outwardChanged = true;
        return {
          ...outItem,
          lrNo: targetItem.lrNo,
          inwardDate: targetItem.inwardDate || targetItem.date,
          pkg: targetItem.pkg,
          invoiceNo: targetItem.invoiceNo,
          ctTo: targetItem.ctTo,
          consignorName: targetItem.consignorName,
          consigneeName: targetItem.consigneeName,
          toPayAmount: targetItem.toPayAmount,
          tbbAmount: targetItem.tbbAmount,
          paidAmount: targetItem.paidAmount,
        };
      }
      return outItem;
    });

    if (outwardChanged) {
      setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
      outwards = outwards.map((out) => {
        const childOutItems = outwardItems.filter(
          (i) => i.outwardId === out.id || i.outwardNo === out.outwardNo
        );
        return {
          ...out,
          totalQty: childOutItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
          totalToPay: childOutItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
          totalTbb: childOutItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
          totalPaid: childOutItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
        };
      });
      setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
    }
  }

  // Recalculate totals for parent inward header
  if (targetItem && (targetItem.inwardId || targetItem.inwardNo)) {
    const parentItems = inwardItems.filter(
      (item) =>
        (targetItem.inwardId && item.inwardId === targetItem.inwardId) ||
        (targetItem.inwardNo && item.inwardNo === targetItem.inwardNo)
    );
    const consignorName = Array.from(new Set(parentItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
    const consigneeName = Array.from(new Set(parentItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');
    inwards = inwards.map((inv) => {
      if (inv.id === targetItem.inwardId || inv.inwardNo === targetItem.inwardNo) {
        return {
          ...inv,
          consignorName,
          consigneeName,
          totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
          totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
          totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
          totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
        };
      }
      return inv;
    });
    setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  }

  return true;
};

export const updateFullInward = (inwardId, headerData, lrItems, currentUser = 'Operator', allowPendingDuplicates = false) => {
  if (!lrItems || lrItems.length === 0) {
    throw new Error('Inward must contain at least one LR entry.');
  }

  let inwards = getAllInwards();
  let inwardItems = getAllInwardItems();
  let outwardItems = getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS);
  let outwards = getStoredItem(STORAGE_KEYS.OUTWARDS);

  const existingHeader = inwards.find(
    (inv) =>
      inv.id === inwardId ||
      (headerData.inwardNo && inv.inwardNo === headerData.inwardNo)
  );
  const resolvedInwardId = existingHeader ? existingHeader.id : inwardId || `inw-${Date.now()}`;
  const existingChildItems = inwardItems.filter(
    (item) =>
      item.inwardId === resolvedInwardId ||
      (existingHeader && item.inwardNo === existingHeader.inwardNo) ||
      (headerData.inwardNo && item.inwardNo === headerData.inwardNo)
  );
  const existingChildIds = new Set(existingChildItems.map((i) => i.id));

  // Check duplicate LR in current submission or pending database (excluding items belonging to this inward)
  const seenLRs = new Set();
  const currentTransporter = String(headerData.transporterName || '').trim();

  for (const item of lrItems) {
    const cleanLR = String(item.lrNo ?? '').trim();
    if (!cleanLR) {
      throw new Error('LR No. cannot be empty.');
    }

    const itemTransporter = String(item.transporterName || currentTransporter).trim();
    if (!allowPendingDuplicates && checkDuplicatePendingLR(cleanLR, itemTransporter, resolvedInwardId)) {
      const transMsg = itemTransporter ? ` for transporter "${itemTransporter}"` : '';
      throw new Error(`LR No. "${cleanLR}"${transMsg} is already present in Pending Stock.`);
    }
  }

  const totalQty = lrItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = lrItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = lrItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = lrItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

  const consignorName = Array.from(new Set(lrItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(lrItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const updatedHeaderFields = {
    id: resolvedInwardId,
    inwardNo: headerData.inwardNo || existingHeader?.inwardNo || `INW-${inwards.length + 9000}`,
    date: headerData.date,
    transporterName: headerData.transporterName || 'ATHAHAR ROADWAYS MAIN',
    vehicleNo: headerData.vehicleNo || 'MH-04-FK-1234',
    driverName: headerData.driverName || 'RAMESH KUMAR',
    ownerName: headerData.ownerName || '',
    from: headerData.from || headerData.fromStation || 'MUMBAI',
    memoNo: headerData.memoNo || '',
    consignorName,
    consigneeName,
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser,
  };

  if (existingHeader) {
    inwards = inwards.map((inv) =>
      inv.id === resolvedInwardId ? { ...inv, ...updatedHeaderFields } : inv
    );
  } else {
    inwards.push({
      ...updatedHeaderFields,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    });
  }
  inwards.sort((a, b) =>
    compareDescendingDocNo(a.inwardNo, b.inwardNo, a.date, b.date, a.id, b.id)
  );

  // Track old LR numbers to sync with outwardItems even if LR No was renamed
  const oldLrByItemId = new Map();
  existingChildItems.forEach((old) => {
    if (old.id) oldLrByItemId.set(old.id, old.lrNo);
  });

  const rebuiltItems = lrItems.map((item, index) => {
    const cleanLR = String(item.lrNo ?? '').trim();
    const matchedOld =
      existingChildItems.find((old) => old.id && (old.id === item.id || old.id === item.inwardItemId)) ||
      existingChildItems.find((old) => String(old.lrNo ?? '').trim().toLowerCase() === cleanLR.toLowerCase()) ||
      (existingChildItems.length === lrItems.length ? existingChildItems[index] : null);

    const itemDate = item.date || headerData.date;

    return {
      ...(matchedOld || {}),
      id: matchedOld?.id || item.id || `item-${Date.now()}-${index}`,
      inwardId: resolvedInwardId,
      inwardNo: updatedHeaderFields.inwardNo,
      inwardDate: headerData.date || itemDate,
      transporterName: updatedHeaderFields.transporterName,
      vehicleNo: updatedHeaderFields.vehicleNo,
      driverName: updatedHeaderFields.driverName,
      ownerName: updatedHeaderFields.ownerName,
      from: updatedHeaderFields.from,
      memoNo: updatedHeaderFields.memoNo,
      srNo: index + 1,
      lrNo: cleanLR,
      date: itemDate,
      pkg: Number(item.pkg) || 1,
      invoiceNo: item.invoiceNo || '',
      ctTo: item.ctTo || item.destinationStation || 'SANGLI',
      consignorName: item.consignorName || '',
      consignorAddress: item.consignorAddress || '',
      consignorGst: item.consignorGst || '',
      consigneeName: item.consigneeName || '',
      consigneeAddress: item.consigneeAddress || '',
      consigneeGst: item.consigneeGst || '',
      freight: Number(item.freight) || 0,
      hamali: Number(item.hamali) || 0,
      otherCharges: Number(item.otherCharges) || 0,
      statCharges: Number(item.statCharges) || 0,
      totalFreight: Number(item.totalFreight) || Number(item.toPayAmount) || 0,
      paymentType: item.paymentType || 'TOPAY',
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      status: matchedOld?.status || item.status || STATUS.PENDING,
      createdAt: matchedOld?.createdAt || new Date().toISOString(),
    };
  });

  const rebuiltIds = new Set(rebuiltItems.map((i) => i.id));
  const otherInwardItems = inwardItems.filter(
    (item) =>
      item.inwardId !== resolvedInwardId &&
      !existingChildIds.has(item.id) &&
      !rebuiltIds.has(item.id)
  );
  const updatedInwardItems = [...rebuiltItems, ...otherInwardItems];

  // Also synchronize any matching outwardItems and outward headers so delivered LRs reflect the edits everywhere
  if (outwardItems && outwardItems.length > 0) {
    let outwardUpdated = false;
    outwardItems = outwardItems.map((outItem) => {
      const matchedInward = rebuiltItems.find((reb) => {
        const oldLr = oldLrByItemId.get(reb.id);
        const isIdMatch = (outItem.inwardItemId && outItem.inwardItemId === reb.id) || outItem.id === reb.id;
        const isSameInward = outItem.inwardNo && (existingHeader?.inwardNo || headerData.inwardNo) &&
          String(outItem.inwardNo).trim().toLowerCase() === String(existingHeader?.inwardNo || headerData.inwardNo).trim().toLowerCase();

        return (
          isIdMatch ||
          (isSameInward && oldLr && String(outItem.lrNo ?? '').trim().toLowerCase() === String(oldLr).trim().toLowerCase()) ||
          (isSameInward && String(outItem.lrNo ?? '').trim().toLowerCase() === String(reb.lrNo).trim().toLowerCase())
        );
      });

      if (matchedInward) {
        outwardUpdated = true;
        return {
          ...outItem,
          inwardItemId: matchedInward.id,
          lrNo: matchedInward.lrNo,
          inwardDate: matchedInward.inwardDate || matchedInward.date,
          pkg: matchedInward.pkg,
          invoiceNo: matchedInward.invoiceNo,
          ctTo: matchedInward.ctTo,
          consignorName: matchedInward.consignorName,
          consigneeName: matchedInward.consigneeName,
          toPayAmount: matchedInward.toPayAmount,
          tbbAmount: matchedInward.tbbAmount,
          paidAmount: matchedInward.paidAmount,
        };
      }
      return outItem;
    });

    if (outwardUpdated) {
      setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
      outwards = outwards.map((out) => {
        const childOutItems = outwardItems.filter(
          (i) => i.outwardId === out.id || i.outwardNo === out.outwardNo
        );
        const outConsignors = Array.from(new Set(childOutItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
        const outConsignees = Array.from(new Set(childOutItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');
        return {
          ...out,
          consignorName: outConsignors || out.consignorName,
          consigneeName: outConsignees || out.consigneeName,
          totalQty: childOutItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
          totalToPay: childOutItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
          totalTbb: childOutItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
          totalPaid: childOutItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
        };
      });
      setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
    }
  }

  clearInwardCaches();
  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);

  return inwards.find((inv) => inv.id === resolvedInwardId);
};

