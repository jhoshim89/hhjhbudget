/**
 * @context budget-dashboard / utils / formatters.js
 * @purpose Utility functions for currency formatting and data calculation.
 * @role Data formatting anchor for the entire application.
 * @dependencies None
 */

export const formatKRW = (v) => {
  if (v === null || v === undefined) return '0';
  if (v >= 100000000) return (v / 100000000).toFixed(1) + '억';
  if (v >= 10000) return (v / 10000).toFixed(0) + '만';
  return v.toLocaleString();
};

export const formatFull = (v) => new Intl.NumberFormat('ko-KR').format(v || 0) + '원';

export const calcChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous * 100).toFixed(1);
};