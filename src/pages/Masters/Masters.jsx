import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Truck, User, Building, MapPin, Pencil, Trash2, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';

export const Masters = () => {
  const { masters, handleAddMaster, handleUpdateMaster, handleDeleteMaster } = useApp();
  const [activeMaster, setActiveMaster] = useState('transporters');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [searchFilter, setSearchFilter] = useState('');

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

  const filteredList = currentList.filter((item) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase().trim();
    const name = String(item.name || item.vehicleNo || item.ownerName || '').toLowerCase();
    const extra = String(item.phone || item.city || item.type || item.licenseNo || '').toLowerCase();
    return name.includes(term) || extra.includes(term);
  });

  const activeCategoryObj = masterTypes.find((t) => t.key === activeMaster) || masterTypes[0];

  return (
    <div className="space-y-6">
      {/* ROYAL NAVY & ORANGE HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] p-6 text-white shadow-xl border border-blue-900/40">
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-orange-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CENTRAL MASTER DIRECTORY</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">GLOBAL REGISTRIES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Master Data Management
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl font-medium">
              Maintain standardized database of transporters, fleet vehicles, drivers, consignors, consignees, and delivery routes.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <button
              onClick={() => {
                setFormData({});
                setIsModalOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/25 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add New {activeCategoryObj.label.replace(/s$/, '')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CATEGORY SELECTOR CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {masterTypes.map((type) => {
          const Icon = type.icon;
          const count = (masters[type.key] || []).length;
          const isActive = activeMaster === type.key;
          return (
            <button
              key={type.key}
              onClick={() => {
                setActiveMaster(type.key);
                setSearchFilter('');
              }}
              className={`p-4 rounded-2xl border text-left flex items-center space-x-3.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0b2545] border-[#0b2545] text-white shadow-lg border-b-4 border-b-orange-500'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/30 shadow-2xs'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl flex items-center justify-center ${
                  isActive ? 'bg-orange-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight truncate">{type.label}</div>
                <div className={`text-[11px] font-bold ${isActive ? 'text-orange-200' : 'text-slate-400'}`}>
                  {count} Records
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* MASTER DATA RECORDS TABLE */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden space-y-3">
        {/* Header toolbar with search */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-4 bg-orange-500 rounded-full" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              {activeCategoryObj.label} Directory ({filteredList.length} Entries)
            </h3>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Search ${activeCategoryObj.label}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>
        </div>

        {/* MOBILE CARDS VIEW (sm:hidden) */}
        <div className="sm:hidden px-4 pb-4 space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="p-6 text-center text-slate-400 font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No records found matching current criteria. Click &ldquo;Add New&rdquo; above to create one.
            </div>
          ) : (
            filteredList.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-black text-slate-900 text-xs">
                      {item.name || item.vehicleNo || item.ownerName}
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> ACTIVE
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 font-medium pl-7">
                  {item.phone || item.city || item.type || item.licenseNo || '-'}
                </div>

                <div className="flex items-center justify-end space-x-1 pt-1.5 border-t border-slate-100">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    title="Edit Master Record"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteItem(item)}
                    className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    title="Delete Master Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto px-4 pb-4">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#0b2545] text-white">
              <tr className="text-[10px] uppercase font-extrabold tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center rounded-l-xl">#</th>
                <th className="py-2.5 px-3">Name / Identifier</th>
                <th className="py-2.5 px-3">Details / Contact</th>
                <th className="py-2.5 px-3">Operational Status</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">
                    No records found matching current criteria. Click &ldquo;Add New&rdquo; above to create one.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-extrabold text-center">{idx + 1}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900 text-xs">
                      {item.name || item.vehicleNo || item.ownerName}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.phone || item.city || item.type || item.licenseNo || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> ACTIVE
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Master Record"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Master Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        title={`Add New ${activeCategoryObj.label.replace(/s$/, '')}`}
      >
        <form onSubmit={handleSaveMaster} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
              {activeMaster === 'vehicles' ? 'Vehicle Number' : 'Name'} *
            </label>
            <input
              type="text"
              name={activeMaster === 'vehicles' ? 'vehicleNo' : 'name'}
              required
              autoFocus
              onChange={handleInputChange}
              placeholder={activeMaster === 'vehicles' ? 'e.g. MH-10-AZ-1234' : 'e.g. Athahar Transport Hub'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
              Contact / City / Details
            </label>
            <input
              type="text"
              name="phone"
              onChange={handleInputChange}
              placeholder="Phone or City or Code..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
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
        title={`Edit ${activeCategoryObj.label.replace(/s$/, '')}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
              {activeMaster === 'vehicles' ? 'Vehicle Number' : 'Name'} *
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
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
              Contact / City / Details
            </label>
            <input
              type="text"
              value={editFormData.phone || editFormData.city || ''}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              placeholder="Phone or City or Code..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
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
          <div className="flex items-center space-x-3 text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-semibold">
              Are you sure you want to delete master record &ldquo;{deleteItem?.name || deleteItem?.vehicleNo}&rdquo;?
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteItem(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
