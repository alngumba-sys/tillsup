# Multi-Tenant POS System - Architecture Guide

## Overview

The POS system has been extended with full multi-tenant capabilities, role-based access control (RBAC), and business isolation. This document outlines the architecture and functionality.

---

## Authentication Flow

### 1. Business Registration (`/register`)
- Business owners register their business with:
  - Business name
  - Owner personal details (first name, last name)
  - Owner email and password
- Creates:
  - Business record
  - Business owner user account
- Redirects to login page after successful registration

### 2. Login (`/login`)
- Users log in with:
  - Email
  - Password
- System validates credentials and loads:
  - User profile
  - Business context
  - Role permissions
- Automatic routing:
  - If `mustChangePassword === true` → `/change-password`
  - Otherwise → `/dashboard`

### 3. First Login Password Change (`/change-password`)
- **Required** for all staff members on first login
- Business owner sets their own password during registration (no forced change)
- Staff created by owner/manager must change password before accessing system
- Blocks access to all other pages until password is changed

---

## Role-Based Access Control (RBAC)

### Roles

1. **Business Owner**
   - Full system access
   - Can manage all staff
   - Cannot be edited or deleted
   - Sees all business sales and data

2. **Manager**
   - Can manage staff (create, edit, delete)
   - Full access to reports and inventory
   - Sees all business sales and data
   - Cannot access other businesses' data

3. **Accountant**
   - Access to reports and analytics
   - View-only access to sales data
   - Sees all business sales and data
   - No staff management

4. **Cashier**
   - Access to POS terminal
   - Access to dashboard
   - **Sees only their own sales**
   - No staff or inventory management

5. **Staff**
   - Access to POS terminal
   - Access to dashboard
   - **Sees only their own sales**
   - Most restricted role

### Access Matrix

| Feature | Business Owner | Manager | Accountant | Cashier | Staff |
|---------|---------------|---------|------------|---------|-------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| POS Terminal | ✅ | ✅ | ❌ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ❌ | ❌ | ❌ |
| Staff Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| See All Sales | ✅ | ✅ | ✅ | ❌ | ❌ |
| See Own Sales Only | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Data Isolation

### Business Isolation

All data is scoped to a specific business:

- **Inventory**: Each business has its own products
- **Staff**: Staff members belong to one business
- **Sales**: Sales are tagged with `businessId`
- **Reports**: Filtered by business automatically

### Sales Tracking

Each sale includes:
- `businessId` - Which business this sale belongs to
- `staffId` - Which staff member made the sale
- `staffRole` - Role of the staff member
- `staffName` - Name of the staff member (for reports)

### Role-Scoped Data Visibility

**For Cashiers and Staff:**
- KPIs show only their personal sales
- Reports show only their personal sales
- Cannot see sales made by other staff

**For Managers, Accountants, and Owners:**
- KPIs show all business sales
- Reports show all business sales
- Can see sales by all staff members

---

## Staff Management

### Creating Staff

**Who can create staff:**
- Business Owner
- Manager

**Process:**
1. Navigate to Staff Management
2. Click "Add Staff Member"
3. Enter:
   - First name, last name
   - Email
   - Role (Manager, Cashier, Accountant, Staff)
4. System auto-generates a secure temporary password
5. Owner/Manager receives credentials to share with staff member

**Generated Credentials:**
- Email: As entered
- Password: Auto-generated (e.g., `staff7ab3cd`)
- Displayed once in a dialog with copy-to-clipboard buttons

### Staff Lifecycle

1. **Created** - Account created with temporary password
2. **Pending Setup** - `mustChangePassword = true`
3. **Active** - Password changed, full access granted

### Editing Staff

- Owners and Managers can edit any staff member
- Cannot edit the business owner
- Can change: name, email, role
- Cannot change: business, created date

### Deleting Staff

- Owners and Managers can delete staff
- Cannot delete the business owner
- Confirmation required

---

## Context Architecture

### AuthContext

**Responsibilities:**
- User authentication
- Business management
- Staff management
- Permission checks

**Key Functions:**
- `registerBusiness()` - Register new business
- `login()` - Authenticate user
- `logout()` - End session
- `changePassword()` - Update password
- `createStaff()` - Create staff account
- `updateStaff()` - Update staff details
- `deleteStaff()` - Remove staff
- `hasPermission()` - Check role access

### SalesContext

**Responsibilities:**
- Record all sales
- Track business and staff attribution
- Provide filtered analytics

**Key Features:**
- Multi-tenant support with `businessId` filtering
- Role-based filtering with `staffId`
- Persistent storage in localStorage
- Immutable sales history

**Key Functions:**
- `recordSale()` - Record new sale
- `getSalesToday(businessId?, staffId?)` - Get filtered sales
- `getTotalRevenue(businessId?, staffId?)` - Calculate revenue
- `getBestSellingProducts(limit, businessId?, staffId?)` - Top products

### InventoryContext

**Responsibilities:**
- Manage business inventory
- Business isolation
- Auto-seed demo data

**Key Features:**
- Each business gets its own inventory
- Automatic seeding on first login
- Persistent storage in localStorage

---

## Frontend-Only Implementation

### Local Storage

All data is stored in localStorage:
- `pos_businesses` - All business records
- `pos_users` - All user accounts
- `pos_current_user` - Current logged-in user
- `pos_current_business` - Current business context
- `pos_sales_history` - All sales (multi-business)
- `pos_inventory` - All inventory (multi-business)

### Migration to Backend

The system is designed to be **backend-ready**:

1. **Replace AuthContext methods** with API calls
2. **Replace localStorage** with database queries
3. **Add server-side password hashing**
4. **Add JWT or session-based auth**
5. **Add API middleware** for RBAC enforcement

All business logic is already structured for easy migration.

---

## Security Considerations

### Current (Frontend-Only)

⚠️ **Not production-ready:**
- Passwords stored in plain text (localStorage)
- No server-side validation
- Client-side only access control

### For Production (Backend)

**Required:**
- ✅ Password hashing (bcrypt, argon2)
- ✅ JWT or session tokens
- ✅ Server-side RBAC enforcement
- ✅ Database isolation (row-level security)
- ✅ Input sanitization
- ✅ Rate limiting
- ✅ HTTPS only

---

## Usage Examples

### Register a Business

1. Go to `/register`
2. Enter business name: "Pizza Palace"
3. Enter owner details
4. Click "Register Business"
5. Redirected to login

### Create Staff

1. Login as Business Owner
2. Navigate to "Staff"
3. Click "Add Staff Member"
4. Enter: john@pizzapalace.com, John, Doe, Cashier
5. Copy generated credentials
6. Share with John

### Staff First Login

1. John goes to `/login`
2. Enters credentials
3. Redirected to `/change-password`
4. Creates new password
5. Redirected to `/dashboard`

### Role-Based Sales Visibility

**Scenario:** Pizza Palace has 2 cashiers

**Cashier A** (logged in):
- Sees only their own sales in KPIs
- Sees only their own sales in Reports
- Cannot see Cashier B's sales

**Business Owner** (logged in):
- Sees all sales from all cashiers
- Sees business-wide KPIs
- Can see breakdown by staff in reports

---

## Testing the System

### Test Scenario 1: Multi-Business Isolation

1. Register Business A
2. Login and create inventory
3. Logout
4. Register Business B
5. Login and create inventory
6. Verify Business B cannot see Business A's data

### Test Scenario 2: Role-Based Visibility

1. Register business as Owner
2. Create 2 cashiers
3. Login as Cashier 1, make 3 sales
4. Login as Cashier 2, make 2 sales
5. Login as Owner
6. Verify KPIs show 5 total sales
7. Login as Cashier 1
8. Verify KPIs show 3 sales (only theirs)

### Test Scenario 3: Password Change

1. Create new staff member
2. Note generated password
3. Logout
4. Login with staff credentials
5. Verify redirect to `/change-password`
6. Try to navigate to `/dashboard` manually
7. Verify still redirected to `/change-password`
8. Change password
9. Verify access granted to dashboard

---

## Future Enhancements

- [ ] Backend API integration
- [ ] Database migration
- [ ] Password reset flow
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Audit logs
- [ ] Staff performance reports
- [ ] Business owner can transfer ownership
- [ ] Deactivate staff instead of delete
- [ ] Custom role creation
- [ ] Permission granularity

---

## Conclusion

The system now supports:
✅ Multi-business registration  
✅ Business owner and staff authentication  
✅ Role-based access control  
✅ Data isolation per business  
✅ Role-scoped sales visibility  
✅ Forced password change on first login  
✅ Staff management by owner/manager  
✅ Frontend-only mock implementation  
✅ Backend-ready architecture  

The implementation is production-ready from a **structure** perspective but requires backend integration for security and scalability.
