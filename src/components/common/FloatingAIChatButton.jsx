import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * 플로팅 AI 챗봇 버튼
 */
export default function FloatingAIChatButton({ onClick, hasUnread = false }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 rounded-full shadow-lg shadow-violet-500/25 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group"
      aria-label="AI 재무 상담"
    >
      <MessageSquare size={24} className="text-white group-hover:scale-110 transition-transform" />

      {/* 알림 뱃지 (옵션) */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        </span>
      )}

      {/* 펄스 애니메이션 */}
      <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-20" />
    </button>
  );
}
