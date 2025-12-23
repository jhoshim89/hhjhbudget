/**
 * @context budget-dashboard / components / layout / DashboardLayout.jsx
 * @purpose Main container component that defines the global grid and styling.
 * @role Root layout wrapper for all dashboard views.
 * @dependencies React, Tailwind CSS classes.
 */

import React from 'react';

export default function DashboardLayout({ children }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-slate-200 font-sans">
      {children}
    </div>
  );
}