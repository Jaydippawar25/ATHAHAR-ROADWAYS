import React, { createContext, useContext, useState } from 'react';
import { getMasters, addMasterItem, updateMasterItem, deleteMasterItem } from '../services/masterService';
import {
  getAllInwards,
  getAllInwardItems,
  createInward,
  getPendingStockItems,
  deleteInward,
  deleteInwardItem,
  updateInwardHeader,
  updateInwardItem,
} from '../services/inwardService';
import {
  getAllOutwards,
  getAllOutwardItems,
  createOutward,
  deleteOutward,
  deleteOutwardItem,
  updateOutwardHeader,
  updateOutwardItem,
} from '../services/outwardService';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [masters, setMasters] = useState(getMasters());
  const [inwards, setInwards] = useState(getAllInwards());
  const [inwardItems, setInwardItems] = useState(getAllInwardItems());
  const [outwards, setOutwards] = useState(getAllOutwards());
  const [outwardItems, setOutwardItems] = useState(getAllOutwardItems());
  const [pendingStock, setPendingStock] = useState(getPendingStockItems());

  const refreshData = () => {
    setMasters(getMasters());
    setInwards(getAllInwards());
    setInwardItems(getAllInwardItems());
    setOutwards(getAllOutwards());
    setOutwardItems(getAllOutwardItems());
    setPendingStock(getPendingStockItems());
  };

  const handleCreateInward = (headerData, lrItems, username) => {
    const res = createInward(headerData, lrItems, username);
    refreshData();
    return res;
  };

  const handleDeleteInward = (id) => {
    const res = deleteInward(id);
    refreshData();
    return res;
  };

  const handleDeleteInwardItem = (id) => {
    const res = deleteInwardItem(id);
    refreshData();
    return res;
  };

  const handleUpdateInwardHeader = (id, fields) => {
    const res = updateInwardHeader(id, fields);
    refreshData();
    return res;
  };

  const handleUpdateInwardItem = (id, fields) => {
    const res = updateInwardItem(id, fields);
    refreshData();
    return res;
  };

  const handleCreateOutward = (headerData, selectedPendingItems, username) => {
    const res = createOutward(headerData, selectedPendingItems, username);
    refreshData();
    return res;
  };

  const handleDeleteOutward = (id) => {
    const res = deleteOutward(id);
    refreshData();
    return res;
  };

  const handleDeleteOutwardItem = (id) => {
    const res = deleteOutwardItem(id);
    refreshData();
    return res;
  };

  const handleUpdateOutwardHeader = (id, fields) => {
    const res = updateOutwardHeader(id, fields);
    refreshData();
    return res;
  };

  const handleUpdateOutwardItem = (id, fields) => {
    const res = updateOutwardItem(id, fields);
    refreshData();
    return res;
  };

  const handleAddMaster = (category, item) => {
    const res = addMasterItem(category, item);
    refreshData();
    return res;
  };

  const handleUpdateMaster = (category, id, fields) => {
    const res = updateMasterItem(category, id, fields);
    refreshData();
    return res;
  };

  const handleDeleteMaster = (category, id) => {
    const res = deleteMasterItem(category, id);
    refreshData();
    return res;
  };

  return (
    <AppContext.Provider
      value={{
        masters,
        inwards,
        inwardItems,
        outwards,
        outwardItems,
        pendingStock,
        refreshData,
        handleCreateInward,
        handleDeleteInward,
        handleDeleteInwardItem,
        handleUpdateInwardHeader,
        handleUpdateInwardItem,
        handleCreateOutward,
        handleDeleteOutward,
        handleDeleteOutwardItem,
        handleUpdateOutwardHeader,
        handleUpdateOutwardItem,
        handleAddMaster,
        handleUpdateMaster,
        handleDeleteMaster,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

