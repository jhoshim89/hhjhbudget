import { useState, useCallback } from 'react';
import { chatWithSolar } from '../services/solarApi';

/**
 * AI 응답에서 액션 JSON 파싱
 */
function parseAction(content) {
  const actionMatch = content.match(/```action\s*([\s\S]*?)```/);
  if (!actionMatch) return null;

  try {
    const actionJson = actionMatch[1].trim();
    return JSON.parse(actionJson);
  } catch (e) {
    console.error('Failed to parse action JSON:', e);
    return null;
  }
}

/**
 * 액션 JSON 블록을 제거한 클린 메시지 반환
 */
function cleanMessage(content) {
  return content.replace(/```action\s*[\s\S]*?```/g, '').trim();
}

/**
 * Solar Pro AI 채팅 훅
 * @param {Object} context - 전체 재무 데이터 컨텍스트
 * @param {Object} actionHandlers - 액션 핸들러 객체
 */
export function useSolarChat(context = null, actionHandlers = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 액션 실행
   */
  const executeAction = useCallback(async (action) => {
    if (!action || !action.type) return null;

    const { type, params } = action;
    const handler = actionHandlers[type];

    if (!handler) {
      console.warn(`No handler for action type: ${type}`);
      return { success: false, message: `지원하지 않는 액션입니다: ${type}` };
    }

    try {
      await handler(params);
      return { success: true, message: getSuccessMessage(type, params) };
    } catch (err) {
      console.error(`Action ${type} failed:`, err);
      return { success: false, message: `실패: ${err.message}` };
    }
  }, [actionHandlers]);

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
      // 이전 메시지들 (API 형식으로 변환, 액션 결과 제외)
      const apiMessages = messages
        .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.isActionResult)
        .map(m => ({ role: m.role, content: m.content }));

      // 새 사용자 메시지 추가
      apiMessages.push({ role: 'user', content });

      // Solar API 호출
      const response = await chatWithSolar(apiMessages, context);

      if (response.success) {
        // 액션 파싱
        const action = parseAction(response.content);
        const cleanContent = cleanMessage(response.content);

        // AI 응답 추가
        const assistantMessage = {
          role: 'assistant',
          content: cleanContent,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // 액션이 있으면 실행
        if (action) {
          const result = await executeAction(action);
          if (result) {
            const actionResultMessage = {
              role: 'assistant',
              content: result.success
                ? `✅ ${result.message}`
                : `❌ ${result.message}`,
              timestamp: Date.now(),
              isActionResult: true,
              isError: !result.success,
            };
            setMessages(prev => [...prev, actionResultMessage]);
          }
        }
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
  }, [messages, context, executeAction]);

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
    '이번 달 재무 상태를 분석해줘',
    '지출을 줄일 방법이 있을까?',
    '투자 포트폴리오를 검토해줘',
    '순자산을 늘리려면 어떻게 해야 해?',
    '저축 목표 달성 방법을 알려줘',
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

/**
 * 액션 성공 메시지 생성
 */
function getSuccessMessage(type, params) {
  const formatAmount = (amount) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    }
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  switch (type) {
    case 'updateCardExpense':
      return `카드 지출을 ${formatAmount(params.amount)}으로 수정했습니다.`;
    case 'updateFixedIncome':
      return `${params.name}을(를) ${formatAmount(params.amount)}으로 수정했습니다.`;
    case 'addVariableExpense':
      return `변동 지출 "${params.name}" ${formatAmount(params.amount)}을(를) 추가했습니다.`;
    case 'updateAsset':
      return `${params.name}을(를) ${formatAmount(params.amount)}으로 수정했습니다.`;
    case 'updateFixedExpense':
      return `${params.name} 지출을 ${formatAmount(params.amount)}으로 수정했습니다.`;
    case 'toggleFixedExpense':
      return `${params.name}을(를) ${params.checked ? '체크' : '체크 해제'}했습니다.`;
    case 'updateManualAccount':
      return `${params.name} 계좌를 ${formatAmount(params.amount)}으로 수정했습니다.`;
    default:
      return '데이터가 업데이트되었습니다.';
  }
}

export default useSolarChat;
