import { useContext } from "react";
import { useInventory, InventoryContext } from "../contexts/InventoryContext";
import { useSales, SalesContext } from "../contexts/SalesContext";
import { useForecasting, ForecastingContext } from "../contexts/ForecastingContext";
import { useExpense, ExpenseContext } from "../contexts/ExpenseContext";
import { SchemaError } from "./inventory/SchemaError";

export function GlobalErrorHandler() {
  // We can safely call these hooks because GlobalErrorHandler is rendered inside Layout
  // which is wrapped by all these providers in App.tsx
  // Use useContext directly to avoid throwing if provider is missing (e.g. during initial render or redirect)
  const inventoryContext = useContext(InventoryContext);
  const salesContext = useContext(SalesContext);
  const forecastingContext = useContext(ForecastingContext);
  const expenseContext = useContext(ExpenseContext);

  const inventoryError = inventoryContext?.error;
  const salesError = salesContext?.error;
  const forecastingError = forecastingContext?.error;
  const expenseError = expenseContext?.error;

  // Collect all errors
  const errors = [inventoryError, salesError, forecastingError, expenseError].filter(Boolean);

  if (errors.length === 0) return null;

  // Deduplicate errors based on message to avoid showing same error multiple times
  const uniqueErrors = Array.from(new Set(errors.map(e => e.message))).map(msg => errors.find(e => e.message === msg));

  return (
    <div className="bg-background border-b border-border shadow-sm sticky top-0 z-50 flex flex-col">
      <div className="max-w-7xl mx-auto p-4 w-full space-y-4">
        {uniqueErrors.map((error, index) => (
          <SchemaError key={index} error={error} />
        ))}
      </div>
    </div>
  );
}
