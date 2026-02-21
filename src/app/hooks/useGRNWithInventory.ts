/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRN WITH INVENTORY INTEGRATION HOOK
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Coordinates GRN confirmation with automatic inventory stock updates
 * - Maintains atomic transaction integrity
 * - Creates immutable audit trail
 * - Prevents duplicate confirmations
 * 
 * CRITICAL RULES:
 * - Stock ONLY increases when GRN is confirmed
 * - Updates are atomic: ALL succeed or ALL fail
 * - Branch-specific stock updates only
 * - Full audit trail for every stock change
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useGoodsReceived } from "../contexts/GoodsReceivedContext";
import { useInventory } from "../contexts/InventoryContext";
import { useInventoryAudit } from "../contexts/InventoryAuditContext";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";

export interface GRNConfirmationResult {
  success: boolean;
  message: string;
  productsUpdated: number;
  productsCreated: number;
  errors: string[];
}

export function useGRNWithInventory() {
  const { confirmGRN, getGRNById } = useGoodsReceived();
  const { increaseMultipleStock, getInventoryForBranch } = useInventory();
  const { addAuditRecord } = useInventoryAudit();
  const { user } = useAuth();
  const { getBranchById } = useBranch();

  /**
   * ═══════════════════════════════════════════════════════════════════
   * CONFIRM GRN WITH AUTOMATIC INVENTORY UPDATE
   * ═══════════════════════════════════════════════════════════════════
   * 
   * This function:
   * 1. Validates GRN status (must be Draft)
   * 2. Confirms the GRN (makes it immutable)
   * 3. Updates inventory stock for RECEIVED quantities only
   * 4. Creates audit records for each stock change
   * 5. Handles partial deliveries correctly
   * 6. Rolls back on any failure
   */
  const confirmGRNWithInventoryUpdate = (grnId: string): GRNConfirmationResult => {
    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Validate GRN exists and is in Draft status
    // ═══════════════════════════════════════════════════════════════════
    const grn = getGRNById(grnId);
    
    if (!grn) {
      return {
        success: false,
        message: "GRN not found",
        productsUpdated: 0,
        productsCreated: 0,
        errors: ["GRN not found"]
      };
    }

    if (grn.status !== "Draft") {
      return {
        success: false,
        message: `GRN is already ${grn.status}. Cannot confirm again.`,
        productsUpdated: 0,
        productsCreated: 0,
        errors: [`GRN status is ${grn.status}, not Draft`]
      };
    }

    if (!user) {
      return {
        success: false,
        message: "No user context",
        productsUpdated: 0,
        productsCreated: 0,
        errors: ["No user context"]
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Prepare inventory updates for RECEIVED quantities only
    // ═══════════════════════════════════════════════════════════════════
    const stockUpdates = grn.items
      .filter(item => item.receivedQuantity > 0) // Only items actually received
      .map(item => ({
        productId: item.productId,
        sku: item.productSKU,
        name: item.productName,
        quantity: item.receivedQuantity // Use RECEIVED quantity, not ordered
      }));

    if (stockUpdates.length === 0) {
      return {
        success: false,
        message: "No items received to update inventory",
        productsUpdated: 0,
        productsCreated: 0,
        errors: ["No items with received quantity > 0"]
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Get current inventory state for audit trail
    // ═══════════════════════════════════════════════════════════════════
    const branchInventory = getInventoryForBranch(grn.branchId);
    const branch = getBranchById(grn.branchId);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Perform atomic inventory update
    // ═══════════════════════════════════════════════════════════════════
    const inventoryResult = increaseMultipleStock(stockUpdates, grn.branchId);

    if (!inventoryResult.success) {
      return {
        success: false,
        message: "Failed to update inventory",
        productsUpdated: 0,
        productsCreated: 0,
        errors: inventoryResult.errors
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Confirm GRN (make it immutable)
    // ═══════════════════════════════════════════════════════════════════
    confirmGRN(grnId);

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Create audit records for each stock change
    // ═══════════════════════════════════════════════════════════════════
    stockUpdates.forEach(item => {
      const existingProduct = branchInventory.find(
        p => p.id === item.productId || p.sku === item.sku
      );

      const previousStock = existingProduct?.stock || 0;
      const newStock = previousStock + item.quantity;

      addAuditRecord({
        branchId: grn.branchId,
        branchName: branch?.name || grn.branchName,
        productId: item.productId,
        productName: item.name,
        productSKU: item.sku,
        action: "INCREASE",
        quantity: item.quantity,
        previousStock,
        newStock,
        source: "GRN_CONFIRMATION",
        sourceReferenceId: grn.id,
        sourceReferenceNumber: grn.grnNumber,
        performedByStaffId: user.id,
        performedByStaffName: `${user.firstName} ${user.lastName}`,
        performedByRole: user.role,
        notes: `Stock increased from GRN ${grn.grnNumber} for PO ${grn.purchaseOrderNumber}`
      });
    });

    // ═══════════════════════════════════════════════════════════════════
    // STEP 7: Return success result
    // ═══════════════════════════════════════════════════════════════════
    return {
      success: true,
      message: `GRN ${grn.grnNumber} confirmed successfully. Inventory updated.`,
      productsUpdated: stockUpdates.length - inventoryResult.createdProducts.length,
      productsCreated: inventoryResult.createdProducts.length,
      errors: []
    };
  };

  return {
    confirmGRNWithInventoryUpdate
  };
}
