import React from 'react';
import { LayoutDashboard, ClipboardList, TrendingUp, Calendar, PenTool } from 'lucide-react';
import { clsx } from 'clsx';

export default function MobileNav({ activeTab, onTabChange }) {
  const menuItems = [
    { id: 'overview', label: '총괄', icon: LayoutDashboard },
    { id: 'status', label: '현황', icon: ClipboardList },
    { id: 'investment', label: '투자', icon: TrendingUp },
    { id: 'annual', label: '연간', icon: Calendar },
    { id: 'input', label: '입력', icon: PenTool },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-blue-500"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={clsx(
                "text-[10px] font-bold",
                isActive ? "text-blue-400" : "text-slate-500"
              )}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
