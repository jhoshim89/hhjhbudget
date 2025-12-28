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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-white/[0.06] z-50 safe-area-bottom">
      <div className="flex w-full max-w-md mx-auto h-16 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 transition-all duration-200",
                isActive
                  ? "text-blue-400"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <div className={clsx(
                "p-1.5 rounded-xl transition-all",
                isActive && "bg-blue-500/15"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={clsx(
                "text-[10px] font-semibold truncate",
                isActive ? "text-blue-400" : "text-foreground-muted"
              )}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
