import { useState, useCallback } from 'react';
import { chatWithSolar } from '../services/solarApi';

/**
 * Solar Pro AI 채팅 훅
 * @param {Object} context - 부동산 데이터 컨텍스트
 */
export function useSolarChat(context = null) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    // 사용자 메시지 추가
    const userMessage = { role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      // 이전 메시지들 (API 형식으로 변환)
      const apiMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      // 새 사용자 메시지 추가
      apiMessages.push({ role: 'user', content });

      // Solar API 호출
      const response = await chatWithSolar(apiMessages, context);

      if (response.success) {
        // AI 응답 추가
        const assistantMessage = {
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'AI 응답 실패');
      }
    } catch (err) {
      setError(err.message);
      // 에러 메시지 추가
      const errorMessage = {
        role: 'assistant',
        content: '죄송합니다. 응답을 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [messages, context]);

  /**
   * 대화 초기화
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * 빠른 질문 템플릿
   */
  const quickQuestions = [
    '내 대출 상환 계획을 분석해줘',
    '순자산을 늘리려면 어떻게 해야 해?',
    '현재 부동산 자산 현황을 요약해줘',
    '대출 금리가 1% 오르면 어떻게 돼?',
    '전세 vs 월세, 어떤 게 유리해?',
  ];

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
    quickQuestions,
  };
}

export default useSolarChat;
