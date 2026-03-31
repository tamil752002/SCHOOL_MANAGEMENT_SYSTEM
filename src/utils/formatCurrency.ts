/**
 * Formats a number as currency with appropriate suffix (K for thousands, L for lakhs)
 * - Up to 999: Shows actual number (₹500, ₹999)
 * - 1000 to 99999: Shows with K (₹1.5K, ₹99.9K)
 * - 100000 and above: Shows with L (₹1.5L, ₹10L)
 */
export function formatCurrency(amount: number): string {
  if (amount < 1000) {
    return `₹${amount.toLocaleString()}`;
  } else if (amount < 100000) {
    // Thousands: show with K
    const thousands = amount / 1000;
    // Show 1 decimal place if needed, otherwise whole number
    if (thousands % 1 === 0) {
      return `₹${thousands}K`;
    } else {
      return `₹${thousands.toFixed(1)}K`;
    }
  } else {
    // Lakhs: show with L
    const lakhs = amount / 100000;
    // Show 1 decimal place if needed, otherwise whole number
    if (lakhs % 1 === 0) {
      return `₹${lakhs}L`;
    } else {
      return `₹${lakhs.toFixed(1)}L`;
    }
  }
}

