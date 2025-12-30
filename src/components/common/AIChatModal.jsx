import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import AIChatPanel from '../realestate/AIChatPanel';

/**
 * AI 재무 상담 모달
 * - 모바일: 전체 화면
 * - 데스크톱: 우측 사이드 패널 (mobileOnly=false 시)
 * @param {boolean} mobileOnly - true면 모바일에서만 렌더링
 */
export default function AIChatModal({ isOpen, onClose, context, actionHandlers = {}, mobileOnly = false }) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // mobileOnly가 true면 모바일에서만 렌더링
  const containerClass = mobileOnly
    ? "fixed inset-0 z-50 flex items-end md:hidden"
    : "fixed inset-0 z-50 flex items-end md:items-center md:justify-end";

  return (
    <div className={containerClass}>
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="relative w-full h-[85vh] md:w-[420px] md:h-full md:max-h-screen bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-none shadow-2xl animate-slide-up md:animate-slide-left overflow-hidden">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        {/* 모바일 드래그 핸들 */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* AI 채팅 패널 */}
        <div className="h-full pt-2 md:pt-0">
          <AIChatPanel context={context} actionHandlers={actionHandlers} />
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slide-left {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-slide-left {
          animation: slide-left 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
