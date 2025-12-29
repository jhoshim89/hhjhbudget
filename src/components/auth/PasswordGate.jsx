/**
 * 간단한 비밀번호 인증 게이트
 * localStorage에 인증 상태 저장
 */

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'budget2025';

export default function PasswordGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 초기 인증 상태 확인
  useEffect(() => {
    const stored = localStorage.getItem('budget_auth');
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === PASSWORD) {
      localStorage.setItem('budget_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('비밀번호가 틀렸습니다');
      setPassword('');
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 인증 완료
  if (isAuthenticated) {
    return children;
  }

  // 비밀번호 입력 화면
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8 border border-white/[0.08]">
          {/* 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          {/* 타이틀 */}
          <h1 className="text-xl font-bold text-center text-white mb-2">
            가계부 대시보드
          </h1>
          <p className="text-sm text-zinc-500 text-center mb-6">
            비밀번호를 입력하세요
          </p>

          {/* 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoFocus
                className="w-full px-4 py-3 bg-zinc-900/50 border border-white/[0.08] rounded-xl
                         text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50
                         transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <p className="text-rose-400 text-sm text-center mb-4">{error}</p>
            )}

            {/* 버튼 */}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold
                       rounded-xl transition-colors"
            >
              확인
            </button>
          </form>
        </div>

        {/* 푸터 */}
        <p className="text-xs text-zinc-600 text-center mt-4">
          가족 전용 가계부
        </p>
      </div>
    </div>
  );
}
