import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { useSolarChat } from '../../hooks/useSolarChat';

/**
 * AI 상담 패널
 */
export default function AIChatPanel({ context }) {
  const { messages, loading, sendMessage, clearMessages, quickQuestions } = useSolarChat(context);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleQuickQuestion = async (question) => {
    if (loading) return;
    await sendMessage(question);
  };

  return (
    <div className="flex flex-col h-[600px] bg-zinc-900/50 rounded-2xl border border-white/[0.08] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI 부동산 상담</h3>
            <p className="text-[10px] text-zinc-500">Solar Pro · 내 데이터 기반 분석</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="대화 초기화"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
              <Bot size={32} className="text-violet-400" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">무엇이든 물어보세요</h4>
            <p className="text-sm text-zinc-500 mb-6 max-w-xs">
              부동산 시세, 대출 상환 계획, 투자 전략 등 AI가 분석해드립니다.
            </p>

            {/* 빠른 질문 */}
            <div className="flex flex-wrap justify-center gap-2">
              {quickQuestions.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q)}
                  className="px-3 py-1.5 text-xs text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-teal-500/20'
                    : 'bg-gradient-to-br from-violet-500/20 to-purple-600/20'
                }`}>
                  {msg.role === 'user' ? (
                    <User size={14} className="text-teal-400" />
                  ) : (
                    <Bot size={14} className="text-violet-400" />
                  )}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-teal-500/20 text-white rounded-tr-md'
                      : msg.isError
                        ? 'bg-rose-500/10 text-rose-400 rounded-tl-md'
                        : 'bg-zinc-800/80 text-zinc-200 rounded-tl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* 로딩 인디케이터 */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                  <Bot size={14} className="text-violet-400" />
                </div>
                <div className="px-4 py-2.5 bg-zinc-800/80 rounded-2xl rounded-tl-md">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="text-violet-400 animate-spin" />
                    <span className="text-sm text-zinc-400">생각 중...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-white/[0.06]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요..."
            className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-colors"
          >
            <Send size={18} />
          </button>
        </form>

        {/* 추가 빠른 질문 */}
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {quickQuestions.slice(3).map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuickQuestion(q)}
                disabled={loading}
                className="px-2.5 py-1 text-[10px] text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-full transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
