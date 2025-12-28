/**
 * @context budget-dashboard / components / common / Toast.jsx
 * @purpose 토스트 알림 컴포넌트
 * @role 성공/에러/정보 메시지를 일시적으로 표시
 */

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const TOAST_STYLES = {
  success: 'bg-green-500/20 border-green-500/40 text-green-400',
  error: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
  info: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
};

export default function Toast({
  type = 'info',
  message,
  onClose,
  duration = 3000,
  position = 'bottom-right'
}) {
  const Icon = TOAST_ICONS[type];
  const styleClass = TOAST_STYLES[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const positionClass = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }[position];

  return (
    <div
      className={`fixed ${positionClass} z-50 animate-slide-up`}
      role="alert"
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${styleClass}`}>
        <Icon size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
