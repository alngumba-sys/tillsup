import { memo } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface CustomerNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * CustomerNameInput Component
 * Memoized to prevent re-renders when parent components update
 * This ensures the input maintains focus while typing
 */
export const CustomerNameInput = memo(function CustomerNameInput({ 
  value, 
  onChange 
}: CustomerNameInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="customer-name" className="text-sm text-muted-foreground">
        Customer Name <span className="text-xs">(Optional)</span>
      </Label>
      <Input
        id="customer-name"
        type="text"
        placeholder="Enter customer name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
        autoComplete="off"
      />
    </div>
  );
});
