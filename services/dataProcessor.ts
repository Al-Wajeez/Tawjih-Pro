import { ConsolidatedStudent, FilterRule, SortRule, GroupRule } from "../types";

// Helper to access nested properties safely (e.g., 'guidance.scienceScore')
export const getNestedValue = (obj: any, path: string): any => {
  // Handle composite semester keys (Calculated on the fly for sorting/filtering)
  if (path.startsWith('s1_s2.')) {
    const subject = path.split('.')[1];
    const v1 = obj.s1?.[subject] || 0;
    const v2 = obj.s2?.[subject] || 0;
    return (v1 + v2) / 2;
  }
  
  if (path.startsWith('s1_s2_s3.')) {
    const subject = path.split('.')[1];
    const v1 = obj.s1?.[subject] || 0;
    const v2 = obj.s2?.[subject] || 0;
    const v3 = obj.s3?.[subject] || 0;
    return (v1 + v2 + v3) / 3;
  }

  // Normal path resolution
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
};

export const processData = (
  data: ConsolidatedStudent[],
  filterRules: FilterRule[],
  sortRules: SortRule[],
  groupRule: GroupRule
): { processed: ConsolidatedStudent[], grouped: Record<string, ConsolidatedStudent[]> | null } => {
  
  let result = [...data];

  // 1. Filtering
  result = result.filter(item => {
    return filterRules.every(rule => {
      if (rule.operator === 'top10') return true; // Handled later

      const rawValue = getNestedValue(item, rule.field);
      const ruleValue = rule.value;

      // Handle null/undefined values in data
      if (rawValue === undefined || rawValue === null) return false;

      switch (rule.operator) {
        case 'equals':
            return String(rawValue).toLowerCase() === String(ruleValue).toLowerCase();
        case 'contains':
            return String(rawValue).toLowerCase().includes(String(ruleValue).toLowerCase());
        case 'startsWith':
            return String(rawValue).toLowerCase().startsWith(String(ruleValue).toLowerCase());
        case 'endsWith':
            return String(rawValue).toLowerCase().endsWith(String(ruleValue).toLowerCase());
        case 'greaterThan':
            return Number(rawValue) > Number(ruleValue);
        case 'lessThan':
            return Number(rawValue) < Number(ruleValue);
        case 'between':
            return Number(rawValue) >= Number(ruleValue) && Number(rawValue) <= Number(rule.value2);
        default:
            return true;
      }
    });
  });

  // 2. Sorting
  if (sortRules.length > 0) {
    result.sort((a, b) => {
      for (const rule of sortRules) {
        const valA = getNestedValue(a, rule.field);
        const valB = getNestedValue(b, rule.field);

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA || '').localeCompare(String(valB || ''), 'ar');
        }

        if (comparison !== 0) {
          return rule.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  // 3. Handle Special Filters like "Top 10"
  const top10Rule = filterRules.find(r => r.operator === 'top10');
  if (top10Rule) {
      result.sort((a, b) => {
          const valA = Number(getNestedValue(a, top10Rule.field)) || 0;
          const valB = Number(getNestedValue(b, top10Rule.field)) || 0;
          return valB - valA;
      });
      result = result.slice(0, 10);
  }

  // 4. Grouping
  let grouped: Record<string, ConsolidatedStudent[]> | null = null;
  if (groupRule.field) {
    grouped = {};
    result.forEach(item => {
      let key = getNestedValue(item, groupRule.field!);
      if (key === undefined || key === null || key === '') key = 'غير محدد';
      if (key === true) key = 'نعم';
      if (key === false) key = 'لا';
      
      const groupKey = String(key);
      if (!grouped![groupKey]) grouped![groupKey] = [];
      grouped![groupKey].push(item);
    });
  }

  return { processed: result, grouped };
};