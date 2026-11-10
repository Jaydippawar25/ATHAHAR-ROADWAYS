export const STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  DISPATCHED: 'DISPATCHED',
  CANCELLED: 'CANCELLED',
};

export const INITIAL_MASTERS = {
  transporters: [],
  vehicles: [],
  drivers: [],
  consignors: [],
  consignees: [],
  stations: [],
  deliveryPersons: [],
  owners: [],
  expenseCategories: [
    { id: 'ec-1', name: 'RTO and Insurance', active: true },
    { id: 'ec-2', name: 'Local', active: true },
    { id: 'ec-3', name: 'Salary', active: true },
  ],
};

