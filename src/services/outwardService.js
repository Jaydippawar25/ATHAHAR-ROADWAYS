import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { STATUS } from '../utils/constants';

seedInitialData();

let cachedOutwards = null;
let lastRawOutwardsRef = null;
let lastInwardItemsRef = null;
let lastExistingOutItemsRef = null;
let cachedOutwardItems = null;
let lastRawOutwardItemsRef = null;
let lastOutwardsRefForItems = null;
let lastInwardItemsRefForItems = null;

export const clearOutwardCaches = () => {
  cachedOutwards = null;
  lastRawOutwardsRef = null;
  lastInwardItemsRef = null;
  lastExistingOutItemsRef = null;
  cachedOutwardItems = null;
  lastRawOutwardItemsRef = null;
  lastOutwardsRefForItems = null;
  lastInwardItemsRefForItems = null;
};

export const getAllOutwards = () => {
  const rawList = getStoredItem(STORAGE_KEYS.OUTWARDS, []);
  if (!Array.isArray(rawList)) return [];

  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
  const existingOutItems = getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, []);

  if (
    cachedOutwards &&
    rawList === lastRawOutwardsRef &&
    inwardItems === lastInwardItemsRef &&
    existingOutItems === lastExistingOutItemsRef
  ) {
    return cachedOutwards;
  }

  // Pre-index existingOutItems and inwardItems for O(1) lightning lookups
  const outItemsByOutwardNo = new Map();
  const outItemsByOutwardId = new Map();
  if (Array.isArray(existingOutItems)) {
    for (const o of existingOutItems) {
      if (!o) continue;
      const k = String(o.outwardNo || '').trim().toLowerCase();
      if (k) {
        if (!outItemsByOutwardNo.has(k)) outItemsByOutwardNo.set(k, []);
        outItemsByOutwardNo.get(k).push(o);
      }
      if (o.outwardId) {
        if (!outItemsByOutwardId.has(o.outwardId)) outItemsByOutwardId.set(o.outwardId, []);
        outItemsByOutwardId.get(o.outwardId).push(o);
      }
    }
  }

  const inwItemsByOutwardNo = new Map();
  if (Array.isArray(inwardItems)) {
    for (const i of inwardItems) {
      if (!i) continue;
      const k = String(i.outwardNo || '').trim().toLowerCase();
      if (k) {
        if (!inwItemsByOutwardNo.has(k)) inwItemsByOutwardNo.set(k, []);
        inwItemsByOutwardNo.get(k).push(i);
      }
    }
  }

  // Deduplicate by normalized outwardNo to eliminate any duplicate entries in storage
  const seenMap = new Map();
  let hasDuplicates = false;

  for (const item of rawList) {
    if (!item) continue;
    const key = String(item.outwardNo || item.id || '').trim().toLowerCase();
    if (!key) continue;

    // Standard outward receipts do not use vehicle owner or memo no; clean those fields out
    const isCross = item.isCrossOutward || String(item.outwardNo || '').toUpperCase().startsWith('STOCK-OUT');
    const cleanedItem = isCross
      ? item
      : {
          ...item,
          ownerName: '',
          memoNo: '',
        };

    if (!seenMap.has(key)) {
      seenMap.set(key, cleanedItem);
    } else {
      hasDuplicates = true;
      const existing = seenMap.get(key);
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const currTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (currTime >= existingTime) {
        seenMap.set(key, { ...existing, ...cleanedItem });
      }
    }
  }

  // Self-healing: Check inwardItems for any delivered items whose outward header is missing from outwards
  if (Array.isArray(inwardItems)) {
    const missingByNo = new Map();
    for (const inwItem of inwardItems) {
      const outNo = String(inwItem.outwardNo || '').trim();
      if (!outNo || outNo === '-' || outNo.toUpperCase().startsWith('STOCK-OUT')) continue;
      const key = outNo.toLowerCase();
      if (!seenMap.has(key)) {
        if (!missingByNo.has(key)) missingByNo.set(key, []);
        missingByNo.get(key).push(inwItem);
      }
    }

    if (missingByNo.size > 0) {
      for (const [key, group] of missingByNo.entries()) {
        const first = group[0];
        const outNo = first.outwardNo;
        const totalQty = group.reduce((s, i) => s + (Number(i.pkg) || 0), 0);
        const totalToPay = group.reduce((s, i) => s + (Number(i.toPayAmount) || 0), 0);
        const totalTbb = group.reduce((s, i) => s + (Number(i.tbbAmount) || 0), 0);
        const totalPaid = group.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
        const consignorName = Array.from(new Set(group.map((i) => i.consignorName).filter(Boolean))).join(', ');
        const consigneeName = Array.from(new Set(group.map((i) => i.consigneeName).filter(Boolean))).join(', ');

        const matchedOutItem = (outItemsByOutwardNo.get(key) || [])[0];
        const vehicleNo =
          matchedOutItem?.outwardVehicleNo ||
          matchedOutItem?.vehicleNo ||
          Array.from(new Set(group.map((i) => i.outwardVehicleNo).filter(Boolean)))[0] ||
          '';
        const driverName =
          matchedOutItem?.outwardDriverName ||
          matchedOutItem?.driverName ||
          Array.from(new Set(group.map((i) => i.outwardDriverName).filter(Boolean)))[0] ||
          '';
        const deliveryPersonName =
          matchedOutItem?.deliveryPersonName ||
          Array.from(new Set(group.map((i) => i.deliveryPersonName).filter(Boolean))).join(', ') ||
          '';
        const transporterName =
          matchedOutItem?.outwardTransporterName ||
          matchedOutItem?.transporterName ||
          Array.from(new Set(group.map((i) => i.outwardTransporterName).filter(Boolean)))[0] ||
          '';
        const fromStation =
          matchedOutItem?.from ||
          matchedOutItem?.fromStation ||
          Array.from(new Set(group.map((i) => i.outwardFromStation).filter(Boolean)))[0] ||
          'SANGLI';
        const date = first.outwardDate || matchedOutItem?.outwardDate || first.date || new Date().toISOString().slice(0, 10);
        const outwardId = first.outwardId || matchedOutItem?.outwardId || `out-${Date.now()}`;

        const reconstructedHeader = {
          id: outwardId,
          outwardNo: outNo,
          date,
          transporterName,
          vehicleNo,
          driverName,
          ownerName: '',
          deliveryPersonName,
          from: fromStation,
          fromStation,
          memoNo: '',
          consignorName,
          consigneeName,
          isCrossOutward: false,
          totalQty,
          totalToPay,
          totalTbb,
          totalPaid,
          createdAt: first.deliveredAt || new Date().toISOString(),
          createdBy: first.deliveredBy || 'ATHARVA',
        };
        seenMap.set(key, reconstructedHeader);
        hasDuplicates = true;
      }
    }
  }

  // Reconcile and standardize outward fields across all existing/previous outward headers
  for (const [key, item] of seenMap.entries()) {
    const isCross = item.isCrossOutward || String(item.outwardNo || '').toUpperCase().startsWith('STOCK-OUT');
    if (isCross) continue;

    const matchedOutByNo = outItemsByOutwardNo.get(key) || [];
    const matchedOutById = item.id ? (outItemsByOutwardId.get(item.id) || []) : [];
    const matchedOutItems = matchedOutById.length > 0 ? matchedOutById : matchedOutByNo;
    const matchedInwItems = inwItemsByOutwardNo.get(key) || [];

    const resolvedTransporter =
      item.outwardTransporterName ||
      item.transporterName ||
      matchedOutItems.find((i) => i.outwardTransporterName)?.outwardTransporterName ||
      matchedInwItems.find((i) => i.outwardTransporterName)?.outwardTransporterName ||
      matchedOutItems.find((i) => i.transporterName)?.transporterName ||
      '';

    const resolvedFrom =
      item.outwardFromStation ||
      item.from ||
      item.fromStation ||
      matchedOutItems.find((i) => i.outwardFromStation)?.outwardFromStation ||
      matchedInwItems.find((i) => i.outwardFromStation)?.outwardFromStation ||
      matchedOutItems.find((i) => i.from || i.fromStation)?.from ||
      'SANGLI';

    const resolvedVehicle =
      item.outwardVehicleNo ||
      item.vehicleNo ||
      matchedOutItems.find((i) => i.outwardVehicleNo)?.outwardVehicleNo ||
      matchedInwItems.find((i) => i.outwardVehicleNo)?.outwardVehicleNo ||
      matchedOutItems.find((i) => i.vehicleNo)?.vehicleNo ||
      '';

    const resolvedDriver =
      item.outwardDriverName ||
      item.driverName ||
      matchedOutItems.find((i) => i.outwardDriverName)?.outwardDriverName ||
      matchedInwItems.find((i) => i.outwardDriverName)?.outwardDriverName ||
      matchedOutItems.find((i) => i.driverName)?.driverName ||
      '';

    const resolvedDelPerson =
      item.deliveryPersonName ||
      matchedOutItems.find((i) => i.deliveryPersonName && i.deliveryPersonName !== '-')?.deliveryPersonName ||
      matchedInwItems.find((i) => i.deliveryPersonName && i.deliveryPersonName !== '-')?.deliveryPersonName ||
      '';

    const updated = {
      ...item,
      transporterName: resolvedTransporter,
      outwardTransporterName: resolvedTransporter,
      from: resolvedFrom,
      fromStation: resolvedFrom,
      outwardFromStation: resolvedFrom,
      vehicleNo: resolvedVehicle,
      outwardVehicleNo: resolvedVehicle,
      driverName: resolvedDriver,
      outwardDriverName: resolvedDriver,
      deliveryPersonName: resolvedDelPerson,
      ownerName: '',
      memoNo: '',
    };

    if (
      item.transporterName !== updated.transporterName ||
      item.from !== updated.from ||
      item.fromStation !== updated.fromStation ||
      item.vehicleNo !== updated.vehicleNo ||
      item.driverName !== updated.driverName ||
      item.deliveryPersonName !== updated.deliveryPersonName ||
      item.ownerName !== '' ||
      item.memoNo !== ''
    ) {
      hasDuplicates = true;
      seenMap.set(key, updated);
    }
  }

  const finalizedList = Array.from(seenMap.values());
  if (hasDuplicates) {
    setStoredItem(STORAGE_KEYS.OUTWARDS, finalizedList);
  }
  cachedOutwards = finalizedList;
  lastRawOutwardsRef = rawList;
  lastInwardItemsRef = inwardItems;
  lastExistingOutItemsRef = existingOutItems;
  return finalizedList;
};

export const getNextOutwardNo = (outwardsList) => {
  const list = (outwardsList || getAllOutwards()).filter((item) => !item.isCrossOutward);
  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
  const outwardItems = getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, []);

  const fromOutwards = list
    .map((item) => {
      const match = String(item.outwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const fromInwardItems = (inwardItems || [])
    .map((item) => {
      if (!item.outwardNo || String(item.outwardNo).toUpperCase().startsWith('STOCK-OUT')) return NaN;
      const match = String(item.outwardNo).match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const fromOutwardItems = (outwardItems || [])
    .map((item) => {
      if (!item.outwardNo || String(item.outwardNo).toUpperCase().startsWith('STOCK-OUT')) return NaN;
      const match = String(item.outwardNo).match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const serialNums = [...fromOutwards, ...fromInwardItems, ...fromOutwardItems]
    .filter((num) => !isNaN(num) && num > 0 && num < 1000);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `OUT-${String(nextNum).padStart(2, '0')}`;
};

export const getNextCrossOutwardNo = (outwardsList) => {
  const list = (outwardsList || getAllOutwards()).filter((item) => item.isCrossOutward || String(item.outwardNo || '').toUpperCase().startsWith('STOCK-OUT'));
  const outwardItems = getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, []);

  const fromOutwards = list
    .map((item) => {
      const match = String(item.outwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const fromOutwardItems = (outwardItems || [])
    .map((item) => {
      if (!String(item.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')) return NaN;
      const match = String(item.outwardNo).match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    });

  const serialNums = [...fromOutwards, ...fromOutwardItems]
    .filter((num) => !isNaN(num) && num > 0 && num < 1000);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `STOCK-OUT-${String(nextNum).padStart(2, '0')}`;
};

export const getAllOutwardItems = () => {
  const rawList = getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, []);
  if (!Array.isArray(rawList)) return [];
  const outwards = getStoredItem(STORAGE_KEYS.OUTWARDS, []);
  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);

  if (
    cachedOutwardItems &&
    rawList === lastRawOutwardItemsRef &&
    outwards === lastOutwardsRefForItems &&
    inwardItems === lastInwardItemsRefForItems
  ) {
    return cachedOutwardItems;
  }

  // Pre-index outwards for O(1) header lookup
  const outwardMapByNo = new Map();
  const outwardMapById = new Map();
  if (Array.isArray(outwards)) {
    for (const o of outwards) {
      if (!o) continue;
      if (o.id) outwardMapById.set(String(o.id), o);
      const no = String(o.outwardNo || '').trim().toLowerCase();
      if (no) outwardMapByNo.set(no, o);
    }
  }

  // Deduplicate items by canonical domain key: outwardNo + lrNo (or id fallback)
  const seenMap = new Map();
  let hasDuplicates = false;

  for (const item of rawList) {
    if (!item) continue;
    const outKey = String(item.outwardNo || item.outwardId || '').trim().toLowerCase();
    const lrKey = String(item.lrNo ?? '').trim().toLowerCase();
    const uniqueKey =
      item.inwardItemId && outKey
        ? `${outKey}__${item.inwardItemId}`
        : item.id
        ? String(item.id).trim()
        : `${outKey}__${lrKey}__${item.consigneeName || ''}`;

    if (!uniqueKey) continue;

    const parentOut = (item.outwardId && outwardMapById.get(String(item.outwardId))) || outwardMapByNo.get(outKey);
    const resolvedVehicleNo = parentOut?.vehicleNo || item.outwardVehicleNo || item.vehicleNo || '';
    const resolvedDriverName = parentOut?.driverName || item.outwardDriverName || item.driverName || '';
    const resolvedTransporter = parentOut?.transporterName || item.outwardTransporterName || item.transporterName || '';
    const resolvedDelPerson = parentOut?.deliveryPersonName || item.deliveryPersonName || '-';
    const resolvedFrom = parentOut?.from || parentOut?.fromStation || item.outwardFromStation || item.from || 'SANGLI';

    const normalizedItem = {
      ...item,
      transporterName: resolvedTransporter,
      outwardTransporterName: resolvedTransporter,
      vehicleNo: resolvedVehicleNo,
      driverName: resolvedDriverName,
      outwardVehicleNo: resolvedVehicleNo,
      outwardDriverName: resolvedDriverName,
      deliveryPersonName: resolvedDelPerson,
      from: resolvedFrom,
      fromStation: resolvedFrom,
      ownerName: '',
      memoNo: '',
    };

    if (!seenMap.has(uniqueKey)) {
      if (
        item.transporterName !== normalizedItem.transporterName ||
        item.vehicleNo !== normalizedItem.vehicleNo ||
        item.driverName !== normalizedItem.driverName ||
        item.deliveryPersonName !== normalizedItem.deliveryPersonName ||
        item.from !== normalizedItem.from ||
        item.ownerName !== '' ||
        item.memoNo !== ''
      ) {
        hasDuplicates = true;
      }
      seenMap.set(uniqueKey, normalizedItem);
    } else {
      hasDuplicates = true;
      const existing = seenMap.get(uniqueKey);
      const existingTotal =
        (Number(existing.toPayAmount) || 0) +
        (Number(existing.tbbAmount) || 0) +
        (Number(existing.paidAmount) || 0);
      const currTotal =
        (Number(item.toPayAmount) || 0) +
        (Number(item.tbbAmount) || 0) +
        (Number(item.paidAmount) || 0);

      const richerItem = currTotal >= existingTotal ? { ...existing, ...normalizedItem } : { ...normalizedItem, ...existing };
      seenMap.set(uniqueKey, {
        ...richerItem,
        inwardItemId: item.inwardItemId || existing.inwardItemId || null,
        transporterName: resolvedTransporter || existing.transporterName || '',
        outwardTransporterName: resolvedTransporter || existing.outwardTransporterName || '',
        vehicleNo: resolvedVehicleNo || existing.vehicleNo || '',
        driverName: resolvedDriverName || existing.driverName || '',
        outwardVehicleNo: resolvedVehicleNo || existing.outwardVehicleNo || '',
        outwardDriverName: resolvedDriverName || existing.outwardDriverName || '',
        deliveryPersonName: resolvedDelPerson !== '-' ? resolvedDelPerson : (existing.deliveryPersonName || '-'),
        from: resolvedFrom || existing.from || 'SANGLI',
        ownerName: '',
        memoNo: '',
        status: STATUS.DELIVERED,
      });
    }
  }

  // Self-healing: Check inwardItems for any delivered items whose outwardItem entry is missing
  if (Array.isArray(inwardItems)) {
    for (const inwItem of inwardItems) {
      const outNo = String(inwItem.outwardNo || '').trim();
      if (!outNo || outNo === '-' || outNo.toUpperCase().startsWith('STOCK-OUT')) continue;
      const lrKey = String(inwItem.lrNo ?? '').trim().toLowerCase();
      const uniqueKey = inwItem.id && outNo ? `${outNo.toLowerCase()}__${inwItem.id}` : `${outNo.toLowerCase()}__${lrKey}`;

      if (seenMap.has(uniqueKey)) continue;

      const parentOut = (inwItem.outwardId && outwardMapById.get(String(inwItem.outwardId))) || outwardMapByNo.get(outNo.toLowerCase());

      const reconstructedItem = {
        id: `out-item-${inwItem.id || Date.now()}`,
        outwardId: inwItem.outwardId || parentOut?.id || `out-${outNo}`,
        outwardNo: outNo,
        outwardDate: inwItem.outwardDate || parentOut?.date || inwItem.date || '2026-11-06',
        transporterName: parentOut?.transporterName || inwItem.outwardTransporterName || '',
        outwardTransporterName: parentOut?.transporterName || inwItem.outwardTransporterName || '',
        vehicleNo: parentOut?.vehicleNo || inwItem.outwardVehicleNo || '',
        driverName: parentOut?.driverName || inwItem.outwardDriverName || '',
        outwardVehicleNo: parentOut?.vehicleNo || inwItem.outwardVehicleNo || '',
        outwardDriverName: parentOut?.driverName || inwItem.outwardDriverName || '',
        inwardVehicleNo: inwItem.inwardVehicleNo || inwItem.vehicleNo || '',
        inwardDriverName: inwItem.inwardDriverName || inwItem.driverName || '',
        inwardOwnerName: inwItem.inwardOwnerName || inwItem.ownerName || '',
        inwardTransporterName: inwItem.inwardTransporterName || inwItem.transporterName || '',
        inwardFromStation: inwItem.inwardFromStation || inwItem.from || '',
        ownerName: '',
        from: parentOut?.from || inwItem.outwardFromStation || 'SANGLI',
        fromStation: parentOut?.from || inwItem.outwardFromStation || 'SANGLI',
        memoNo: '',
        isCrossOutward: false,
        inwardItemId: inwItem.id,
        lrNo: String(inwItem.lrNo ?? '').trim(),
        inwardDate: inwItem.inwardDate || inwItem.date,
        pkg: Number(inwItem.pkg) || 0,
        invoiceNo: inwItem.invoiceNo || '',
        ctTo: inwItem.ctTo || '',
        deliveryPersonName: inwItem.deliveryPersonName || parentOut?.deliveryPersonName || '-',
        consignorName: inwItem.consignorName || '',
        consigneeName: inwItem.consigneeName || '',
        toPayAmount: Number(inwItem.toPayAmount) || 0,
        tbbAmount: Number(inwItem.tbbAmount) || 0,
        paidAmount: Number(inwItem.paidAmount) || 0,
        status: STATUS.DELIVERED,
        deliveredAt: inwItem.deliveredAt || new Date().toISOString(),
        deliveredBy: inwItem.deliveredBy || 'ATHARVA',
      };
      seenMap.set(uniqueKey, reconstructedItem);
      hasDuplicates = true;
    }
  }

  const deduplicated = Array.from(seenMap.values());
  if (hasDuplicates) {
    setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, deduplicated);
  }
  cachedOutwardItems = deduplicated;
  lastRawOutwardItemsRef = rawList;
  lastOutwardsRefForItems = outwards;
  lastInwardItemsRefForItems = inwardItems;
  return deduplicated;
};

export const createOutward = (headerData, selectedPendingItems, currentUser = 'Operator') => {
  if (!selectedPendingItems || selectedPendingItems.length === 0) {
    throw new Error('Outward transaction must include at least one LR.');
  }

  const outwards = getAllOutwards();
  const normalizedNo = String(headerData.outwardNo || '').trim().toLowerCase();

  // If an outward record with this outwardNo already exists, update it in-place instead of creating a duplicate
  const existingOutward = normalizedNo
    ? outwards.find((out) => String(out.outwardNo || '').trim().toLowerCase() === normalizedNo)
    : null;

  if (existingOutward) {
    return updateFullOutward(existingOutward.id, headerData, selectedPendingItems, currentUser);
  }

  const outwardItems = getAllOutwardItems();
  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
  const isCrossOutward = Boolean(
    headerData.isCrossOutward ||
      String(headerData.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  // For standard Outward from Godown, verify all selected LRs are still pending
  if (!isCrossOutward) {
    for (const item of selectedPendingItems) {
      const existing = inwardItems.find((invItem) => invItem.id === item.id);
      if (!existing || existing.status !== STATUS.PENDING) {
        throw new Error(`LR No. "${item.lrNo}" is no longer in PENDING stock.`);
      }
    }
  }

  const outwardId = `out-${Date.now()}`;
  const totalQty = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalCrossingFreight = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.crossingFreight) || 0), 0);

  const consignorName = Array.from(new Set(selectedPendingItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(selectedPendingItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const outwardTransporter = headerData.transporterName || '';
  const outwardVehicle = headerData.vehicleNo || '';
  const outwardDriver = headerData.driverName || '';
  const outwardDelPerson = headerData.deliveryPersonName || '';
  const outwardFrom = headerData.from || headerData.fromStation || 'SANGLI';
  const outwardTo = headerData.toStation || headerData.to || '';

  const newOutwardHeader = {
    id: outwardId,
    outwardNo:
      headerData.outwardNo ||
      (isCrossOutward ? getNextCrossOutwardNo(outwards) : getNextOutwardNo(outwards)),
    date: headerData.date,
    transporterName: outwardTransporter,
    vehicleNo: outwardVehicle,
    driverName: outwardDriver,
    ownerName: isCrossOutward ? (headerData.ownerName || '') : '',
    deliveryPersonName: outwardDelPerson,
    from: outwardFrom,
    fromStation: outwardFrom,
    toStation: outwardTo,
    memoNo: isCrossOutward ? (headerData.memoNo || '') : '',
    consignorName,
    consigneeName,
    isCrossOutward,
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    totalCrossingFreight,
    createdAt: new Date().toISOString(),
    createdBy: currentUser,
  };

  const newOutwardItemsList = selectedPendingItems.map((item, index) => {
    // Preserve original inward details cleanly
    const origInwardVeh = item.inwardVehicleNo || (item.vehicleNo !== outwardVehicle ? item.vehicleNo : '') || '';
    const origInwardDrv = item.inwardDriverName || (item.driverName !== outwardDriver ? item.driverName : '') || '';
    const origInwardOwn = item.inwardOwnerName || item.ownerName || '';
    const origInwardTrans = item.inwardTransporterName || (item.transporterName !== outwardTransporter ? item.transporterName : '') || '';
    const origInwardFrom = item.inwardFromStation || item.from || '';

    return {
      id: `out-item-${Date.now()}-${index}`,
      outwardId,
      outwardNo: newOutwardHeader.outwardNo,
      outwardDate: headerData.date,
      transporterName: outwardTransporter,
      outwardTransporterName: outwardTransporter,
      vehicleNo: outwardVehicle,
      driverName: outwardDriver,
      outwardVehicleNo: outwardVehicle,
      outwardDriverName: outwardDriver,
      deliveryPersonName: outwardDelPerson || item.deliveryPersonName || '-',
      from: outwardFrom,
      fromStation: outwardFrom,
      outwardFromStation: outwardFrom,
      toStation: outwardTo || item.ctTo || '',
      inwardVehicleNo: origInwardVeh,
      inwardDriverName: origInwardDrv,
      inwardOwnerName: origInwardOwn,
      inwardTransporterName: origInwardTrans,
      inwardFromStation: origInwardFrom,
      ownerName: isCrossOutward ? (headerData.ownerName || item.ownerName || '') : '',
      memoNo: isCrossOutward ? (headerData.memoNo || item.memoNo || '') : '',
      isCrossOutward,
      inwardItemId: isCrossOutward ? null : item.id,
      lrNo: String(item.lrNo ?? '').trim(),
      inwardDate: isCrossOutward ? '-' : (item.date || item.inwardDate || headerData.date),
      pkg: Number(item.pkg) || 0,
      invoiceNo: item.invoiceNo || '',
      ctTo: item.ctTo || outwardTo || '',
      consignorName: item.consignorName || '',
      consigneeName: item.consigneeName || '',
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      crossingFreight: Number(item.crossingFreight) || 0,
      status: isCrossOutward ? (STATUS.DISPATCHED || 'DISPATCHED') : STATUS.DELIVERED,
      deliveredAt: new Date().toISOString(),
      deliveredBy: currentUser,
    };
  });

  // Update status and edited amounts in inwardItems collection ONLY for standard Godown Outward
  // Cross Stock Out is completely standalone manual dispatch with NO connection to Pending Stock or Inward
  if (!isCrossOutward) {
    let inwards = getStoredItem(STORAGE_KEYS.INWARDS);
    const updatedInwardItems = inwardItems.map((item) => {
      const lrKey = String(item.lrNo ?? '').trim().toLowerCase();
      const matchedPending = selectedPendingItems.find((p) => {
        // Precise ID match when IDs exist so duplicate LR numbers from the same transporter never cross-match
        if (item.id && (p.id || p.inwardItemId)) {
          return p.id === item.id || p.inwardItemId === item.id;
        }

        const pLR = String(p.lrNo ?? '').trim().toLowerCase();
        if (pLR !== lrKey) return false;

        const pTrans = String(p.inwardTransporterName || p.transporterName || '').trim().toLowerCase();
        const itemTrans = String(item.inwardTransporterName || item.transporterName || '').trim().toLowerCase();
        if (pTrans && itemTrans && pTrans !== itemTrans) return false;

        return true;
      });

      if (matchedPending) {
        return {
          ...item,
          lrNo: matchedPending.lrNo ? String(matchedPending.lrNo).trim() : item.lrNo,
          toPayAmount: Number(matchedPending.toPayAmount) || 0,
          tbbAmount: Number(matchedPending.tbbAmount) || 0,
          paidAmount: Number(matchedPending.paidAmount) || 0,
          pkg: Number(matchedPending.pkg) || item.pkg,
          invoiceNo: matchedPending.invoiceNo ?? item.invoiceNo,
          ctTo: matchedPending.ctTo ?? item.ctTo,
          consignorName: matchedPending.consignorName ?? item.consignorName,
          consigneeName: matchedPending.consigneeName ?? item.consigneeName,
          deliveryPersonName:
            outwardDelPerson ||
            matchedPending.deliveryPersonName ||
            item.deliveryPersonName ||
            '-',
          status: STATUS.DELIVERED,
          deliveredAt: new Date().toISOString(),
          deliveredBy: currentUser,
          outwardId,
          outwardNo: newOutwardHeader.outwardNo,
          outwardDate: headerData.date,
          outwardVehicleNo: outwardVehicle,
          outwardDriverName: outwardDriver,
          outwardTransporterName: outwardTransporter,
          outwardFromStation: outwardFrom,
          // Preserve original inward identity
          inwardVehicleNo: item.inwardVehicleNo || item.vehicleNo || '',
          inwardDriverName: item.inwardDriverName || item.driverName || '',
          inwardOwnerName: item.inwardOwnerName || item.ownerName || '',
          inwardTransporterName: item.inwardTransporterName || item.transporterName || '',
          inwardFromStation: item.inwardFromStation || item.from || '',
        };
      }
      return item;
    });

    // Also recalculate parent inwards totals so Inward Receipts tab and Accounting stay in sync
    inwards = inwards.map((inv) => {
      const parentItems = updatedInwardItems.filter(
        (i) => i.inwardId === inv.id || i.inwardNo === inv.inwardNo
      );
      if (parentItems.length === 0) return inv;
      const inwConsignors = Array.from(new Set(parentItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
      const inwConsignees = Array.from(new Set(parentItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');
      return {
        ...inv,
        consignorName: inwConsignors || inv.consignorName,
        consigneeName: inwConsignees || inv.consigneeName,
        totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
        totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
        totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
        totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
      };
    });

    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);
    setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  }

  outwards.unshift(newOutwardHeader);
  const updatedOutwardItems = [...newOutwardItemsList, ...outwardItems];

  clearOutwardCaches();
  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, updatedOutwardItems);

  return newOutwardHeader;
};

export const deleteOutward = (outwardId) => {
  let outwards = getAllOutwards();
  let outwardItems = getAllOutwardItems();

  const targetOutward = outwards.find(
    (out) =>
      out.id === outwardId ||
      String(out.outwardNo || '').trim().toLowerCase() === String(outwardId || '').trim().toLowerCase()
  );
  const targetId = targetOutward ? targetOutward.id : outwardId;
  const targetNoLower = String(targetOutward?.outwardNo || outwardId || '').trim().toLowerCase();

  const isCrossOutward = Boolean(
    targetOutward?.isCrossOutward ||
      String(targetOutward?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  // Revert status in inwardItems back to PENDING ONLY for standard Godown Outward
  // Cross Stock Out has NO connections to Pending Stock or Inward
  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
    const itemsToRevert = outwardItems.filter(
      (item) =>
        item.outwardId === targetId ||
        (targetNoLower && String(item.outwardNo || '').trim().toLowerCase() === targetNoLower)
    );
    const inwardItemIds = new Set(itemsToRevert.map((item) => item.inwardItemId || item.id));

    inwardItems = inwardItems.map((item) => {
      if (
        inwardItemIds.has(item.id) ||
        item.outwardId === targetId ||
        (targetNoLower && String(item.outwardNo || '').trim().toLowerCase() === targetNoLower)
      ) {
        const { deliveredAt: _deliveredAt, outwardId: _oId, outwardNo: _outwardNo, ...rest } = item;
        return {
          ...rest,
          status: STATUS.PENDING,
        };
      }
      return item;
    });
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  }

  outwards = outwards.filter((out) => {
    if (out.id === targetId) return false;
    if (targetNoLower && String(out.outwardNo || '').trim().toLowerCase() === targetNoLower) return false;
    return true;
  });
  outwardItems = outwardItems.filter((item) => {
    if (item.outwardId === targetId) return false;
    if (targetNoLower && String(item.outwardNo || '').trim().toLowerCase() === targetNoLower) return false;
    return true;
  });

  clearOutwardCaches();
  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
  return true;
};

export const deleteOutwardItem = (outwardItemId) => {
  let outwardItems = getAllOutwardItems();
  let outwards = getAllOutwards();

  const targetItem = outwardItems.find((item) => item.id === outwardItemId);
  if (!targetItem) return false;

  const isCrossOutward = Boolean(
    targetItem.isCrossOutward ||
      String(targetItem.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  // Revert status in inwardItems ONLY for standard Godown Outward
  if (!isCrossOutward && targetItem.inwardItemId) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
    inwardItems = inwardItems.map((item) => {
      if (item.id === targetItem.inwardItemId) {
        const { deliveredAt: _deliveredAt, outwardId: _outwardId, outwardNo: _outwardNo, ...rest } = item;
        return {
          ...rest,
          status: STATUS.PENDING,
        };
      }
      return item;
    });
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  }

  outwardItems = outwardItems.filter((item) => item.id !== outwardItemId);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);

  // Recalculate totals for parent outward header
  if (targetItem.outwardId) {
    const parentItems = outwardItems.filter((item) => item.outwardId === targetItem.outwardId);
    outwards = outwards.map((out) => {
      if (out.id === targetItem.outwardId) {
        return {
          ...out,
          totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
          totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
          totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
          totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
        };
      }
      return out;
    });
    setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  }

  return true;
};

export const updateOutwardHeader = (outwardId, updatedFields) => {
  let outwards = getAllOutwards();
  let outwardItems = getAllOutwardItems();

  const targetOutward = outwards.find(
    (out) =>
      out.id === outwardId ||
      String(out.outwardNo || '').trim().toLowerCase() === String(outwardId || '').trim().toLowerCase()
  );
  const targetId = targetOutward ? targetOutward.id : outwardId;
  const targetNoLower = String(targetOutward?.outwardNo || outwardId || '').trim().toLowerCase();

  const isCrossOutward = Boolean(
    targetOutward?.isCrossOutward ||
      String(targetOutward?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  outwards = outwards.map((out) =>
    out.id === targetId || (targetNoLower && String(out.outwardNo || '').trim().toLowerCase() === targetNoLower)
      ? { ...out, ...updatedFields }
      : out
  );

  outwardItems = outwardItems.map((item) => {
    if (
      item.outwardId === targetId ||
      (targetNoLower && String(item.outwardNo || '').trim().toLowerCase() === targetNoLower)
    ) {
      return {
        ...item,
        vehicleNo: updatedFields.vehicleNo ?? item.vehicleNo,
        outwardVehicleNo: updatedFields.vehicleNo ?? item.outwardVehicleNo ?? item.vehicleNo,
        driverName: updatedFields.driverName ?? item.driverName,
        outwardDriverName: updatedFields.driverName ?? item.outwardDriverName ?? item.driverName,
        memoNo: updatedFields.memoNo ?? item.memoNo,
        from: updatedFields.from ?? item.from,
        outwardDate: updatedFields.date ?? item.outwardDate,
        deliveryPersonName: updatedFields.deliveryPersonName ?? item.deliveryPersonName,
      };
    }
    return item;
  });

  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
    inwardItems = inwardItems.map((item) => {
      if (
        item.outwardId === targetId ||
        (targetNoLower && String(item.outwardNo || '').trim().toLowerCase() === targetNoLower)
      ) {
        return {
          ...item,
          outwardVehicleNo: updatedFields.vehicleNo ?? item.outwardVehicleNo,
          outwardDriverName: updatedFields.driverName ?? item.outwardDriverName,
          outwardDate: updatedFields.date ?? item.outwardDate,
          deliveryPersonName: updatedFields.deliveryPersonName ?? item.deliveryPersonName,
        };
      }
      return item;
    });
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  }

  clearOutwardCaches();
  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
  return true;
};

export const updateOutwardItem = (itemId, updatedFields) => {
  let outwardItems = getAllOutwardItems();
  let outwards = getAllOutwards();

  outwardItems = outwardItems.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        ...updatedFields,
        pkg: updatedFields.pkg !== undefined ? Number(updatedFields.pkg) : item.pkg,
        toPayAmount: updatedFields.toPayAmount !== undefined ? Number(updatedFields.toPayAmount) : item.toPayAmount,
        tbbAmount: updatedFields.tbbAmount !== undefined ? Number(updatedFields.tbbAmount) : item.tbbAmount,
        paidAmount: updatedFields.paidAmount !== undefined ? Number(updatedFields.paidAmount) : item.paidAmount,
        crossingFreight: updatedFields.crossingFreight !== undefined ? Number(updatedFields.crossingFreight) : (item.crossingFreight || 0),
      };
    }
    return item;
  });

  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);

  const targetItem = outwardItems.find((item) => item.id === itemId);
  const isCrossOutward = Boolean(
    targetItem?.isCrossOutward ||
      String(targetItem?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  // Sync to inwardItems and recalculate inwards ONLY for standard Godown Outward
  if (targetItem && !isCrossOutward && targetItem.inwardItemId) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
    let inwards = getStoredItem(STORAGE_KEYS.INWARDS);

    inwardItems = inwardItems.map((inwItem) => {
      if (inwItem.id === targetItem.inwardItemId) {
        return {
          ...inwItem,
          lrNo: targetItem.lrNo,
          pkg: targetItem.pkg,
          invoiceNo: targetItem.invoiceNo,
          ctTo: targetItem.ctTo,
          consignorName: targetItem.consignorName,
          consigneeName: targetItem.consigneeName,
          toPayAmount: targetItem.toPayAmount,
          tbbAmount: targetItem.tbbAmount,
          paidAmount: targetItem.paidAmount,
          deliveryPersonName: targetItem.deliveryPersonName,
          outwardVehicleNo: targetItem.outwardVehicleNo || targetItem.vehicleNo || inwItem.outwardVehicleNo,
          outwardDriverName: targetItem.outwardDriverName || targetItem.driverName || inwItem.outwardDriverName,
        };
      }
      return inwItem;
    });
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);

    // Recalculate parent inwards totals
    inwards = inwards.map((inv) => {
      const parentItems = inwardItems.filter(
        (i) => i.inwardId === inv.id || i.inwardNo === inv.inwardNo
      );
      if (parentItems.length === 0) return inv;
      const consignorName = Array.from(new Set(parentItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
      const consigneeName = Array.from(new Set(parentItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');
      return {
        ...inv,
        consignorName,
        consigneeName,
        totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
        totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
        totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
        totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
      };
    });
    setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  }

  if (targetItem && (targetItem.outwardId || targetItem.outwardNo)) {
    const parentItems = outwardItems.filter(
      (item) =>
        (targetItem.outwardId && item.outwardId === targetItem.outwardId) ||
        (targetItem.outwardNo && item.outwardNo === targetItem.outwardNo)
    );
    outwards = outwards.map((out) => {
      if (out.id === targetItem.outwardId || out.outwardNo === targetItem.outwardNo) {
        return {
          ...out,
          totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
          totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
          totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
          totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
        };
      }
      return out;
    });
    setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  }

  return true;
};

export const updateFullOutward = (outwardId, headerData, selectedPendingItems, currentUser = 'Operator') => {
  if (!selectedPendingItems || selectedPendingItems.length === 0) {
    throw new Error('Outward transaction must include at least one LR.');
  }

  let outwards = getAllOutwards();
  let outwardItems = getAllOutwardItems();

  const cleanOutwardNo = String(headerData.outwardNo || '').trim();
  const normalizedOutwardNo = cleanOutwardNo.toLowerCase();

  const existingHeader = outwards.find(
    (out) =>
      (outwardId && out.id === outwardId) ||
      (normalizedOutwardNo && String(out.outwardNo || '').trim().toLowerCase() === normalizedOutwardNo)
  );
  const resolvedOutwardId = existingHeader ? existingHeader.id : outwardId || `out-${Date.now()}`;
  const isCrossOutward = Boolean(
    headerData.isCrossOutward ??
      existingHeader?.isCrossOutward ??
      String(headerData.outwardNo || existingHeader?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  const finalOutwardNo =
    cleanOutwardNo ||
    existingHeader?.outwardNo ||
    (isCrossOutward ? getNextCrossOutwardNo(outwards) : getNextOutwardNo(outwards));
  const finalOutwardNoLower = finalOutwardNo.toLowerCase();

  // Find previous outward items belonging to this outward
  const oldOutwardItems = outwardItems.filter(
    (item) =>
      item.outwardId === resolvedOutwardId ||
      (existingHeader && String(item.outwardNo || '').trim().toLowerCase() === String(existingHeader.outwardNo || '').trim().toLowerCase()) ||
      (finalOutwardNoLower && String(item.outwardNo || '').trim().toLowerCase() === finalOutwardNoLower)
  );
  const oldOutwardItemIds = new Set(oldOutwardItems.map((i) => i.id));
  const oldInwardIds = new Set(oldOutwardItems.map((item) => item.inwardItemId || item.id));

  // ONLY for standard Godown Outward: revert inwardItems previously belonging to this outward back to PENDING
  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
    inwardItems = inwardItems.map((item) => {
      if (
        oldInwardIds.has(item.id) ||
        item.outwardId === resolvedOutwardId ||
        (existingHeader && item.outwardNo === existingHeader.outwardNo) ||
        (finalOutwardNo && item.outwardNo === finalOutwardNo)
      ) {
        const {
          deliveredAt: _deliveredAt,
          outwardId: _oId,
          outwardNo: _outwardNo,
          outwardDate: _outwardDate,
          deliveryPersonName: _deliveryPersonName,
          ...rest
        } = item;
        return {
          ...rest,
          status: STATUS.PENDING,
        };
      }
      return item;
    });
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  }

  const totalQty = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
  const totalCrossingFreight = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.crossingFreight) || 0), 0);

  const consignorName = Array.from(new Set(selectedPendingItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(selectedPendingItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const outwardTransporter = headerData.transporterName || existingHeader?.transporterName || '';
  const outwardVehicle = headerData.vehicleNo || existingHeader?.vehicleNo || '';
  const outwardDriver = headerData.driverName || existingHeader?.driverName || '';
  const outwardDelPerson = headerData.deliveryPersonName || existingHeader?.deliveryPersonName || '';
  const outwardFrom = headerData.from || headerData.fromStation || existingHeader?.from || existingHeader?.fromStation || 'SANGLI';
  const outwardTo = headerData.toStation || headerData.to || existingHeader?.toStation || '';

  const updatedHeaderFields = {
    ...(existingHeader || {}),
    id: resolvedOutwardId,
    outwardNo: finalOutwardNo,
    date: headerData.date,
    transporterName: outwardTransporter,
    vehicleNo: outwardVehicle,
    driverName: outwardDriver,
    ownerName: isCrossOutward ? (headerData.ownerName || existingHeader?.ownerName || '') : '',
    deliveryPersonName: outwardDelPerson,
    from: outwardFrom,
    fromStation: outwardFrom,
    toStation: outwardTo,
    memoNo: isCrossOutward ? (headerData.memoNo || existingHeader?.memoNo || '') : '',
    consignorName,
    consigneeName,
    isCrossOutward,
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    totalCrossingFreight,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser,
  };

  // Filter out ANY previous records matching either resolvedOutwardId OR finalOutwardNoLower to completely eliminate duplicates
  const cleanRemainingOutwards = outwards.filter((out) => {
    if (out.id === resolvedOutwardId) return false;
    if (finalOutwardNoLower && String(out.outwardNo || '').trim().toLowerCase() === finalOutwardNoLower) {
      return false;
    }
    return true;
  });

  outwards = [updatedHeaderFields, ...cleanRemainingOutwards];

  const newOutwardItemsList = selectedPendingItems.map((item, index) => {
    const matchedOld =
      oldOutwardItems.find(
        (old) =>
          old.id === item.id ||
          (old.inwardItemId && old.inwardItemId === (item.inwardItemId || item.id)) ||
          String(old.lrNo ?? '').trim().toLowerCase() === String(item.lrNo ?? '').trim().toLowerCase()
      ) || (oldOutwardItems.length === selectedPendingItems.length ? oldOutwardItems[index] : null);

    const origInwardVeh = item.inwardVehicleNo || matchedOld?.inwardVehicleNo || (item.vehicleNo !== outwardVehicle ? item.vehicleNo : '') || '';
    const origInwardDrv = item.inwardDriverName || matchedOld?.inwardDriverName || (item.driverName !== outwardDriver ? item.driverName : '') || '';
    const origInwardOwn = item.inwardOwnerName || matchedOld?.inwardOwnerName || item.ownerName || '';
    const origInwardTrans = item.inwardTransporterName || matchedOld?.inwardTransporterName || (item.transporterName !== outwardTransporter ? item.transporterName : '') || '';
    const origInwardFrom = item.inwardFromStation || matchedOld?.inwardFromStation || item.from || '';

    return {
      ...(matchedOld || {}),
      id: matchedOld?.id || `out-item-${Date.now()}-${index}`,
      outwardId: resolvedOutwardId,
      outwardNo: updatedHeaderFields.outwardNo,
      outwardDate: headerData.date,
      transporterName: outwardTransporter,
      outwardTransporterName: outwardTransporter,
      vehicleNo: outwardVehicle,
      driverName: outwardDriver,
      outwardVehicleNo: outwardVehicle,
      outwardDriverName: outwardDriver,
      deliveryPersonName: outwardDelPerson || item.deliveryPersonName || matchedOld?.deliveryPersonName || '-',
      from: outwardFrom,
      fromStation: outwardFrom,
      outwardFromStation: outwardFrom,
      toStation: outwardTo || item.ctTo || matchedOld?.ctTo || '',
      inwardVehicleNo: origInwardVeh,
      inwardDriverName: origInwardDrv,
      inwardOwnerName: origInwardOwn,
      inwardTransporterName: origInwardTrans,
      inwardFromStation: origInwardFrom,
      ownerName: isCrossOutward ? (headerData.ownerName || item.ownerName || matchedOld?.ownerName || '') : '',
      memoNo: isCrossOutward ? (headerData.memoNo || item.memoNo || matchedOld?.memoNo || '') : '',
      isCrossOutward,
      inwardItemId: isCrossOutward ? null : (item.inwardItemId || matchedOld?.inwardItemId || item.id),
      lrNo: String(item.lrNo ?? '').trim(),
      inwardDate: isCrossOutward ? '-' : (matchedOld?.inwardDate || item.inwardDate || item.date || headerData.date),
      pkg: Number(item.pkg) || 0,
      invoiceNo: item.invoiceNo ?? matchedOld?.invoiceNo ?? '',
      ctTo: item.ctTo ?? matchedOld?.ctTo ?? outwardTo ?? '',
      deliveryPersonName:
        outwardDelPerson ||
        item.deliveryPersonName ||
        matchedOld?.deliveryPersonName ||
        '-',
      consignorName: item.consignorName ?? matchedOld?.consignorName ?? '',
      consigneeName: item.consigneeName ?? matchedOld?.consigneeName ?? '',
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      crossingFreight: item.crossingFreight !== undefined ? Number(item.crossingFreight) : Number(matchedOld?.crossingFreight) || 0,
      status: isCrossOutward ? (STATUS.DISPATCHED || 'DISPATCHED') : STATUS.DELIVERED,
      deliveredAt: matchedOld?.deliveredAt || new Date().toISOString(),
      deliveredBy: currentUser,
    };
  });

  // ONLY for standard Godown Outward: sync to inwardItems and recalculate inwards
  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS, []);
    let inwards = getStoredItem(STORAGE_KEYS.INWARDS, []);

    const selectedByInwardId = new Map();
    newOutwardItemsList.forEach((outItem) => {
      if (outItem.inwardItemId) selectedByInwardId.set(outItem.inwardItemId, outItem);
    });

    inwardItems = inwardItems.map((item) => {
      const matchedOut = selectedByInwardId.get(item.id);
      if (matchedOut) {
        return {
          ...item,
          lrNo: matchedOut.lrNo,
          inwardDate: matchedOut.inwardDate || item.inwardDate || item.date,
          date: matchedOut.inwardDate || item.date || item.inwardDate,
          pkg: matchedOut.pkg,
          invoiceNo: matchedOut.invoiceNo,
          ctTo: matchedOut.ctTo,
          consignorName: matchedOut.consignorName,
          consigneeName: matchedOut.consigneeName,
          toPayAmount: matchedOut.toPayAmount,
          tbbAmount: matchedOut.tbbAmount,
          paidAmount: matchedOut.paidAmount,
          status: STATUS.DELIVERED,
          deliveredAt: matchedOut.deliveredAt,
          outwardId: resolvedOutwardId,
          outwardNo: updatedHeaderFields.outwardNo,
          outwardDate: headerData.date,
          outwardVehicleNo: outwardVehicle,
          outwardDriverName: outwardDriver,
          outwardTransporterName: outwardTransporter,
          outwardFromStation: outwardFrom,
          deliveryPersonName: outwardDelPerson || matchedOut.deliveryPersonName || item.deliveryPersonName || '-',
          // Explicitly preserve original inward identity
          inwardVehicleNo: item.inwardVehicleNo || item.vehicleNo || '',
          inwardDriverName: item.inwardDriverName || item.driverName || '',
          inwardOwnerName: item.inwardOwnerName || item.ownerName || '',
          inwardTransporterName: item.inwardTransporterName || item.transporterName || '',
          inwardFromStation: item.inwardFromStation || item.from || '',
        };
      }
      return item;
    });

    // Recalculate parent inwards totals
    inwards = inwards.map((inv) => {
      const parentItems = inwardItems.filter(
        (i) => i.inwardId === inv.id || i.inwardNo === inv.inwardNo
      );
      if (parentItems.length === 0) return inv;
      const inwConsignors = Array.from(new Set(parentItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
      const inwConsignees = Array.from(new Set(parentItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');
      return {
        ...inv,
        consignorName: inwConsignors || inv.consignorName,
        consigneeName: inwConsignees || inv.consigneeName,
        totalQty: parentItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
        totalToPay: parentItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
        totalTbb: parentItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
        totalPaid: parentItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
      };
    });

    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
    setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  }

  const newOutwardIds = new Set(newOutwardItemsList.map((i) => i.id));
  const otherOutwardItems = outwardItems.filter((item) => {
    if (item.outwardId === resolvedOutwardId) return false;
    if (finalOutwardNoLower && String(item.outwardNo || '').trim().toLowerCase() === finalOutwardNoLower) {
      return false;
    }
    if (oldOutwardItemIds.has(item.id)) return false;
    if (newOutwardIds.has(item.id)) return false;
    return true;
  });

  const updatedOutwardItems = [...newOutwardItemsList, ...otherOutwardItems];

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, updatedOutwardItems);

  return outwards.find((out) => out.id === resolvedOutwardId) || updatedHeaderFields;
};

