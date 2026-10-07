import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Database, Truck, User, Building, MapPin, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const Masters = () => {
  const { masters, handleAddMaster, handleUpdateMaster, handleDeleteMaster } = useApp();
  const [activeMaster, setActiveMaster] = useState('transporters');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  // Edit & Delete modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteItem, setDeleteItem] = useState(null);

  const masterTypes = [
    { key: 'transporters', label: 'Transporters', icon: Truck },
    { key: 'vehicles', label: 'Vehicles', icon: Truck },
    { key: 'drivers', label: 'Drivers', icon: User },
    { key: 'owners', label: 'Vehicle Owners', icon: User },
    { key: 'consignors', label: 'Consignors', icon: Building },
    { key: 'consignees', label: 'Consignees', icon: Building },
    { key: 'stations', label: 'Stations / CT To', icon: MapPin },
    { key: 'deliveryPersons', label: 'Delivery Persons', icon: User },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveMaster = (e) => {
    e.preventDefault();
    handleAddMaster(activeMaster, formData);
    setIsModalOpen(false);
    setFormData({});
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditFormData({ ...item });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    handleUpdateMaster(activeMaster, editingItem.id, editFormData);
    setEditingItem(null);
  };

  const handleConfirmDelete = () => {
    handleDeleteMaster(activeMaster, deleteItem.id);
    setDeleteItem(null);
  };

  const currentList = masters[activeMaster] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Database className="w-6 h-6 text-sky-600" />
            <span>Master Data Management</span>
          </h2>
          <p className="text-xs text-slate-500">Manage transporters, vehicles, drivers, consignors & stations</p>
        </div>

        <button
          onClick={() => {
            setFormData({});
            setIsModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New {activeMaster.slice(0, -1)}</span>
        </button>
      </div>

      {/* Grid of master type categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {masterTypes.map((type) => {
          const Icon = type.icon;
          const count = (masters[type.key] || []).length;
          const isActive = activeMaster === type.key;
          return (
            <button
              key={type.key}
              onClick={() => setActiveMaster(type.key)}
              className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                isActive
                  ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-slate-100 text-slate-600'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold capitalize">{type.label}</div>
                <div className={`text-xs ${isActive ? 'text-sky-100' : 'text-slate-400'}`}>
                  {count} Records
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Master Data Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm capitalize">
          {activeMaster} Directory
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">Name / Identifier</th>
                <th className="p-3">Details</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                    No master records found. Click "Add New" above to create one.
                  </td>
                </tr>
              ) : (
                currentList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {item.name || item.vehicleNo || item.ownerName}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {item.phone || item.city || item.type || item.licenseNo || '-'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ACTIVE
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
                          title="Edit Master Record"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Master Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding new master item */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add New ${activeMaster.slice(0, -1).toUpperCase()}`}
      >
        <form onSubmit={handleSaveMaster} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {activeMaster === 'vehicles' ? 'Vehicle Number' : 'Name'}
            </label>
            <input
              type="text"
              name={activeMaster === 'vehicles' ? 'vehicleNo' : 'name'}
              required
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Contact / City / Details
            </label>
            <input
              type="text"
              name="phone"
              onChange={handleInputChange}
              placeholder="Phone or City or Code..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold shadow"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for editing master item */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`Edit ${activeMaster.slice(0, -1).toUpperCase()}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {activeMaster === 'vehicles' ? 'Vehicle Number' : 'Name'}
            </label>
            <input
              type="text"
              value={editFormData.name || editFormData.vehicleNo || ''}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  [activeMaster === 'vehicles' ? 'vehicleNo' : 'name']: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Contact / City / Details
            </label>
            <input
              type="text"
              value={editFormData.phone || editFormData.city || ''}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              placeholder="Phone or City or Code..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold shadow"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Confirm Master Record Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-amber-600 bg-amber-50 p-3.5 rounded-lg border border-amber-200">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              Are you sure you want to delete master record "{deleteItem?.name || deleteItem?.vehicleNo}"?
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteItem(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm shadow hover:bg-rose-700"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
