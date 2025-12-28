/**
 * @context budget-dashboard / components / layout / Sidebar.jsx
 * @purpose Left navigation sidebar with text-based menu tabs.
 * @role View switching and main navigation controller.
 * @dependencies lucide-react (icons), activeTab (string), onTabChange (function).
 */

import React from 'react';
import { LayoutDashboard, ClipboardList, TrendingUp, Calendar, PenTool, Eye, Home, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  const menuItems = [
    { id: 'overview', label: '총괄', icon: LayoutDashboard },
    { id: 'status', label: '현황', icon: ClipboardList },
    { id: 'investment', label: '투자', icon: TrendingUp },
    { id: 'watchlist', label: '관심', icon: Eye },
    { id: 'realestate', label: '부동산', icon: Home },
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
            if (window.innerWidth < 768) onClose();
        }}
        className={clsx(
          "nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200",
          isActive
            ? "bg-blue-500/15 text-blue-400 border-l-2 border-l-blue-400"
            : "text-foreground-muted hover:bg-white/[0.03] hover:text-foreground"
        )}
      >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-sm tracking-tight">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <nav className={clsx(
        "bg-surface/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col py-5 px-3 gap-1 h-full z-30 transition-transform duration-300 ease-in-out overflow-y-auto",
        "fixed md:relative w-60 inset-y-0 left-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="text-[10px] font-semibold text-foreground-muted px-4 mb-2 tracking-widest uppercase">Menu</div>
        <div className="flex flex-col gap-1 shrink-0">
          {menuItems.map(item => <NavItem key={item.id} item={item} />)}
        </div>

        <div className="mt-auto shrink-0 pt-4 border-t border-white/[0.06]">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full font-semibold text-foreground-muted hover:bg-white/[0.03] hover:text-foreground transition-all text-sm">
            <Settings size={18} />
            <span>설정</span>
          </button>
        </div>
      </nav>
    </>
  );
}
