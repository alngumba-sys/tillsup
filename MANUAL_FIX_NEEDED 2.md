# Manual Fix Required for Inventory.tsx

The file `/src/app/pages/Inventory.tsx` has become corrupted during automated edits.

## Problem
Lines 393-487 contain broken/orphaned code from test buttons that were being removed.

## Solution
Replace lines 390-398 with this corrected code:

```typescript
            {!formData.image && !isUploading && (
              <p className="text-xs text-muted-foreground">No image uploaded yet</p>
            )}
          </div>
        </div>
      </div>
```

Then DELETE everything from the old line 399 up to but not including the line that starts with:
```typescript
      <div className="grid grid-cols-2 gap-4">
```

This will properly close the image upload section and remove all the broken test button code.

## Expected Result
After line 392 `)}`, you should have:
- Line closing the `flex-1 space-y-2` div: `</div>`  
- Line closing the `flex items-start gap-4` div: `</div>`
- Line closing the `grid gap-2` div: `</div>`
- Empty line
- Start of the form fields section: `<div className="grid grid-cols-2 gap-4">`
