/**
 * @context budget-dashboard / components / layout / Sidebar.jsx
 * @purpose Left navigation sidebar with text-based menu tabs.
 * @role View switching and main navigation controller.
 * @dependencies lucide-react (icons), activeTab (string), onTabChange (function).
 */

import React from 'react';
import { LayoutDashboard, PieChart, ArrowLeftRight, Keyboard, TrendingUp, FileText, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar({ activeTab, onTabChange }) {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'portfolio', label: '포트폴리오', icon: PieChart },
    { id: 'transactions', label: '입출금 내역', icon: ArrowLeftRight },
    { id: 'input', label: '데이터 입력', icon: Keyboard },
  ];

  const analysisItems = [
    { id: 'analysis', label: '수익률 분석', icon: TrendingUp },
    { id: 'report', label: '월간 리포트', icon: FileText },
  ];

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        onClick={() => onTabChange(item.id)}
        className={clsx(
          "flex items-center gap-3 px-4 py-3 rounded-lg w-full font-semibold transition-all duration-200",
          isActive 
            ? "bg-blue-600 text-white" 
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        )}
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="w-64 border-r border-border bg-panel flex flex-col py-6 px-4 gap-2 shrink-0 h-full">
      <div className="text-xs font-bold text-gray-500 px-4 mb-2 mt-2">MENU</div>
      {menuItems.map(item => <NavItem key={item.id} item={item} />)}

      <div className="text-xs font-bold text-gray-500 px-4 mb-2 mt-6">ANALYSIS</div>
      {analysisItems.map(item => <NavItem key={item.id} item={item} />)}

      <div className="mt-auto">
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg w-full font-semibold text-red-400 hover:bg-red-900/20 transition-all">
          <Settings size={20} />
          <span>설정</span>
        </button>
      </div>
    </nav>
  );
}