# 🔨 BUILD PROMPT — Girvi / Gold-Silver Mortgage Loan Management System

> Copy everything below this line and paste into Antigravity / Lovable / Bolt.new / Emergent / any AI app builder.

---

## PROJECT OVERVIEW

Build a **full-stack Girvi (Gold/Silver Pledge Loan) Management System** for a jewellery shop / pawnbroker business. This is an internal business application (not a public website) used by shop staff to manage customers who pledge gold/silver items in exchange for a loan, track interest, collect payments, settle deals, and manage the shop's own re-pledging with third-party suppliers/financiers.

**Focus: 100% on functionality and business logic. Design can be simple/clean (a basic admin dashboard UI is enough) — do NOT spend time on fancy design, animations, or marketing pages. Every feature listed below must work end-to-end (Create, Read, Update, Delete, Calculate, Print/Export).**

---

## TECH STACK (mandatory)

- **Frontend:** React (with React Router, Axios for API calls, functional components + hooks). Use plain CSS or Tailwind (whichever is faster to implement) — keep UI minimal, table-and-form based, like an admin panel.
- **Backend:** Node.js + Express.js — REST API architecture
- **Database:** MongoDB (local instance — connection string `mongodb://localhost:27017/girvi_management`), use Mongoose as ODM
- **Auth:** JWT-based authentication with bcrypt password hashing
- **File uploads:** Store customer ID proof images and item images (use multer for uploads, store in local `/uploads` folder, save path reference in MongoDB)
- **PDF/Print:** Any lightweight approach (e.g. generate printable HTML receipt view + browser print, or a PDF library like `pdfkit`/`jspdf`) for Deal Receipts and Reports
- **Excel Import/Export:** Use `xlsx` (SheetJS) npm package on backend for both import and export features
- Structure the project as two folders: `/client` (React app) and `/server` (Node/Express API), with a root `package.json` script to run both concurrently.

---

## GLOBAL APP STRUCTURE

- Login screen (User ID + Password) — JWT token stored in localStorage, protected routes for everything else
- Persistent top header showing: Company Name, Financial Year/Period (e.g. Apr 2026 - Mar 2027), Logged-in User Name, current Date/Day/Time (live clock)
- Persistent footer showing: Company Name, Address, GSTIN, Contact Info (all editable from a Company Settings page)
- Left sidebar navigation with these main sections (matching modules below):
  1. Dashboard
  2. Customers
  3. Masters (Group / Item / Bank / Terms & Conditions)
  4. Deals (New Loan)
  5. Transactions (Payments/Settlement)
  6. Reports
  7. Third-Party Girvi (Suppliers)
  8. Settings (Girvi Setup + SMS Setup)
  9. Import/Export
- Multi-user support: multiple staff logins tracked with "created by / modified by" fields on every record
- All list views must support: search/filter, pagination, sorting by column, and "Export to Excel" button
- All delete actions must show a confirmation modal ("Are you sure you want to delete this?") before executing
- All forms must have client-side + server-side validation on required fields

---

## DATA MODELS (MongoDB Collections — build these exact schemas)

### 1. User
```
{ userId, name, username, passwordHash, role (admin/operator), companyId, isActive, createdAt }
```

### 2. Company
```
{ name, address, city, area, pin, gstin, phone, email, financialYearStart, financialYearEnd,
  logoUrl, printCompanyNameAddress (bool), displayLogoOnReceipt (bool) }
```

### 3. Customer
```
{
  customerCode (auto-increment, unique),
  name, fatherHusbandName, address, state, city, area, pin,
  email, phone1, phone2, phone3, mobile,
  idProofName, idProofNumber, idProofImageUrl,
  interestType ("simple" | "compound"),
  interestRate (number),
  interestFrequency ("yearly" | "monthly" | "daily"),
  compoundMonthDefault (bool), compoundMonth, compoundDate,
  minimumInterestPeriod ("NA" | "7D" | "15D" | "1M"),
  createdAt, updatedAt
}
```

### 4. Group (metal/category master — e.g. Gold, Silver, Other)
```
{ groupId (auto), groupName, defaultRate (number) }
```

### 5. Item (linked to Group — e.g. Kardhan, Ring, Chain)
```
{ itemId (auto), groupId (ref Group), itemName }
```

### 6. Bank
```
{ bankId (auto), bankName }
```

### 7. TermsAndConditions
```
{ termsText (long text, printed on deal receipts) }
```

### 8. Deal (the core Girvi loan record)
```
{
  dealNo (auto-generated unique, e.g. 2627000587),
  dealDate, refNo,
  customerId (ref Customer),
  copiedFromDealId (optional, ref Deal — for "Copy from Deal" feature),
  items: [
    {
      groupId, itemName, pcs, remarks,
      grossWeight, lessWeight, netWeight (= gross-less, auto),
      purityPercent, pureWeight (= netWeight * purity/100, auto),
      rate, estimatedValue (= pureWeight * rate, auto),
      imageUrl
    }
  ],
  groupTotals: [ { groupId, grossWeight, lessWeight, netWeight, pureWeight, estimatedValue } ] // auto-computed rollup by group
  dealAmount, paidPercent, paidAmount, totalValue (auto sum),
  interestRatePerMonth, interestAmountPerMonth (auto),
  returnPeriodMonths,
  payMode ("cash" | "bank"), bankId, chequeNo, chequeDate,
  location, remarks, stopDate,
  status ("active" | "settled" | "overdue"),
  dealStartDate, dealEndDate, lastPaidUpto, paidUpto,
  createdBy, createdAt, updatedAt
}
```

### 9. Transaction (payments / interest collection / settlement against a Deal)
```
{
  transactionNo (auto),
  dealId (ref Deal), customerId (ref Customer),
  tranDate,
  dealAmount, interestPerMonth, ratePercentPerMonth,
  noOfMonths, noOfDays (auto-calc from dealStartDate/lastPaidUpto to tranDate),
  isSettlement (bool),
  closingDate,
  payMode ("cash"|"bank"), bankId, chequeNo,
  submittedBy, remarks,
  principle: { toBePaid, amountPaid, balance },
  compound: { lastBalance, currentBalance, toBePaid, amountPaid, balance },
  discount, totalPaid,
  status ("settled" | "partial"),
  createdAt
}
```
> Business logic: on saving a transaction, recompute Deal's `lastPaidUpto`, `paidUpto`, and `status`. If `isSettlement = true` and full balance = 0, set Deal status = "settled".

### 10. GirviSetup (General Setup — single document/company)
```
{
  printCompanyNameAddress (bool),
  displayLogoInReceipt (bool),
  autoReminderUnsettledGirvi (bool),
  allowIssueMoreThanEstimatedAmount (bool),
  defaultRateOfInterest (number),
  customerNoticeSubject (text),
  openingBalance (number),
  dealPrintHeading (text),
  logoFileUrl
}
```

### 11. SmsSetup
```
{ smsApiProvider, apiKey, senderId, autoReminderTemplate, isEnabled (bool) }
```

### 12. Supplier (Third-Party Girvi — supplier/financier the shop re-pledges to)
```
Same field structure as Customer (name, fatherName, address, phones, mobile, interest config, etc.)
plus: supplierCode (auto)
```

### 13. SupplierDeal (Deal Master — supplier side, shop is the borrower now)
```
Same structure as Deal, but customerId replaced by supplierId (ref Supplier), and represents items the shop has re-pledged to that supplier.
```

### 14. SupplierTransaction (Transaction — supplier side)
```
Same structure as Transaction, but linked to SupplierDeal + supplierId.
```

---

## FEATURE MODULES — build ALL of the following, exactly as described (nothing to be skipped)

### MODULE 1 — Authentication & Session
- Login page: User ID + Password fields, "Login" button
- JWT token generated on login, stored client-side, used in Authorization header for all API calls
- Logout / Change User option in header dropdown
- Show logged-in user name, current date/day/time (live updating clock) in the top header at all times
- Basic role support: admin (full access incl. settings/deletion) vs operator (day-to-day data entry)

### MODULE 2 — Dashboard (Girvi Dashboard)
- Two side-by-side summary cards fetched from a `/api/dashboard` aggregation endpoint:
  - **Customers card:** Opening Balance, Total Customers, Active Deals, Total Active Deal Amount, Total Active Paid Amount, Active Principal Received, Active Interest Received, Net Profit
  - **Suppliers card:** Total Suppliers, Active Deals, Total Active Deal Amount, Total Active Received Amount, Total Principal Paid, Total Interest Paid, Closing Balance, Net Loss
- "Active Deals" button/link on the Customers card → filters and navigates to a list of only currently active (unsettled) deals
- Below the cards: a full data table of all customers with columns: Code, Name, Father Name, Address, City, State, Mobile — searchable, paginated

### MODULE 3 — Customer Master (CRUD)
- Full form matching the Customer schema above (all fields from Personal Details, Location, and Interest Configuration sections)
- Auto-generate `customerCode` on create
- Support file upload for ID proof image
- Interest Type radio (Simple/Compound), Frequency radio (Yearly/Monthly/Daily), Compound Month/Date fields, Minimum Interest radio (N/A, 7D, 15D, 1M)
- List view with search (by name/mobile/code), Edit, Delete (with confirmation), "Export to Excel" button
- Prev/Next record navigation buttons on the detail/edit form (like flipping through records one at a time)

### MODULE 4 — Group Master (CRUD)
- Fields: Group Name, Rate — auto Group ID
- Simple list + add/edit/delete with confirmation modal on delete

### MODULE 5 — Item Master (CRUD)
- Fields: Item Name, linked Group (dropdown of Groups)
- List + add/edit/delete

### MODULE 6 — Bank Master (CRUD)
- Fields: Bank Name — auto Bank ID
- Used later as a dropdown in Deal/Transaction payment mode = Bank

### MODULE 7 — Terms & Conditions Master
- Single rich-text/textarea field, editable, saved and reused on every Deal receipt print

### MODULE 8 — Deal Master (Create New Girvi Loan) — CORE FEATURE
- Header: Deal Date, Ref No, auto-generated Deal No, Customer select (searchable dropdown), "Copy from Deal" button (pick an old deal and prefill this form from it)
- Dynamic repeating item rows table (add/remove rows) with columns: Group (dropdown), Item Name (dropdown filtered by selected Group), Pcs, Remarks, Gross Wt, Less Wt, Net Wt (auto = Gross - Less, read-only), Purity %, Pure Wt (auto = Net Wt × Purity/100, read-only), Rate, Estimated Value (auto = Pure Wt × Rate, read-only), Image upload per item
- Auto-generated "Group Gross Total" summary table below, grouped and totaled by metal group (Gross/Less/Net/Pure Wt and Estimated Value totals per group)
- Financial fields: Deal Amount, Paid Amt %, Paid Amount, Total Value (auto, read-only), Interest Rate/Month %, Interest Amount/Month (auto), Return Period (months), Cash/Bank toggle + conditional Cheque No/Date fields, Location, Remarks, Stop Date
- "Add Customer" and "Add Item" buttons that open a modal to create a new Customer/Item without leaving the Deal screen
- Save, Edit, Delete, Print (generate a printable receipt using Terms & Conditions + company header/footer), Cancel, Prev/Next navigation
- On save: auto-set `dealStartDate` = dealDate, `dealEndDate` = dealDate + returnPeriodMonths, status = "active"

### MODULE 9 — Transaction Module (Payment Collection / Settlement) — CORE FEATURE
- Select Customer + Deal (auto-pulls Deal Amount, Interest/Month, Deal Start/End Date, Last Paid Upto)
- Fields: Transaction Date, Rate % per month (editable), No. of Months, No. of Days (auto-calculated from date difference), Settlement checkbox, Closing Date, Pay Mode (Cash/Bank + Bank dropdown + Cheque No), Submitted By, Remarks
- Auto-calculation engine (implement exact business logic):
  - **Principle box:** To be Paid, Amount Paid (user input), Balance (auto = To be Paid - Amount Paid)
  - **Compound box:** Last Balance, Current Balance (compounded interest based on Customer's interest type/rate/frequency), To be Paid, Amount Paid, Balance
  - Discount field (manual entry, can reduce final total)
  - Total Paid (auto sum of Principal Paid + Compound/Interest Paid - Discount)
- If Settlement is checked and Balance = 0 for both Principle and Compound → mark Deal as "settled", show a red "SETTLED" badge on the transaction screen, and stop further interest accrual for that deal
- Save, Edit, Delete, Print (printable payment receipt), Cancel, Prev/Next navigation
- List/history view of all transactions per Deal (statement of account)

### MODULE 10 — Girvi Setup (Settings) — General
- A settings form with these exact fields:
  1. Want to Print Company Name/Address (checkbox)
  2. Display Company Logo in Receipt (Yes/No)
  3. Auto Reminder of Unsettled Girvi but Completed as per Time (Yes/No)
  4. Want to Issue more than Estimated Amount in Deal Master (checkbox)
  5. Default Rate of Interest (number)
  6. Customer Notice Subject (text)
  7. Opening Balance (number)
  8. Deal Print Heading (text)
  9. Logo File upload
- "Update Entries" button saves all settings to the single GirviSetup document

### MODULE 11 — SMS Setup (Settings)
- Fields: SMS/WhatsApp API provider name, API Key, Sender ID, Auto Reminder message template (with placeholders like {customerName}, {dealNo}, {balanceAmount}), Enable/Disable toggle
- (Actual SMS sending can be mocked/logged if no real SMS provider is connected — just build the settings + trigger logic)

### MODULE 12 — Girvi Reports
- **Report 1 — "Auto Reminder of Unsettled Girvi but Completed as per Period":**
  - Filters: "Up to Date" date picker, Search by Name/Mobile/Deal No.
  - Table columns: checkbox (select row), S.No, Deal No, Deal Date, Customer Name, Area, Mobile No, Period (in months), Completed Date, Deal Amount, Paid Amount, Balance Amount
  - Support multi-row checkbox selection for bulk actions (e.g. bulk "send reminder")
  - Print button, Close button
- **Report 2 — Customer Ledger/Statement:** all transactions for a selected customer with running balance
- **Report 3 — Group/Item-wise Stock Report:** total weight/value of items currently held as active Girvi collateral, grouped by metal Group
- **Report 4 — Profit & Loss Report:** total interest earned vs any discounts given, over a selected date range
- **Report 5 — Outstanding/Balance Report:** all customers with non-zero balance, sorted by balance descending
- Every report: date-range filter, export to Excel, and print-friendly view

### MODULE 13 — Third-Party Girvi (Supplier / Re-Pledge Module) — CORE FEATURE
- **Supplier Master:** CRUD form identical in structure to Customer Master (name, father name, address, phones, ID proof, interest config) but for Suppliers/Financiers
- **Third-Party Transfer:** a form/flow to select one or more items from an existing (active) Customer Deal and mark them as transferred/re-pledged to a chosen Supplier, creating a link between the original Deal's items and a new SupplierDeal
- **Deal Master (Supplier side):** same structure/logic as Module 8 but the "customer" here is a Supplier (shop is borrowing against the re-pledged items)
- **Transaction (Supplier side):** same structure/logic as Module 9 but for paying interest/principal back to the Supplier
- **Supplier Girvi Report:** list of all supplier-wise active/settled deals, same style as Report 1 above
- **Supplier Balance Sheet:** running balance owed to each supplier
- **Supplier Profit/Loss:** compares interest rate charged to the original customer vs interest rate paid to the supplier on the same re-pledged item, to compute margin profit/loss

### MODULE 14 — Import / Export Utility
- **Import from Excel:** upload an `.xlsx` file to bulk-create Customers (map columns to Customer schema fields), show a preview + validation errors before final import, then bulk insert into MongoDB
- **Export to Excel:** available as a button on Customer list, Deal list, Transaction list, and every Report — downloads current filtered data as `.xlsx`

### MODULE 15 — Confirmations, Validation & System Utility
- Global reusable "Are you sure?" confirmation modal component for every Delete and Exit action
- Global toast/alert notifications for success/error messages (e.g. "No active deal present", "Record saved successfully")
- Server-side validation middleware: reject save if required fields (Name, Deal Amount, Interest Rate, Return Period, etc.) are missing
- Consistent action-button set (Prev, Next, Find, Add, Edit, Save, Delete, Print, Cancel) as a shared reusable component/toolbar across Customer, Group, Item, Bank, Deal, Transaction, Supplier, SupplierDeal screens — keep this UX pattern consistent everywhere

### MODULE 16 — Multi-Company / Multi-Session Support (basic version)
- Support more than one Company record in the system; logged-in user is tied to a company; all Customers/Deals/Transactions are scoped by `companyId`
- A simple "Switch Company" dropdown in the header for admin users
- Ensure all API queries filter by the current session's `companyId` so data from different companies never mixes

---

## API ROUTES (build these REST endpoints — Express)

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/dashboard

CRUD   /api/customers            (+ /api/customers/export, /api/customers/import)
CRUD   /api/groups
CRUD   /api/items
CRUD   /api/banks
GET    /api/terms         PUT /api/terms

CRUD   /api/deals                (+ /api/deals/:id/print, /api/deals/copy/:id)
CRUD   /api/transactions          (+ /api/transactions/:id/print)

GET    /api/settings/girvi        PUT /api/settings/girvi
GET    /api/settings/sms          PUT /api/settings/sms

GET    /api/reports/unsettled-reminder
GET    /api/reports/customer-ledger/:customerId
GET    /api/reports/stock-summary
GET    /api/reports/profit-loss
GET    /api/reports/outstanding

CRUD   /api/suppliers
CRUD   /api/supplier-deals
CRUD   /api/supplier-transactions
GET    /api/reports/supplier-girvi
GET    /api/reports/supplier-balance-sheet
GET    /api/reports/supplier-profit-loss

CRUD   /api/companies
```

---

## BUILD ORDER (do it in this priority sequence)

1. Project setup: Express server + MongoDB connection + React app scaffold + JWT auth + basic layout (header/sidebar/footer)
2. Customer Master + Group Master + Item Master + Bank Master + Terms Master (all Masters CRUD)
3. Deal Master (with full weight/value auto-calculation logic)
4. Transaction Module (with principal/compound interest auto-calculation logic — this is the most complex business logic, take extra care)
5. Dashboard (aggregation queries across Customers/Deals/Transactions)
6. Girvi Setup + SMS Setup screens
7. All Reports (Module 12)
8. Third-Party Girvi module (Supplier Master, Supplier Deal, Supplier Transaction, Supplier Reports)
9. Import/Export Excel utility
10. Final polish: confirmation modals, toasts, print views, validation everywhere

---

## IMPORTANT NOTES

- This is a **B2B internal business tool**, not a consumer website — prioritize data accuracy, correct calculations, and complete CRUD over visual design.
- All monetary fields should be stored as Numbers (or use a Decimal library) and always formatted with 2 decimal places and Indian numbering (e.g. 1,47,47,199.60) in the UI.
- All auto-calculated fields (Net Weight, Pure Weight, Estimated Value, Interest Amounts, Balances) must be computed on the backend (not just frontend) so data integrity is guaranteed even via direct API calls.
- Every module listed above (1 through 16) must be fully functional — do not stub out or skip any module.
