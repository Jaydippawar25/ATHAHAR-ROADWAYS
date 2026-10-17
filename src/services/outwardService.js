import { getStoredItem, setStoredItem, STORAGE_KEYS, seedInitialData } from './mockStorage';
import { STATUS } from '../utils/constants';

seedInitialData();

export const getAllOutwards = () => {
  return getStoredItem(STORAGE_KEYS.OUTWARDS);
};

export const getNextOutwardNo = (outwardsList) => {
  const list = (outwardsList || getAllOutwards()).filter((item) => !item.isCrossOutward);
  const serialNums = list
    .map((item) => {
      const match = String(item.outwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((num) => !isNaN(num) && num > 0 && num < 1000);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `OUT-${String(nextNum).padStart(2, '0')}`;
};

export const getNextCrossOutwardNo = (outwardsList) => {
  const list = (outwardsList || getAllOutwards()).filter((item) => item.isCrossOutward);
  const serialNums = list
    .map((item) => {
      const match = String(item.outwardNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((num) => !isNaN(num) && num > 0 && num < 1000);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `STOCK-OUT-${String(nextNum).padStart(2, '0')}`;
};

export const getAllOutwardItems = () => {
  return getStoredItem(STORAGE_KEYS.OUTWARD_ITEMS);
};

export const createOutward = (headerData, selectedPendingItems, currentUser = 'Operator') => {
  if (!selectedPendingItems || selectedPendingItems.length === 0) {
    throw new Error('Outward transaction must include at least one LR.');
  }

  const outwards = getAllOutwards();
  const outwardItems = getAllOutwardItems();
  const inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
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

  const consignorName = Array.from(new Set(selectedPendingItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(selectedPendingItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const newOutwardHeader = {
    id: outwardId,
    outwardNo:
      headerData.outwardNo ||
      (isCrossOutward ? getNextCrossOutwardNo(outwards) : getNextOutwardNo(outwards)),
    date: headerData.date,
    transporterName: headerData.transporterName || '',
    vehicleNo: headerData.vehicleNo,
    driverName: headerData.driverName,
    ownerName: headerData.ownerName || '',
    deliveryPersonName: headerData.deliveryPersonName || '',
    from: headerData.from || headerData.fromStation || 'SANGLI',
    memoNo: headerData.memoNo,
    consignorName,
    consigneeName,
    isCrossOutward,
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
    vehicleNo: newOutwardHeader.vehicleNo,
    driverName: newOutwardHeader.driverName,
    ownerName: newOutwardHeader.ownerName,
    from: newOutwardHeader.from,
    memoNo: newOutwardHeader.memoNo,
    isCrossOutward,
    inwardItemId: isCrossOutward ? null : item.id,
    lrNo: String(item.lrNo ?? '').trim(),
    inwardDate: isCrossOutward ? '-' : (item.date || item.inwardDate || headerData.date),
    pkg: Number(item.pkg) || 0,
    invoiceNo: item.invoiceNo || '',
    ctTo: item.ctTo || '',
    deliveryPersonName: headerData.deliveryPersonName || item.deliveryPersonName || '-',
    consignorName: item.consignorName || '',
    consigneeName: item.consigneeName || '',
    toPayAmount: Number(item.toPayAmount) || 0,
    tbbAmount: Number(item.tbbAmount) || 0,
    paidAmount: Number(item.paidAmount) || 0,
    status: isCrossOutward ? (STATUS.DISPATCHED || 'DISPATCHED') : STATUS.DELIVERED,
    deliveredAt: new Date().toISOString(),
    deliveredBy: currentUser,
  }));

  // Update status and edited amounts in inwardItems collection ONLY for standard Godown Outward
  // Cross Stock Out is completely standalone manual dispatch with NO connection to Pending Stock or Inward
  if (!isCrossOutward) {
    let inwards = getStoredItem(STORAGE_KEYS.INWARDS);
    const updatedInwardItems = inwardItems.map((item) => {
      const lrKey = String(item.lrNo ?? '').trim().toLowerCase();
      const matchedPending = selectedPendingItems.find(
        (p) =>
          p.id === item.id ||
          (p.inwardItemId && p.inwardItemId === item.id) ||
          (String(p.lrNo ?? '').trim().toLowerCase() === lrKey)
      );

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
            headerData.deliveryPersonName ||
            matchedPending.deliveryPersonName ||
            item.deliveryPersonName ||
            '-',
          status: STATUS.DELIVERED,
          deliveredAt: new Date().toISOString(),
          deliveredBy: currentUser,
          outwardId,
          outwardNo: newOutwardHeader.outwardNo,
          outwardDate: headerData.date,
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

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, updatedOutwardItems);

  return newOutwardHeader;
};

export const deleteOutward = (outwardId) => {
  let outwards = getAllOutwards();
  let outwardItems = getAllOutwardItems();

  const targetOutward = outwards.find((out) => out.id === outwardId);
  const isCrossOutward = Boolean(
    targetOutward?.isCrossOutward ||
      String(targetOutward?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  // Revert status in inwardItems back to PENDING ONLY for standard Godown Outward
  // Cross Stock Out has NO connections to Pending Stock or Inward
  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
    const itemsToRevert = outwardItems.filter((item) => item.outwardId === outwardId);
    const inwardItemIds = new Set(itemsToRevert.map((item) => item.inwardItemId || item.id));

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
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  }

  outwards = outwards.filter((out) => out.id !== outwardId);
  outwardItems = outwardItems.filter((item) => item.outwardId !== outwardId);

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
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
    inwardItems = inwardItems.map((item) => {
      if (item.id === targetItem.inwardItemId) {
        const { deliveredAt, outwardId, outwardNo, ...rest } = item;
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

  const targetOutward = outwards.find((out) => out.id === outwardId);
  const isCrossOutward = Boolean(
    targetOutward?.isCrossOutward ||
      String(targetOutward?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

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
        deliveryPersonName: updatedFields.deliveryPersonName ?? item.deliveryPersonName,
      };
    }
    return item;
  });

  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
    inwardItems = inwardItems.map((item) => {
      if (item.outwardId === outwardId) {
        return {
          ...item,
          outwardDate: updatedFields.date ?? item.outwardDate,
          deliveryPersonName: updatedFields.deliveryPersonName ?? item.deliveryPersonName,
        };
      }
      return item;
    });
    setStoredItem(STORAGE_KEYS.INWARD_ITEMS, inwardItems);
  }

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, outwardItems);
  return true;
};

export const updateOutwardItem = (itemId, updatedFields) => {
  let outwardItems = getAllOutwardItems();
  let outwards = getAllOutwards();

  const oldItem = outwardItems.find((item) => item.id === itemId);

  outwardItems = outwardItems.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        ...updatedFields,
        pkg: updatedFields.pkg !== undefined ? Number(updatedFields.pkg) : item.pkg,
        toPayAmount: updatedFields.toPayAmount !== undefined ? Number(updatedFields.toPayAmount) : item.toPayAmount,
        tbbAmount: updatedFields.tbbAmount !== undefined ? Number(updatedFields.tbbAmount) : item.tbbAmount,
        paidAmount: updatedFields.paidAmount !== undefined ? Number(updatedFields.paidAmount) : item.paidAmount,
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

  const existingHeader = outwards.find(
    (out) =>
      out.id === outwardId ||
      (headerData.outwardNo && out.outwardNo === headerData.outwardNo)
  );
  const resolvedOutwardId = existingHeader ? existingHeader.id : outwardId || `out-${Date.now()}`;
  const isCrossOutward = Boolean(
    headerData.isCrossOutward ??
      existingHeader?.isCrossOutward ??
      String(headerData.outwardNo || existingHeader?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
  );

  // Find previous outward items belonging to this outward
  const oldOutwardItems = outwardItems.filter(
    (item) =>
      item.outwardId === resolvedOutwardId ||
      (existingHeader && item.outwardNo === existingHeader.outwardNo) ||
      (headerData.outwardNo && item.outwardNo === headerData.outwardNo)
  );
  const oldOutwardItemIds = new Set(oldOutwardItems.map((i) => i.id));
  const oldInwardIds = new Set(oldOutwardItems.map((item) => item.inwardItemId || item.id));

  // ONLY for standard Godown Outward: revert inwardItems previously belonging to this outward back to PENDING
  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
    inwardItems = inwardItems.map((item) => {
      if (
        oldInwardIds.has(item.id) ||
        item.outwardId === resolvedOutwardId ||
        (existingHeader && item.outwardNo === existingHeader.outwardNo)
      ) {
        const { deliveredAt, outwardId: oId, outwardNo, outwardDate, deliveryPersonName, ...rest } = item;
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

  const consignorName = Array.from(new Set(selectedPendingItems.map((i) => i.consignorName).filter(Boolean))).join(', ');
  const consigneeName = Array.from(new Set(selectedPendingItems.map((i) => i.consigneeName).filter(Boolean))).join(', ');

  const updatedHeaderFields = {
    id: resolvedOutwardId,
    outwardNo:
      headerData.outwardNo ||
      existingHeader?.outwardNo ||
      (isCrossOutward ? getNextCrossOutwardNo(outwards) : getNextOutwardNo(outwards)),
    date: headerData.date,
    transporterName: headerData.transporterName || existingHeader?.transporterName || '',
    vehicleNo: headerData.vehicleNo,
    driverName: headerData.driverName,
    ownerName: headerData.ownerName ?? existingHeader?.ownerName ?? '',
    deliveryPersonName: headerData.deliveryPersonName || '',
    from: headerData.from || headerData.fromStation || 'SANGLI',
    memoNo: headerData.memoNo || '',
    consignorName,
    consigneeName,
    isCrossOutward,
    totalQty,
    totalToPay,
    totalTbb,
    totalPaid,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser,
  };

  if (existingHeader) {
    outwards = outwards.map((out) =>
      out.id === resolvedOutwardId ? { ...out, ...updatedHeaderFields } : out
    );
  } else {
    outwards.unshift({
      ...updatedHeaderFields,
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    });
  }

  const newOutwardItemsList = selectedPendingItems.map((item, index) => {
    const matchedOld =
      oldOutwardItems.find(
        (old) =>
          old.id === item.id ||
          (old.inwardItemId && old.inwardItemId === (item.inwardItemId || item.id)) ||
          String(old.lrNo ?? '').trim().toLowerCase() === String(item.lrNo ?? '').trim().toLowerCase()
      ) || (oldOutwardItems.length === selectedPendingItems.length ? oldOutwardItems[index] : null);

    return {
      ...(matchedOld || {}),
      id: matchedOld?.id || `out-item-${Date.now()}-${index}`,
      outwardId: resolvedOutwardId,
      outwardNo: updatedHeaderFields.outwardNo,
      outwardDate: headerData.date,
      vehicleNo: updatedHeaderFields.vehicleNo,
      driverName: updatedHeaderFields.driverName,
      ownerName: updatedHeaderFields.ownerName,
      from: updatedHeaderFields.from,
      memoNo: updatedHeaderFields.memoNo,
      isCrossOutward,
      inwardItemId: isCrossOutward ? null : (item.inwardItemId || matchedOld?.inwardItemId || item.id),
      lrNo: String(item.lrNo ?? '').trim(),
      inwardDate: isCrossOutward ? '-' : (matchedOld?.inwardDate || item.inwardDate || item.date || headerData.date),
      pkg: Number(item.pkg) || 0,
      invoiceNo: item.invoiceNo ?? matchedOld?.invoiceNo ?? '',
      ctTo: item.ctTo ?? matchedOld?.ctTo ?? '',
      deliveryPersonName:
        headerData.deliveryPersonName ||
        item.deliveryPersonName ||
        matchedOld?.deliveryPersonName ||
        '-',
      consignorName: item.consignorName ?? matchedOld?.consignorName ?? '',
      consigneeName: item.consigneeName ?? matchedOld?.consigneeName ?? '',
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      status: isCrossOutward ? (STATUS.DISPATCHED || 'DISPATCHED') : STATUS.DELIVERED,
      deliveredAt: matchedOld?.deliveredAt || new Date().toISOString(),
      deliveredBy: currentUser,
    };
  });

  // ONLY for standard Godown Outward: sync to inwardItems and recalculate inwards
  if (!isCrossOutward) {
    let inwardItems = getStoredItem(STORAGE_KEYS.INWARD_ITEMS);
    let inwards = getStoredItem(STORAGE_KEYS.INWARDS);

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
          deliveryPersonName: matchedOut.deliveryPersonName,
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
  const otherOutwardItems = outwardItems.filter(
    (item) =>
      item.outwardId !== resolvedOutwardId &&
      !oldOutwardItemIds.has(item.id) &&
      !newOutwardIds.has(item.id)
  );
  const updatedOutwardItems = [...newOutwardItemsList, ...otherOutwardItems];

  setStoredItem(STORAGE_KEYS.OUTWARDS, outwards);
  setStoredItem(STORAGE_KEYS.OUTWARD_ITEMS, updatedOutwardItems);

  return outwards.find((out) => out.id === resolvedOutwardId);
};

