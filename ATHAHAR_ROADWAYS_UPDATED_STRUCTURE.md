# ATHAHAR ROADWAYS — UPDATED PROJECT STRUCTURE

## 1. Project Scope

ATHAHAR ROADWAYS is a transport management web application based on the client's existing LIMRA desktop workflow.

The new system must reproduce the **business workflow and fields** of the client's existing:

1. **Inward**
2. **Pending Stock**
3. **Outward**

The old desktop application's UI should not be copied visually. The new application should use a modern, responsive business UI.

### Critical LR Rule

**LR No. is an existing number from the client's transport document.**

The application:

- accepts LR No. manually
- stores LR No.
- searches LR No.
- tracks LR No.
- uses the same LR during Outward
- never generates LR No.
- never automatically changes LR No.

---

# 2. Client Screen Mapping

## Screen 1 — INWARD

The first client screenshot is the **Inward** transaction screen.

### Inward Header

- No.
- Date
- Transporter Name
- Vehicle No.
- Driver Name
- From
- Memo No.

### Inward LR Entry

- SrNo
- LR No
- Date
- PKG
- Invoice No
- CT To
- Consignor
- Consignee
- To Pay Amt
- TBB
- Paid Amt

### Inward Grid

Display multiple LR entries with:

- SrNo
- LRNo
- InDate
- PKG
- INVNo
- CTTo
- Consignor
- Consignee
- ToPayAmt
- TBB

### Inward Summary

- Total Qty
- Total To Pay Amt
- Total TBB
- Total Paid Amt

### Inward Actions

- Save
- View
- Delete
- Modify
- Close
- Print
- Print Preview

---

## Screen 2 — OUTWARD

The second client screenshot is the **Outward** transaction screen.

### Outward Header

- No.
- Date
- Vehicle No.
- Driver Name
- From
- Memo No.

### Outward LR / Delivery Entry

- LR No
- Date
- PKG
- Invoice No
- CT To
- Delivery Person
- Consignor
- Consignee
- To Pay Amt
- TBB
- Paid Amt

### Outward Grid

Display selected/existing LR records with:

- SrNo
- LRNo
- InDate
- PKG
- INVNo
- CTTo
- DelPerson
- Consignor
- Consignee
- ToPayAmt
- TBB
- PaidAmt

### Outward Summary

- Total Qty
- Total To Pay Amt
- Total TBB
- Total Paid Amt

### Outward Actions

- New
- View
- Delete
- Modify
- Close
- Print
- Print Preview

### Important

Outward must use an **existing Pending LR** from Inward.

---

# 3. Main Business Flow

```text
Existing Client Transport Document
                |
                | Existing LR No.
                v
             INWARD
                |
                v
          PENDING STOCK
                |
                | Select existing LR
                v
             OUTWARD
                |
                v
            DELIVERED
```

---

# 4. Technology Stack

## Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Zod

## Backend

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Security Rules

## Reports / Export

- XLSX / SheetJS
- jsPDF
- jspdf-autotable
- Browser Print / Print CSS

## Deployment

- Vercel or Firebase Hosting
- GitHub

---

# 5. Complete Folder Structure

```text
athahar-roadways/
├── public/
│   ├── logo/
│   ├── icons/
│   └── assets/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx
│   │   │   ├── Navigation.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── Pagination.jsx
│   │   │   └── Loading.jsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.jsx
│   │   │   ├── RecentInward.jsx
│   │   │   ├── PendingSummary.jsx
│   │   │   └── RecentOutward.jsx
│   │   │
│   │   ├── inward/
│   │   │   ├── InwardHeaderForm.jsx
│   │   │   ├── InwardLRForm.jsx
│   │   │   ├── InwardItemsTable.jsx
│   │   │   ├── InwardTotals.jsx
│   │   │   ├── InwardActions.jsx
│   │   │   └── InwardPrint.jsx
│   │   │
│   │   ├── pending/
│   │   │   ├── PendingStockTable.jsx
│   │   │   ├── PendingFilters.jsx
│   │   │   └── PendingDetails.jsx
│   │   │
│   │   ├── outward/
│   │   │   ├── OutwardHeaderForm.jsx
│   │   │   ├── PendingLRSelector.jsx
│   │   │   ├── OutwardLRTable.jsx
│   │   │   ├── OutwardTotals.jsx
│   │   │   ├── OutwardActions.jsx
│   │   │   └── OutwardPrint.jsx
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportFilters.jsx
│   │   │   ├── InwardReport.jsx
│   │   │   ├── PendingReport.jsx
│   │   │   ├── OutwardReport.jsx
│   │   │   └── DeliveredReport.jsx
│   │   │
│   │   └── master/
│   │       ├── TransporterForm.jsx
│   │       ├── VehicleForm.jsx
│   │       ├── DriverForm.jsx
│   │       ├── OwnerForm.jsx
│   │       ├── ConsignorForm.jsx
│   │       ├── ConsigneeForm.jsx
│   │       ├── StationForm.jsx
│   │       └── DeliveryPersonForm.jsx
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   │
│   │   ├── Inward/
│   │   │   ├── InwardList.jsx
│   │   │   ├── InwardCreate.jsx
│   │   │   ├── InwardView.jsx
│   │   │   └── InwardEdit.jsx
│   │   │
│   │   ├── PendingStock/
│   │   │   ├── PendingStock.jsx
│   │   │   └── PendingStockView.jsx
│   │   │
│   │   ├── Outward/
│   │   │   ├── OutwardList.jsx
│   │   │   ├── OutwardCreate.jsx
│   │   │   ├── OutwardView.jsx
│   │   │   └── OutwardEdit.jsx
│   │   │
│   │   ├── Reports/
│   │   │   ├── InwardReport.jsx
│   │   │   ├── PendingReport.jsx
│   │   │   ├── OutwardReport.jsx
│   │   │   └── DeliveredReport.jsx
│   │   │
│   │   ├── Masters/
│   │   │   ├── Transporters.jsx
│   │   │   ├── Vehicles.jsx
│   │   │   ├── Drivers.jsx
│   │   │   ├── Owners.jsx
│   │   │   ├── Consignors.jsx
│   │   │   ├── Consignees.jsx
│   │   │   ├── Stations.jsx
│   │   │   └── DeliveryPersons.jsx
│   │   │
│   │   └── Settings/
│   │       ├── Users.jsx
│   │       ├── Roles.jsx
│   │       └── SystemSettings.jsx
│   │
│   ├── firebase/
│   │   ├── firebase.js
│   │   ├── auth.js
│   │   ├── firestore.js
│   │   └── storage.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── inwardService.js
│   │   ├── inwardItemService.js
│   │   ├── pendingStockService.js
│   │   ├── outwardService.js
│   │   ├── outwardItemService.js
│   │   ├── transporterService.js
│   │   ├── vehicleService.js
│   │   ├── driverService.js
│   │   ├── ownerService.js
│   │   ├── consignorService.js
│   │   ├── consigneeService.js
│   │   ├── stationService.js
│   │   ├── deliveryPersonService.js
│   │   ├── reportService.js
│   │   ├── exportService.js
│   │   ├── printService.js
│   │   └── auditService.js
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useInward.js
│   │   ├── usePendingStock.js
│   │   ├── useOutward.js
│   │   └── useMasters.js
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── AppContext.jsx
│   │
│   ├── routes/
│   │   ├── AppRoutes.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── RoleRoute.jsx
│   │
│   ├── utils/
│   │   ├── validation.js
│   │   ├── dateUtils.js
│   │   ├── numberUtils.js
│   │   ├── constants.js
│   │   └── exportUtils.js
│   │
│   ├── styles/
│   │   ├── index.css
│   │   ├── print.css
│   │   └── table.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── firestore.rules
├── firestore.indexes.json
└── README.md
```

---

# 6. Firebase Collections

```text
users
transporters
vehicles
drivers
owners
consignors
consignees
stations
deliveryPersons

inwards
inwardItems

outwards
outwardItems

auditLogs
settings
```

## Inward

```js
{
  inwardNo,
  date,
  transporterId,
  vehicleId,
  driverId,
  from,
  memoNo,
  totalQty,
  totalToPay,
  totalTbb,
  totalPaid,
  status,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy
}
```

## Inward Item

```js
{
  inwardId,
  srNo,
  lrNo,
  date,
  pkg,
  invoiceNo,
  ctTo,
  consignorId,
  consigneeId,
  toPayAmount,
  tbbAmount,
  paidAmount,
  status: "PENDING",
  createdAt,
  createdBy
}
```

## Outward

```js
{
  outwardNo,
  date,
  vehicleId,
  driverId,
  from,
  memoNo,
  totalQty,
  totalToPay,
  totalTbb,
  totalPaid,
  status,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy
}
```

## Outward Item

```js
{
  outwardId,
  inwardItemId,
  lrNo,
  lrDate,
  pkg,
  invoiceNo,
  ctTo,
  deliveryPersonId,
  consignorId,
  consigneeId,
  toPayAmount,
  tbbAmount,
  paidAmount,
  status: "DELIVERED",
  deliveredAt,
  deliveredBy
}
```

---

# 7. Status Model

```text
INWARD ITEM
    |
    v
PENDING
    |
    | Outward completed
    v
DELIVERED
```

Never allow:

```text
DELIVERED → PENDING
DELIVERED → OUTWARD AGAIN
```

unless an authorized correction workflow is explicitly implemented.

---

# 8. Navigation

```text
Dashboard
Inward
Pending Stock
Outward
Reports
Masters
Settings
```

The system should be modern, responsive, searchable and suitable for desktop and tablet use.
