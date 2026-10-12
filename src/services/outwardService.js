import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { STATUS } from '../utils/constants';

seedInitialData();

export const getAllOutwards = () => {
  return getStoredItem(STORAGE_KEYS.OUTWARDS);
};

export const getAllOutwardItems = () => {
  return getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS);
};

export const createOutward = (headerData, selectedPendingItems, currentUser = 'Operator') => {
  if (!selectedPendingItems || selectedPendingItems.length === 0) {
    throw new Error('Outward transaction must include at least one selected Pending LR.');
  }

  const outwards = getAllOutwards();
  const outwardItems = getAllOutwardItems();
  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);

  // Verify all selected LRs are still pending
  const selectedIds = new Set(selectedPendingItems.map((item) => item.id));
  for (const item of selectedPendingItems) {
    const existing = inwardItems.find((invItem) => invItem.id === item.id);
    if (!existing || existing.status !== STATUS.PENDING) {
      throw new Error(`LR No. "${item.lrNo}" is no longer in PENDING stock.`);
    }
  }

  const outwardId = `out-${Date.now()}`;
  const totalQty = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

  const newOutwardHeader = {
    id: outwardId,
    outwardNo: headerData.outwardNo || `OUT-${outwards.length + 8000}`,
    date: headerData.date,
    transporterName: headerData.transporterName || '',
    vehicleNo: headerData.vehicleNo,
    driverName: headerData.driverName,
    deliveryPersonName: headerData.deliveryPersonName || '',
    from: headerData.from || headerData.fromStation || 'SANGLI',
    memoNo: headerData.memoNo,
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    createdAt: new Date().toISOString(),
    createdBy: currentUser,
  };

  const newOutwardItemsList = selectedPendingItems.map((item, index) => ({
    id: `out-item-${Date.now()}-${index}`,
    outwardId,
    outwardNo: newOutwardHeader.outwardNo,
    outwardDate: headerData.date,
    inwardItemId: item.id,
    lrNo: item.lrNo,
    inwardDate: item.date || item.inwardDate,
    pkg: Number(item.pkg) || 0,
    invoiceNo: item.invoiceNo || '',
    ctTo: item.ctTo || '',
    deliveryPersonName: headerData.deliveryPersonName || item.deliveryPersonName || '-',
    consignorName: item.consignorName || '',
    consigneeName: item.consigneeName || '',
    toPayAmount: Number(item.toPayAmount) || 0,
    tbbAmount: Number(item.tbbAmount) || 0,
    paidAmount: Number(item.paidAmount) || 0,
    status: STATUS.DELIVERED,
    deliveredAt: new Date().toISOString(),
    deliveredBy: currentUser,
  }));

  // Update status in inwardItems collection
  const updatedInwardItems = inwardItems.map((item) => {
    if (selectedIds.has(item.id)) {
      return {
        ...item,
        status: STATUS.DELIVERED,
        deliveredAt: new Date().toISOString(),
        outwardId,
        outwardNo: newOutwardHeader.outwardNo,
      };
    }
    return item;
  });

  outwards.unshift(newOutwardHeader);
  const updatedOutwardItems = [...newOutwardItemsList, ...outwardItems];

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, updatedOutwardItems);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, updatedInwardItems);

  return newOutwardHeader;
};

export const deleteOutward = (outwardId) => {
  let outwards = getAllOutwards();
  let outwardItems = getAllOutwardItems();
  let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);

  // Find outward items to be restored
  const itemsToRevert = outwardItems.filter((item) => item.outwardId === outwardId);
  const inwardItemIds = new Set(itemsToRevert.map((item) => item.inwardItemId || item.id));

  // Revert status in inwardItems back to PENDING
  inwardItems = inwardItems.map((item) => {
    if (inwardItemIds.has(item.id) || item.outwardId === outwardId) {
      const { deliveredAt, outwardId: oId, outwardNo, ...rest } = item;
      return {
        ...rest,
        status: STATUS.PENDING,
      };
    }
    return item;
  });

  outwards = outwards.filter((out) => out.id !== outwardId);
  outwardItems = outwardItems.filter((item) => item.outwardId !== outwardId);

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  return true;
};

export const deleteOutwardItem = (outwardItemId) => {
  let outwardItems = getAllOutwardItems();
  let outwards = getAllOutwards();
  let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);

  const targetItem = outwardItems.find((item) => item.id === outwardItemId);
  if (!targetItem) return false;

  // Revert status in inwardItems
  inwardItems = inwardItems.map((item) => {
    if (item.id === targetItem.inwardItemId || item.lrNo === targetItem.lrNo) {
      const { deliveredAt, outwardId, outwardNo, ...rest } = item;
      return {
        ...rest,
        status: STATUS.PENDING,
      };
    }
    return item;
  });

  outwardItems = outwardItems.filter((item) => item.id !== outwardItemId);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);

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

  outwards = outwards.map((out) =>
    out.id === outwardId ? { ...out, ...updatedFields } : out
  );

  outwardItems = outwardItems.map((item) => {
    if (item.outwardId === outwardId) {
      return {
        ...item,
        vehicleNo: updatedFields.vehicleNo ?? item.vehicleNo,
        memoNo: updatedFields.memoNo ?? item.memoNo,
        from: updatedFields.from ?? item.from,
        outwardDate: updatedFields.date ?? item.outwardDate,
      };
    }
    return item;
  });

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
      };
    }
    return item;
  });

  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);

  const targetItem = outwardItems.find((item) => item.id === itemId);
  if (targetItem && targetItem.outwardId) {
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

export const updateFullOutward = (outwardId, headerData, selectedPendingItems, currentUser = 'Operator') => {
  if (!selectedPendingItems || selectedPendingItems.length === 0) {
    throw new Error('Outward transaction must include at least one LR.');
  }

  let outwards = getAllOutwards();
  let outwardItems = getAllOutwardItems();
  let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);

  const existingHeader = outwards.find((out) => out.id === outwardId || out.outwardNo === headerData.outwardNo);
  const resolvedOutwardId = existingHeader ? existingHeader.id : outwardId;

  // First revert any inwardItems previously belonging to this outward back to PENDING
  const oldOutwardItems = outwardItems.filter((item) => item.outwardId === resolvedOutwardId);
  const oldInwardIds = new Set(oldOutwardItems.map((item) => item.inwardItemId || item.id));

  inwardItems = inwardItems.map((item) => {
    if (oldInwardIds.has(item.id) || item.outwardId === resolvedOutwardId) {
      const { deliveredAt, outwardId: oId, outwardNo, ...rest } = item;
      return {
        ...rest,
        status: STATUS.PENDING,
      };
    }
    return item;
  });

  const totalQty = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalToPay = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
  const totalTbb = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
  const totalPaid = selectedPendingItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

  const updatedHeaderFields = {
    outwardNo: headerData.outwardNo || existingHeader?.outwardNo,
    date: headerData.date,
    transporterName: headerData.transporterName || existingHeader?.transporterName || '',
    vehicleNo: headerData.vehicleNo,
    driverName: headerData.driverName,
    deliveryPersonName: headerData.deliveryPersonName || '',
    from: headerData.from || headerData.fromStation || 'SANGLI',
    memoNo: headerData.memoNo || '',
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser,
  };

  outwards = outwards.map((out) =>
    out.id === resolvedOutwardId ? { ...out, ...updatedHeaderFields } : out
  );

  const newOutwardItemsList = selectedPendingItems.map((item, index) => {
    const matchedOld = oldOutwardItems.find(
      (old) => old.id === item.id || old.inwardItemId === (item.inwardItemId || item.id) || old.lrNo === item.lrNo
    );
    return {
      ...(matchedOld || {}),
      id: matchedOld?.id || `out-item-${Date.now()}-${index}`,
      outwardId: resolvedOutwardId,
      outwardNo: updatedHeaderFields.outwardNo,
      outwardDate: headerData.date,
      inwardItemId: item.inwardItemId || matchedOld?.inwardItemId || item.id,
      lrNo: item.lrNo,
      inwardDate: item.inwardDate || item.date,
      pkg: Number(item.pkg) || 0,
      invoiceNo: item.invoiceNo || '',
      ctTo: item.ctTo || '',
      deliveryPersonName: item.deliveryPersonName || headerData.deliveryPersonName || '-',
      consignorName: item.consignorName || '',
      consigneeName: item.consigneeName || '',
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      status: STATUS.DELIVERED,
      deliveredAt: matchedOld?.deliveredAt || new Date().toISOString(),
      deliveredBy: currentUser,
    };
  });

  // Mark selected inwardItems as DELIVERED and sync edited LR fields
  const selectedByInwardId = new Map();
  const selectedByLrNo = new Map();
  newOutwardItemsList.forEach((outItem) => {
    if (outItem.inwardItemId) selectedByInwardId.set(outItem.inwardItemId, outItem);
    if (outItem.lrNo) selectedByLrNo.set(String(outItem.lrNo).trim().toLowerCase(), outItem);
  });

  inwardItems = inwardItems.map((item) => {
    const matchedOut =
      selectedByInwardId.get(item.id) ||
      selectedByLrNo.get(String(item.lrNo ?? '').trim().toLowerCase());
    if (matchedOut) {
      return {
        ...item,
        lrNo: matchedOut.lrNo,
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
      };
    }
    return item;
  });

  const otherOutwardItems = outwardItems.filter((item) => item.outwardId !== resolvedOutwardId);
  const updatedOutwardItems = [...newOutwardItemsList, ...otherOutwardItems];

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, updatedOutwardItems);
  setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);

  return outwards.find((out) => out.id === resolvedOutwardId);
};

