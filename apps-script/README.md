# Google Apps Script + private Google Sheet

The public website must **never** contain:

- Google account password
- Sheet share links used as a database API
- service-account JSON
- OAuth client secrets

Only this Apps Script project may read/write the gym Sheet. The site calls **one** HTTPS URL (`/exec`).

## Architecture

```
GitHub Pages (public JS)
    → POST JSON { action, data, token }
Google Apps Script (runs as you)
    → Private Google Sheet
```

Use `Content-Type: text/plain` from the browser so the request does not need a CORS preflight. `Code.gs` still parses JSON from the body.

## 1. Create a Google Sheet

1. Drive → New → Google Sheets.
2. Name it e.g. `Gym Management (private)`.
3. Keep sharing **Restricted** (only you, or a trusted accountant). Do not set “Anyone with the link”.

## 2. Apps Script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the default `myFunction`.
3. Paste the full contents of `Code.gs` from this folder.
4. Save the project (name: `Gym Management API`).

## 3. Create tabs automatically

In the editor, select function **`setupGymWorkbook`** → Run.

Authorize the script when Google asks (your account accessing *this* spreadsheet).

Optional demo rows: run **`seedDemoData`**.

- Demo admin: `admin` / `Admin@123`
- 10 members `GYM001`–`GYM010`
- 5 payments, 4 plans, 2 expenses

Before real members: run **`clearDemoData`**, then change the admin password hash by creating a new admin row (or re-seed is not enough — edit `AdminUsers` / add a new hash via a small `hashPassword_` test in the editor).

Simplest password change for prototype: temporarily run this in the editor after setup:

```javascript
function setAdminPassword() {
  setupGymWorkbook();
  var hash = hashPassword_("Choose-a-new-password");
  Logger.log(hash);
}
```

Put the logged hash into `AdminUsers.passwordHash` for user `admin`. Never put that plaintext password in the React app.

## 4. Sheet columns

### Members

`memberId, fullName, mobile, email, gender, dateOfBirth, address, joinDate, membershipPlanId, membershipStartDate, membershipEndDate, totalAmount, paidAmount, pendingAmount, lastPaymentDate, status, notes, createdAt, updatedAt`

Status: `ACTIVE | EXPIRED | SUSPENDED | INACTIVE`  
IDs: `GYM001`, `GYM002`, …

`paidAmount` / `pendingAmount` / expiry status are **recalculated in Apps Script** from payment rows.

### Payments

`paymentId, memberId, paymentDate, amount, paymentMethod, transactionReference, paymentStatus, notes, createdAt, createdBy`

Methods: `CASH | UPI | CARD | BANK_TRANSFER`  
Status: `PAID | PENDING | CANCELLED`  
IDs: `PAY001`, …  
Do not delete history; use `cancelPayment` (status `CANCELLED`).

### MembershipPlans

`planId, planName, durationDays, price, description, status`

Examples: Monthly 30 / Quarterly 90 / Half-Yearly 180 / Yearly 365.

### AdminUsers

`adminId, username, passwordHash, fullName, mobile, role, status, createdAt`

Roles: `SUPER_ADMIN | ADMIN`  
Never store plaintext passwords.

### Expenses

`expenseId, expenseDate, category, description, amount, paymentMethod, createdAt, createdBy`

### Settings

One row: `gymName, gymAddress, gymMobile, gymEmail, currency, receiptFooter, timezone`

Defaults: currency `INR`, timezone `Asia/Kolkata`.

### AuditLog

`logId, timestamp, username, action, entity, entityId, details`

### Enquiries (public form)

`enquiryId, fullName, mobile, email, planId, message, status, createdAt`

## 5. Deploy Web App

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
   - This lets the public site *call the script*. It does **not** make the Sheet public.
5. Deploy. Copy the URL ending in `/exec`.

If you change `Code.gs`, use **Deploy → Manage deployments → Edit → New version**.

## 6. Connect the website

In the React project `.env.local`:

```
VITE_GYM_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Restart `npm run dev`. Rebuild before GitHub Pages (`npm run build`) so the URL is baked into `dist` (Vite env is build-time). The URL is a public endpoint by design; **authorization is the admin token**, not a hidden key. Still keep the Sheet private.

## 7. API actions

POST body:

```json
{ "action": "getMembers", "token": "...", "data": {} }
```

Actions: `login`, `getDashboard`, `getMembers`, `getMember`, `createMember`, `updateMember`, `deactivateMember`, `getPayments`, `createPayment`, `cancelPayment`, `getPlans`, `createPlan`, `updatePlan`, `getExpenses`, `createExpense`, `getReports`, `getSettings`, `updateSettings`, `getEnquiries`, `submitEnquiry`, `getReceipt`.

Public (no token): `login`, `submitEnquiry`, `getPlans`.

## 8. Security notes

- Execute as **Me** so the script can write the private Sheet.
- “Anyone” can invoke the web app, so `login` must stay rate-limit-weak in this prototype; use a strong admin password.
- Do not put `TOKEN_SECRET` or `PASSWORD_SALT` in Git. They live in Script Properties.
- Rotate the web app deployment if the `/exec` URL is abused.
