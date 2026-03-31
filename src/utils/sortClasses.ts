import { ClassInfo } from '../types';

/**
 * Sorts class names in the proper order:
 * 1. Non-numeric classes first (Nursery, LKG, UKG)
 * 2. Then numeric classes in numerical order (1, 2, 3, ..., 10, 11, 12)
 */
function sortClassNames(classNames: string[]): string[] {
  const nonNumericOrder = ['Nursery', 'LKG', 'UKG'];
  
  return [...classNames].sort((a, b) => {
    const aIsNumeric = !isNaN(Number(a));
    const bIsNumeric = !isNaN(Number(b));
    
    // If both are non-numeric, sort by predefined order
    if (!aIsNumeric && !bIsNumeric) {
      const aIndex = nonNumericOrder.indexOf(a);
      const bIndex = nonNumericOrder.indexOf(b);
      
      // If both are in the predefined order, sort by index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one is in predefined order, it comes first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither is in predefined order, sort alphabetically
      return a.localeCompare(b);
    }
    
    // If one is numeric and one is not, non-numeric comes first
    if (!aIsNumeric && bIsNumeric) return -1;
    if (aIsNumeric && !bIsNumeric) return 1;
    
    // If both are numeric, sort numerically
    return Number(a) - Number(b);
  });
}

/**
 * Sorts classes in the proper order:
 * 1. Non-numeric classes first (Nursery, LKG, UKG)
 * 2. Then numeric classes in numerical order (1, 2, 3, ..., 10, 11, 12)
 */
export function sortClasses(classes: ClassInfo[]): ClassInfo[] {
  return [...classes].sort((a, b) => {
    const aIsNumeric = !isNaN(Number(a.name));
    const bIsNumeric = !isNaN(Number(b.name));
    const nonNumericOrder = ['Nursery', 'LKG', 'UKG'];
    
    // If both are non-numeric, sort by predefined order
    if (!aIsNumeric && !bIsNumeric) {
      const aIndex = nonNumericOrder.indexOf(a.name);
      const bIndex = nonNumericOrder.indexOf(b.name);
      
      // If both are in the predefined order, sort by index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one is in predefined order, it comes first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither is in predefined order, sort alphabetically
      return a.name.localeCompare(b.name);
    }
    
    // If one is numeric and one is not, non-numeric comes first
    if (!aIsNumeric && bIsNumeric) return -1;
    if (aIsNumeric && !bIsNumeric) return 1;
    
    // If both are numeric, sort numerically
    return Number(a.name) - Number(b.name);
  });
}

/**
 * Sorts an array of class name strings in the proper order
 */
export function sortClassNamesArray(classNames: string[]): string[] {
  return sortClassNames(classNames);
}

