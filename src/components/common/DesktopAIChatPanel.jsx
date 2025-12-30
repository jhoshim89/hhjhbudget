import React from 'react';
import { X } from 'lucide-react';
import AIChatPanel from '../realestate/AIChatPanel';

/**
 * Desktop fixed right panel for AI chat
 * - Slides in from right
 * - Does NOT overlay content (content area shrinks)
 */
export default function DesktopAIChatPanel({ isOpen, onClose, context, actionHandlers }) {
  if (!isOpen) return null;

  return (
    <div className="hidden md:flex flex-col w-[400px] h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/[0.06] animate-slide-in-right flex-shrink-0">
      {/* Header with close button */}
      <div className="flex items-center justify-end p-2 border-b border-zinc-200 dark:border-white/[0.06]">
        <button
          onClick={onClose}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 overflow-hidden">
        <AIChatPanel context={context} actionHandlers={actionHandlers} isDesktopPanel />
      </div>
    </div>
  );
}
