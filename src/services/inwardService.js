import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { STATUS } from '../utils/constants';

seedInitialData();

export const getAllInwards = () => {
  return getStoredItem(STORAGE_KEYS.INWARDS);
};

export const getNextInwardNo = (inwardsList) => {
  const list = inwardsList || getAllInwards();
  const serialNums = list
    .map((item) => {
      const match = String(item.inwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((num) => !isNaN(num) && num > 0 && num < 1000);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `INW-${String(nextNum).padStart(2, '0')}`;
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
    inwardNo: headerData.inwardNo || getNextInwardNo(inwards),
    date: headerData.date,
    transporterName: headerData.transporterName || 'ATHARVA ROADWAYS MAIN',
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
        inwardDate: updatedFields.date ?? item.inwardDate,
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
      if (
        outItem.inwardItemId === targetItem.id ||
        outItem.id === targetItem.id ||
        (oldItem && String(outItem.lrNo).trim().toLowerCase() === String(oldItem.lrNo).trim().toLowerCase())
      ) {
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

export const updateFullInward = (inwardId, headerData, lrItems, currentUser = 'Operator') => {
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
        !existingChildIds.has(existing.id) &&
        existing.id !== item.id &&
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
    id: resolvedInwardId,
    inwardNo: headerData.inwardNo || existingHeader?.inwardNo || `INW-${inwards.length + 9000}`,
    date: headerData.date,
    transporterName: headerData.transporterName || 'ATHARVA ROADWAYS MAIN',
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
    inwards.unshift({
      ...updatedHeaderFields,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    });
  }

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
        return (
          (outItem.inwardItemId && outItem.inwardItemId === reb.id) ||
          outItem.id === reb.id ||
          (oldLr && String(outItem.lrNo ?? '').trim().toLowerCase() === String(oldLr).trim().toLowerCase()) ||
          String(outItem.lrNo ?? '').trim().toLowerCase() === String(reb.lrNo).trim().toLowerCase()
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

  setStoredItem(STORAGE_KEYS.INWARDS, inwards);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);

  return inwards.find((inv) => inv.id === resolvedInwardId);
};

