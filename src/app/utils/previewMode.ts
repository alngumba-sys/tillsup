/**
 * Preview Mode Detection & Mock Data
 * 
 * Detects Figma Make preview environment and provides mock data
 * when Supabase network requests are blocked
 */

import { User, Business, UserRole, SubscriptionPlan, SubscriptionStatus } from "../contexts/AuthContext";

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Checks if we should skip a Supabase call
 * Returns true if:
 * - In preview mode, OR
 * - The ID is not a valid UUID
 */
export function shouldSkipSupabaseCall(id?: string | null): boolean {
  return isPreviewMode() || !isValidUUID(id);
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW MODE DETECTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Detects if we're running in Figma Make preview mode
 */
export function isPreviewMode(): boolean {
  // Check for Figma Make environment indicators
  const isFigmaPreview = 
    // Check for Figma-specific URL patterns
    window.location.hostname.includes('figma.com') ||
    window.location.hostname.includes('fig.run') ||
    window.location.hostname.includes('figma-make') ||
    window.location.hostname.includes('figma.design') ||
    // Check for preview parameter
    new URLSearchParams(window.location.search).has('preview') ||
    // Check for local storage flag (can be set manually for testing)
    localStorage.getItem('figma-preview-mode') === 'true';

  if (isFigmaPreview) {
    console.log('🎨 Figma Make Preview Mode Detected');
  }

  return isFigmaPreview;
}

/**
 * Enable preview mode manually (for testing)
 */
export function enablePreviewMode() {
  localStorage.setItem('figma-preview-mode', 'true');
  console.log('🎨 Preview mode enabled - reload page to activate');
}

/**
 * Disable preview mode
 */
export function disablePreviewMode() {
  localStorage.removeItem('figma-preview-mode');
  console.log('🎨 Preview mode disabled - reload page to deactivate');
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA FOR PREVIEW MODE
// ═══════════════════════════════════════════════════════════════════

/**
 * Mock user for preview mode
 */
export const mockPreviewUser: User = {
  id: 'preview-user-001',
  email: 'demo@tillsup.com',
  phone: '+254712345678',
  firstName: 'Demo',
  lastName: 'User',
  role: 'Business Owner',
  roleId: null,
  businessId: 'preview-business-001',
  branchId: 'preview-branch-001',
  mustChangePassword: false,
  createdAt: new Date('2024-01-01'),
  canCreateExpense: true,
  salary: {
    salaryType: 'monthly',
    baseSalary: 50000,
    currency: 'KES',
    payFrequency: 'monthly',
    effectiveFrom: new Date('2024-01-01')
  }
};

/**
 * Mock business for preview mode
 */
export const mockPreviewBusiness: Business = {
  id: 'preview-business-001',
  name: 'Tillsup Demo Store',
  ownerId: 'preview-user-001',
  createdAt: new Date('2024-01-01'),
  subscriptionPlan: 'Pro',
  subscriptionStatus: 'active',
  trialEndsAt: new Date('2025-01-01'),
  maxBranches: 10,
  maxStaff: 50,
  currency: 'KES',
  country: 'Kenya',
  timezone: 'Africa/Nairobi',
  businessType: 'Retail',
  workingHours: {
    start: '08:00',
    end: '20:00'
  },
  taxConfig: {
    enabled: true,
    name: 'VAT',
    percentage: 16,
    inclusive: false
  },
  branding: {
    logoUrl: undefined,
    primaryColor: '#0891b2',
    accentColor: '#0891b2',
    receiptHeader: 'Tillsup Demo Store',
    receiptFooter: 'Thank you for your business!',
    hidePlatformBranding: false
  },
  completedOnboarding: true
};

/**
 * Mock staff members for preview mode
 */
export const mockPreviewStaff: User[] = [
  {
    id: 'preview-staff-001',
    email: 'manager@tillsup.com',
    phone: '+254723456789',
    firstName: 'Sarah',
    lastName: 'Manager',
    role: 'Manager',
    roleId: 'role-manager',
    businessId: 'preview-business-001',
    branchId: 'preview-branch-001',
    mustChangePassword: false,
    createdAt: new Date('2024-01-15'),
    canCreateExpense: true,
    salary: {
      salaryType: 'monthly',
      baseSalary: 35000,
      currency: 'KES',
      payFrequency: 'monthly',
      effectiveFrom: new Date('2024-01-15')
    }
  },
  {
    id: 'preview-staff-002',
    email: 'cashier1@tillsup.com',
    phone: '+254734567890',
    firstName: 'John',
    lastName: 'Cashier',
    role: 'Cashier',
    roleId: 'role-cashier',
    businessId: 'preview-business-001',
    branchId: 'preview-branch-001',
    mustChangePassword: false,
    createdAt: new Date('2024-02-01'),
    canCreateExpense: false,
    salary: {
      salaryType: 'monthly',
      baseSalary: 25000,
      currency: 'KES',
      payFrequency: 'monthly',
      effectiveFrom: new Date('2024-02-01')
    }
  },
  {
    id: 'preview-staff-003',
    email: 'accountant@tillsup.com',
    phone: '+254745678901',
    firstName: 'Mary',
    lastName: 'Accountant',
    role: 'Accountant',
    roleId: 'role-accountant',
    businessId: 'preview-business-001',
    branchId: 'preview-branch-001',
    mustChangePassword: false,
    createdAt: new Date('2024-02-15'),
    canCreateExpense: true,
    salary: {
      salaryType: 'monthly',
      baseSalary: 40000,
      currency: 'KES',
      payFrequency: 'monthly',
      effectiveFrom: new Date('2024-02-15')
    }
  }
];

/**
 * Mock inventory items for preview mode
 */
export const mockPreviewInventory = [
  {
    id: 'preview-item-001',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    name: 'Coca Cola 500ml',
    sku: 'SKU001',
    barcode: '12345678901',
    category_id: 'preview-cat-beverages',
    stock: 150,
    reorder_level: 50,
    unit_price: 50,
    cost_price: 35,
    image_url: null,
    description: 'Refreshing soft drink',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-03-05').toISOString()
  },
  {
    id: 'preview-item-002',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    name: 'Bread 400g',
    sku: 'SKU002',
    barcode: '12345678902',
    category_id: 'preview-cat-bakery',
    stock: 80,
    reorder_level: 30,
    unit_price: 55,
    cost_price: 40,
    image_url: null,
    description: 'Fresh white bread',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-03-05').toISOString()
  },
  {
    id: 'preview-item-003',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    name: 'Milk 1L',
    sku: 'SKU003',
    barcode: '12345678903',
    category_id: 'preview-cat-dairy',
    stock: 45,
    reorder_level: 20,
    unit_price: 120,
    cost_price: 95,
    image_url: null,
    description: 'Fresh full cream milk',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-03-05').toISOString()
  },
  {
    id: 'preview-item-004',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    name: 'Rice 2kg',
    sku: 'SKU004',
    barcode: '12345678904',
    category_id: 'preview-cat-grains',
    stock: 120,
    reorder_level: 40,
    unit_price: 200,
    cost_price: 160,
    image_url: null,
    description: 'Premium basmati rice',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-03-05').toISOString()
  },
  {
    id: 'preview-item-005',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    name: 'Sugar 1kg',
    sku: 'SKU005',
    barcode: '12345678905',
    category_id: 'preview-cat-groceries',
    stock: 200,
    reorder_level: 60,
    unit_price: 135,
    cost_price: 110,
    image_url: null,
    description: 'White refined sugar',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-03-05').toISOString()
  }
];

/**
 * Mock categories for preview mode
 */
export const mockPreviewCategories = [
  {
    id: 'preview-cat-beverages',
    business_id: 'preview-business-001',
    name: 'Beverages',
    description: 'Soft drinks and beverages',
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'preview-cat-bakery',
    business_id: 'preview-business-001',
    name: 'Bakery',
    description: 'Bread and baked goods',
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'preview-cat-dairy',
    business_id: 'preview-business-001',
    name: 'Dairy',
    description: 'Milk and dairy products',
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'preview-cat-grains',
    business_id: 'preview-business-001',
    name: 'Grains',
    description: 'Rice, wheat, and grains',
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'preview-cat-groceries',
    business_id: 'preview-business-001',
    name: 'Groceries',
    description: 'General groceries',
    created_at: new Date('2024-01-01').toISOString()
  }
];

/**
 * Mock sales data for preview mode
 */
export const mockPreviewSales = [
  {
    id: 'preview-sale-001',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    user_id: 'preview-staff-002',
    total_amount: 340,
    tax_amount: 54.4,
    customer_name: 'Walk-in Customer',
    payment_method: 'Cash',
    items: [
      { id: 'preview-item-001', name: 'Coca Cola 500ml', quantity: 2, price: 50 },
      { id: 'preview-item-002', name: 'Bread 400g', quantity: 3, price: 55 },
      { id: 'preview-item-003', name: 'Milk 1L', quantity: 1, price: 120 }
    ],
    created_at: new Date('2024-03-05T10:30:00').toISOString()
  },
  {
    id: 'preview-sale-002',
    business_id: 'preview-business-001',
    branch_id: 'preview-branch-001',
    user_id: 'preview-staff-002',
    total_amount: 535,
    tax_amount: 85.6,
    customer_name: 'John Doe',
    payment_method: 'M-PESA',
    items: [
      { id: 'preview-item-004', name: 'Rice 2kg', quantity: 2, price: 200 },
      { id: 'preview-item-005', name: 'Sugar 1kg', quantity: 1, price: 135 }
    ],
    created_at: new Date('2024-03-05T11:15:00').toISOString()
  }
];

/**
 * Mock branches for preview mode
 */
export const mockPreviewBranches = [
  {
    id: 'preview-branch-001',
    business_id: 'preview-business-001',
    name: 'Main Branch',
    location: 'Nairobi CBD',
    is_active: true,
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'preview-branch-002',
    business_id: 'preview-business-001',
    name: 'Westlands Branch',
    location: 'Westlands, Nairobi',
    is_active: true,
    created_at: new Date('2024-02-01').toISOString()
  }
];

/**
 * Mock KPI data for preview mode
 */
export const mockPreviewKPIs = {
  todaySales: 45800,
  weeklySales: 285000,
  monthlySales: 1240000,
  totalCustomers: 142,
  lowStockItems: 3,
  totalRevenue: 1240000,
  totalProfit: 310000
};

/**
 * Mock authentication for preview mode
 */
export class PreviewModeAuth {
  static async login(email: string, password: string) {
    console.log('🎨 Preview Mode: Mock login', { email });
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      user: mockPreviewUser,
      business: mockPreviewBusiness
    };
  }

  static async logout() {
    console.log('🎨 Preview Mode: Mock logout');
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  }

  static async getSession() {
    console.log('🎨 Preview Mode: Mock getSession');
    return {
      user: mockPreviewUser,
      business: mockPreviewBusiness
    };
  }

  static async changePassword(newPassword: string) {
    console.log('🎨 Preview Mode: Mock change password');
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }

  static async createStaff(data: any) {
    console.log('🎨 Preview Mode: Mock create staff', data);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      credentials: {
        email: data.email,
        password: 'demo123'
      }
    };
  }

  static async getStaffMembers() {
    console.log('🎨 Preview Mode: Mock get staff');
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPreviewStaff;
  }

  static async updateStaff(userId: string, updates: any) {
    console.log('🎨 Preview Mode: Mock update staff', { userId, updates });
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }

  static async deleteStaff(userId: string) {
    console.log('🎨 Preview Mode: Mock delete staff', { userId });
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }
}

/**
 * Get mock data based on table name
 */
export function getMockData(table: string) {
  const mockDataMap: Record<string, any> = {
    profiles: [mockPreviewUser, ...mockPreviewStaff],
    businesses: [mockPreviewBusiness],
    inventory: mockPreviewInventory,
    categories: mockPreviewCategories,
    sales: mockPreviewSales,
    branches: mockPreviewBranches,
    kpis: mockPreviewKPIs
  };

  return mockDataMap[table] || [];
}
