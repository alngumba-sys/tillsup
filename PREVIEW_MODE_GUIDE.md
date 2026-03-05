# 🎨 Tillsup Preview Mode Guide

## Overview

Tillsup now has full **Preview Mode** support for Figma Make, allowing the app to function perfectly with mock data when Supabase network requests are blocked.

## What is Preview Mode?

Preview Mode automatically detects when Tillsup is running in Figma Make's preview environment and switches to using mock/demo data instead of making real Supabase API calls. This allows you to:

- ✅ **View the complete UI** in Figma Make preview
- ✅ **Test all features** with realistic demo data
- ✅ **No network errors** or blocking banners
- ✅ **Seamless experience** for design reviews and demos

## How It Works

### Automatic Detection

Preview Mode is automatically activated when any of these conditions are met:

1. Running inside an iframe (Figma Make preview)
2. URL contains `figma.com`, `fig.run`, or `figma-make`
3. URL has `?preview` parameter
4. Local storage flag `figma-preview-mode` is set to `'true'`

### Mock Data Includes

- **User Authentication**: Demo user account (demo@tillsup.com)
- **Business Data**: Sample business "Tillsup Demo Store"
- **Staff Members**: 3 mock staff with different roles
- **Inventory**: 5 sample products across different categories
- **Categories**: 5 product categories
- **Sales Data**: Sample transactions
- **Branches**: 2 demo branches
- **KPIs**: Realistic business metrics

## Features in Preview Mode

### ✅ Fully Functional
- User login (any email/password works)
- Dashboard with KPIs and charts
- Inventory viewing and management
- Staff management
- All UI navigation
- Reports and analytics views

### 🎯 Mock Operations
All database operations work but use in-memory mock data:
- Adding products
- Creating staff
- Recording sales
- Updating settings

### 🚫 Hidden in Preview
These UI elements are automatically hidden:
- RLS Error Banner
- Connection Error warnings
- Network timeout messages
- Supabase diagnostic alerts

## User Experience

### Visual Indicators

1. **Login Page**: Blue info banner indicating preview mode
2. **Dashboard**: Alert showing preview mode is active
3. **Top Navbar**: "Preview Mode" badge next to logo

### Login in Preview Mode

When in preview mode, users can log in with ANY credentials:
- Email: Any email (e.g., `demo@tillsup.com`)
- Password: Any password
- System will log you in as the demo user with full business data

## For Developers

### Manual Activation

You can manually enable/disable preview mode for testing:

```javascript
// Enable preview mode
localStorage.setItem('figma-preview-mode', 'true');
window.location.reload();

// Disable preview mode
localStorage.removeItem('figma-preview-mode');
window.location.reload();
```

Or use the helper functions:

```typescript
import { enablePreviewMode, disablePreviewMode } from './src/app/utils/previewMode';

enablePreviewMode();  // Then reload
disablePreviewMode(); // Then reload
```

### Adding Preview Support to New Features

When adding new features that use Supabase, wrap database calls with preview mode checks:

```typescript
import { isPreviewMode } from '../utils/previewMode';

async function fetchData() {
  // Check for preview mode
  if (isPreviewMode()) {
    console.log('🎨 Preview Mode: Using mock data');
    return mockData;
  }
  
  // Normal Supabase call
  const { data } = await supabase.from('table').select();
  return data;
}
```

### Mock Data Structure

All mock data is defined in `/src/app/utils/previewMode.ts`:

- `mockPreviewUser` - Demo user account
- `mockPreviewBusiness` - Demo business
- `mockPreviewStaff` - Array of staff members
- `mockPreviewInventory` - Product inventory
- `mockPreviewCategories` - Product categories
- `mockPreviewSales` - Sample sales
- `mockPreviewBranches` - Branch locations

## Implementation Details

### Files Modified

1. **Core Utilities**
   - `/src/app/utils/previewMode.ts` - Preview detection and mock data
   - `/src/app/utils/supabaseWrapper.ts` - Mock Supabase client

2. **Authentication**
   - `/src/app/contexts/AuthContext.tsx` - Preview mode auth handling
   - `/src/app/pages/Login.tsx` - Preview mode UI

3. **Data Contexts**
   - `/src/app/contexts/InventoryContext.tsx` - Mock inventory operations

4. **UI Components**
   - `/src/app/components/RLSErrorBanner.tsx` - Hidden in preview
   - `/src/app/components/ConnectionChecker.tsx` - Hidden in preview
   - `/src/app/components/TopNavbar.tsx` - Preview badge
   - `/src/app/pages/Dashboard.tsx` - Preview alert

### Key Functions

- `isPreviewMode()` - Returns `true` if in preview mode
- `mockPreviewUser` - Demo user object
- `mockPreviewBusiness` - Demo business object
- `PreviewModeAuth` - Mock authentication class
- `getMockData(table)` - Get mock data for any table

## Testing Preview Mode Locally

1. **Using URL Parameter**:
   ```
   http://localhost:5173?preview
   ```

2. **Using Local Storage**:
   ```javascript
   localStorage.setItem('figma-preview-mode', 'true');
   ```
   Then reload the page.

3. **In Figma Make**:
   Preview mode activates automatically when running in Figma Make.

## Production vs Preview

| Feature | Preview Mode | Production |
|---------|-------------|------------|
| Authentication | Mock (any credentials) | Real Supabase Auth |
| Database | Mock data in memory | Real Supabase database |
| Real-time Updates | Simulated | Supabase realtime |
| File Uploads | Simulated | Supabase Storage |
| Data Persistence | Session only | Permanent |
| Network Calls | None (all mocked) | Real API calls |

## Benefits

1. **For Design Reviews**: Stakeholders can interact with full UI without backend setup
2. **For Demos**: Sales and product demos work seamlessly
3. **For Development**: Test UI without database dependencies
4. **For Figma Make**: Perfect preview experience without network blocks

## Troubleshooting

### Preview Mode Not Activating

1. Check console for: `🎨 Figma Make Preview Mode Detected`
2. Verify URL or localStorage flag is set
3. Clear browser cache and reload

### Still Seeing Network Errors

If you see network errors in preview mode:
1. Check that `isPreviewMode()` is being called in all Supabase operations
2. Verify the import is correct: `import { isPreviewMode } from '../utils/previewMode'`
3. Check browser console for preview mode logs

### Mock Data Not Showing

1. Ensure `refreshInventory()` and similar functions check `isPreviewMode()`
2. Verify mock data is properly exported from `previewMode.ts`
3. Check that components are re-rendering after mock data is set

## Future Enhancements

Potential improvements for preview mode:

- [ ] Configurable mock data via UI
- [ ] Export/import custom mock datasets
- [ ] Preview mode settings panel
- [ ] Simulated network delays
- [ ] More realistic mock data generation
- [ ] Preview mode analytics

## Summary

Preview Mode provides a complete, functional demo experience of Tillsup without any backend dependencies. It's perfect for:

- Figma Make previews
- Client demos
- Design reviews
- UI development
- Testing without database

The system seamlessly switches between mock and real data based on the environment, providing a smooth experience in all scenarios.
