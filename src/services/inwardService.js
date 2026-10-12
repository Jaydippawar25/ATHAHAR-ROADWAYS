import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { STATUS } from '../utils/constants';

seedInitialData();

export const getAllInwards = () => {
  return getStoredItem(STORAGE_KEYS.INWARDS);
};

export const getAllInwardItems = () => {
  return getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
};

export const getPendingStockItems = () => {
  const items = getAllInwardItems();
  return items.filter((item) => item.status === STATUS.PENDING);
};

export const checkDuplicatePendingLR = (lrNo) => {
  const items = getPendingStockItems();
  return items.some(
    (item) => item.lrNo.trim().toLowerCase() === String(lrNo).trim().toLowerCase()
  );
};

export const createInward = (headerData, lrItems, currentUser = 'Operator') => {
  // Validate LR entries
  if (!lrItems || lrItems.length === 0) {
    throw new Error('Inward must contain at least one LR entry.');
  }

  // Check duplicate LR in current submission or pending database
  const seenLRs = new Set();
  for (const item of lrItems) {
    const cleanLR = String(item.lrNo).trim();
    if (!cleanLR) {
      throw new Error('LR No. cannot be empty.');
    }
    if (seenLRs.has(cleanLR.toLowerCase())) {
      throw new Error(`Duplicate LR No. "${cleanLR}" found in this inward submission.`);
    }
    seenLRs.add(cleanLR.toLowerCase());

    if (checkDuplicatePendingLR(cleanLR)) {
      throw new Error(`LR No. "${cleanLR}" is already present in Pending Stock.`);
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
    inwardNo: headerData.inwardNo || `INW-${inwards.length + 9000}`,
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

  inwards.unshift(newInwardHeader);
  const updatedInwardItems = [...newItems, ...inwardItems];

  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);

  return newInwardHeader;
};

export const deleteInward = (inwardId) => {
  let inwards = getAllInwards();
  let inwardItems = getAllInwardItems();

  inwards = inwards.filter((inv) => inv.id !== inwardId);
  inwardItems = inwardItems.filter((item) => item.inwardId !== inwardId);

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
  );

  // Propagate updated header fields down to child items
  inwardItems = inwardItems.map((item) => {
    if (item.inwardId === inwardId) {
      return {
        ...item,
        vehicleNo: updatedFields.vehicleNo ?? item.vehicleNo,
        memoNo: updatedFields.memoNo ?? item.memoNo,
        from: updatedFields.from ?? item.from,
        date: updatedFields.date ?? item.date,
      };
    }
    return item;
  });

  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  return true;
};

export const updateInwardItem = (itemId, updatedFields) => {
  let inwardItems = getAllInwardItems();
  let inwards = getAllInwards();

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

  // Recalculate totals for parent inward header
  const targetItem = inwardItems.find((item) => item.id === itemId);
  if (targetItem && targetItem.inwardId) {
    const parentItems = inwardItems.filter((item) => item.inwardId === targetItem.inwardId);
    inwards = inwards.map((inv) => {
      if (inv.id === targetItem.inwardId) {
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

export const updateFullInward = (inwardId, headerData, lrItems, currentUser = 'Operator') => {
  if (!lrItems || lrItems.length === 0) {
    throw new Error('Inward must contain at least one LR entry.');
  }

  let inwards = getAllInwards();
  let inwardItems = getAllInwardItems();

  const existingHeader = inwards.find((inv) => inv.id === inwardId || inv.inwardNo === headerData.inwardNo);
  const resolvedInwardId = existingHeader ? existingHeader.id : inwardId;

  // Check duplicate LR in current submission or pending database (excluding items belonging to this inward)
  const seenLRs = new Set();
  for (const item of lrItems) {
    const cleanLR = String(item.lrNo ?? '').trim();
    if (!cleanLR) {
      throw new Error('LR No. cannot be empty.');
    }
    if (seenLRs.has(cleanLR.toLowerCase())) {
      throw new Error(`Duplicate LR No. "${cleanLR}" found in this inward submission.`);
    }
    seenLRs.add(cleanLR.toLowerCase());

    const duplicateInOtherInward = inwardItems.some(
      (existing) =>
        existing.inwardId !== resolvedInwardId &&
        existing.status === STATUS.PENDING &&
        String(existing.lrNo ?? '').trim().toLowerCase() === cleanLR.toLowerCase()
    );
    if (duplicateInOtherInward) {
      throw new Error(`LR No. "${cleanLR}" is already present in Pending Stock.`);
    }
  }

  const totalQty = lrItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = lrItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = lrItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = lrItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

  const consignorName = Array.from(new Set(lrItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(lrItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const updatedHeaderFields = {
    inwardNo: headerData.inwardNo || existingHeader?.inwardNo,
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

  inwards = inwards.map((inv) =>
    inv.id === resolvedInwardId ? { ...inv, ...updatedHeaderFields } : inv
  );

  // Map existing items of this inward to preserve IDs and delivery statuses if already delivered
  const existingChildItems = inwardItems.filter((item) => item.inwardId === resolvedInwardId);

  const rebuiltItems = lrItems.map((item, index) => {
    const cleanLR = String(item.lrNo ?? '').trim();
    const matchedOld =
      existingChildItems.find((old) => old.id && old.id === item.id) ||
      existingChildItems.find((old) => String(old.lrNo ?? '').trim().toLowerCase() === cleanLR.toLowerCase());

    return {
      ...(matchedOld || {}),
      id: matchedOld?.id || item.id || `item-${Date.now()}-${index}`,
      inwardId: resolvedInwardId,
      inwardNo: updatedHeaderFields.inwardNo,
      inwardDate: headerData.date,
      transporterName: updatedHeaderFields.transporterName,
      vehicleNo: updatedHeaderFields.vehicleNo,
      driverName: updatedHeaderFields.driverName,
      ownerName: updatedHeaderFields.ownerName,
      from: item.from || updatedHeaderFields.from,
      memoNo: updatedHeaderFields.memoNo,
      srNo: index + 1,
      lrNo: cleanLR,
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
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      status: matchedOld?.status || item.status || STATUS.PENDING,
      createdAt: matchedOld?.createdAt || new Date().toISOString(),
    };
  });

  const otherInwardItems = inwardItems.filter((item) => item.inwardId !== resolvedInwardId);
  const updatedInwardItems = [...rebuiltItems, ...otherInwardItems];

  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);

  return inwards.find((inv) => inv.id === resolvedInwardId);
};

