/**
 * Demo Sales Data Seeder
 * 
 * This utility generates realistic sales data for testing the reporting system.
 * Use this to populate the SalesContext with historical data without manually
 * completing dozens of transactions.
 * 
 * Usage:
 * 1. Import this function in any component
 * 2. Call seedDemoSales(recordSale, inventory, addSaleDirectly, user, business)
 * 3. Check Reports page to see populated analytics
 */

import { Sale } from "../contexts/SalesContext";
import { User, Business } from "../contexts/AuthContext";

export function seedDemoSales(
  recordSale: (sale: Omit<Sale, "id" | "timestamp">) => void,
  inventory: Array<{ id: string; name: string; price: number; category: string }>,
  addSaleDirectly?: (sale: Sale) => void,
  user?: User | null,
  business?: Business | null
) {
  if (inventory.length === 0) {
    console.warn("Cannot seed sales: No products in inventory");
    return;
  }

  if (!user || !business) {
    console.warn("Cannot seed sales: User or business not authenticated");
    return;
  }

  const now = new Date();
  const roles = ["Cashier", "Manager", "Business Owner"];
  const staffNames = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Williams", "Charlie Brown"];
  let totalSeeded = 0;

  // Generate sales for the last 7 days
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const baseDate = new Date(now);
    baseDate.setDate(now.getDate() - daysAgo);

    // Generate 5-15 sales per day
    const salesCount = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < salesCount; i++) {
      const saleDate = new Date(baseDate);
      // Random time during business hours (9 AM - 9 PM)
      const hour = Math.floor(Math.random() * 12) + 9;
      const minute = Math.floor(Math.random() * 60);
      saleDate.setHours(hour, minute, 0, 0);

      // Generate 1-5 items per sale
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = inventory[Math.floor(Math.random() * inventory.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const totalPrice = product.price * quantity;

        items.push({
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice: product.price,
          totalPrice,
        });

        subtotal += totalPrice;
      }

      const tax = subtotal * 0.16;
      const total = subtotal + tax;

      // Randomly assign sales to current user or generate mock staff for variety
      // 50% chance the current user made the sale, 50% chance it was another staff member
      const isCurrentUserSale = Math.random() > 0.5;
      const randomRole = roles[Math.floor(Math.random() * roles.length)];
      const randomName = staffNames[Math.floor(Math.random() * staffNames.length)];
      
      const staffId = isCurrentUserSale ? user.id : `staff-${Math.random().toString(36).substr(2, 9)}`;
      const staffRole = isCurrentUserSale ? user.role : randomRole;
      const staffName = isCurrentUserSale ? `${user.firstName} ${user.lastName}` : randomName;

      // For historical data, we need to create the sale with custom timestamp
      const saleId = `SALE-${saleDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const completeSale: Sale = {
        id: saleId,
        timestamp: saleDate,
        items,
        subtotal,
        tax,
        total,
        customerCount: 1,
        businessId: business.id,
        staffId: staffId,
        staffRole: staffRole,
        staffName: staffName,
      };

      if (addSaleDirectly) {
        addSaleDirectly(completeSale);
      } else {
        recordSale({
          items,
          subtotal,
          tax,
          total,
          customerCount: 1,
          businessId: business.id,
          staffId: staffId,
          staffRole: staffRole,
          staffName: staffName,
        });
      }
      
      totalSeeded++;
    }
  }

  console.log(`✅ Seeded ${totalSeeded} demo sales across 7 days for ${business.name}`);
  console.log(`📊 Sales attributed to ${user.firstName} ${user.lastName} and other staff members`);
}

/**
 * Usage Example:
 * 
 * import { seedDemoSales } from '../utils/seedDemoSales';
 * import { useSales } from '../contexts/SalesContext';
 * import { useInventory } from '../contexts/InventoryContext';
 * import { useAuth } from '../contexts/AuthContext';
 * 
 * function Dashboard() {
 *   const { recordSale } = useSales();
 *   const { inventory } = useInventory();
 *   const { user, business } = useAuth();
 * 
 *   const handleSeedData = () => {
 *     seedDemoSales(recordSale, inventory, undefined, user, business);
 *   };
 * 
 *   return (
 *     <Button onClick={handleSeedData}>
 *       Seed Demo Sales Data
 *     </Button>
 *   );
 * }
 */