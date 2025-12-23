/**
 * @context budget-dashboard / components / layout / Sidebar.jsx
 * @purpose Left navigation sidebar with text-based menu tabs.
 * @role View switching and main navigation controller.
 * @dependencies lucide-react (icons), activeTab (string), onTabChange (function).
 */

import React from 'react';
import { LayoutDashboard, ClipboardList, TrendingUp, Calendar, PenTool, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  const menuItems = [
    { id: 'overview', label: '총괄', icon: LayoutDashboard },
    { id: 'status', label: '현황', icon: ClipboardList },
    { id: 'investment', label: '투자', icon: TrendingUp },
    { id: 'annual', label: '연간', icon: Calendar },
    { id: 'input', label: '입력', icon: PenTool },
  ];

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        onClick={() => {
            onTabChange(item.id);
            if (window.innerWidth < 768) onClose(); // Close on mobile selection
        }}
        className={clsx(
          "nav-item w-full flex items-center gap-3 px-4 py-3.5 rounded-lg font-bold transition-all duration-200 font-sans",
          isActive 
            ? "bg-blue-600 text-white" 
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        )}
      >
        <Icon size={22} />
        <span className="text-base tracking-tight">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={onClose}
        />
      )}
      
      {/* Sidebar Container */}
      <nav className={clsx(
        "bg-panel border-r border-border flex flex-col py-6 px-4 gap-2 h-full z-30 transition-transform duration-300 ease-in-out",
        "fixed md:relative w-64 inset-y-0 left-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="text-xs font-bold text-gray-500 px-4 mb-2 mt-2 tracking-widest uppercase font-mono">MENU</div>
        <div className="flex flex-col gap-1">
          {menuItems.map(item => <NavItem key={item.id} item={item} />)}
        </div>

        <div className="mt-auto">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg w-full font-bold text-red-400 hover:bg-red-900/20 transition-all text-sm font-sans">
            <Settings size={20} />
            <span>설정</span>
          </button>
        </div>
      </nav>
    </>
  );
}