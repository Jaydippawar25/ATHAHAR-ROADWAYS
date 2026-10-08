export const STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

export const INITIAL_MASTERS = {
  transporters: [
    { id: 'tr-1', name: 'LIMRA FREIGHT LOGISTICS', phone: '9876543210', city: 'MUMBAI', active: true },
    { id: 'tr-2', name: 'ATHAHAR ROADWAYS MAIN', phone: '9876543211', city: 'BHIWANDI', active: true },
  ],
  vehicles: [
    { id: 'vh-1', vehicleNo: 'MH-04-FK-1234', ownerName: 'AHMED KHAN', type: 'CONTAINER', active: true },
    { id: 'vh-2', vehicleNo: 'MH-43-BP-5678', ownerName: 'SULTAN ENTERPRISES', type: 'TRUCK', active: true },
  ],
  drivers: [
    { id: 'dr-1', name: 'RAMESH KUMAR', phone: '9123456780', licenseNo: 'MH0420190012', active: true },
    { id: 'dr-2', name: 'ABDUL SHAIKH', phone: '9123456781', licenseNo: 'MH4320210088', active: true },
  ],
  consignors: [
    { id: 'cn-1', name: 'GLOBAL TEXTILES PVT LTD', city: 'SURAT', gstNo: '24AAAAA0000A1Z5', active: true },
    { id: 'cn-2', name: 'SUPER TRADERS', city: 'AHMEDABAD', gstNo: '24BBBBB1111B1Z2', active: true },
  ],
  consignees: [
    { id: 'ce-1', name: 'BHIWANDI FASHION HUB', city: 'BHIWANDI', phone: '9988776655', active: true },
    { id: 'ce-2', name: 'METRO RETAILS', city: 'MUMBAI', phone: '9988776644', active: true },
  ],
  stations: [
    { id: 'st-1', name: 'BHIWANDI HUB', code: 'BWD', active: true },
    { id: 'st-2', name: 'MUMBAI CENTRAL', code: 'BCT', active: true },
    { id: 'st-3', name: 'SURAT JUNCTION', code: 'ST', active: true },
  ],
  deliveryPersons: [
    { id: 'dp-1', name: 'SURESH PATIL', phone: '9811223344', active: true },
    { id: 'dp-2', name: 'MOHAMMED RAFI', phone: '9811223355', active: true },
  ],
  owners: [
    { id: 'ow-1', name: 'AHMED KHAN', phone: '9876543220', active: true },
    { id: 'ow-2', name: 'SULTAN ENTERPRISES', phone: '9876543221', active: true },
    { id: 'ow-3', name: 'RAJESH PATEL', phone: '9876543222', active: true },
  ],
};
