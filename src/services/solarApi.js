// Solar Pro API 연동 (Upstage)
// 3월까지 무료

// 환경변수 또는 하드코딩 폴백 (프론트엔드에서는 환경변수 접근 불가하므로)
const SOLAR_API_KEY = import.meta.env?.VITE_SOLAR_API_KEY || 'up_okBtD33BeWAXvpbucOIVXfO71Bi7c';
const API_URL = 'https://api.upstage.ai/v1/solar/chat/completions';

/**
 * Solar Pro API와 대화
 * @param {Array} messages - 대화 메시지 배열 [{role: 'user', content: '...'}]
 * @param {Object} context - 사용자 데이터 컨텍스트 (부동산, 대출 등)
 * @returns {Promise<Object>} API 응답
 */
export async function chatWithSolar(messages, context = null) {
  const systemPrompt = buildSystemPrompt(context);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'solar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Solar API request failed');
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  } catch (error) {
    console.error('Solar API error:', error);
    return {
      success: false,
      error: error.message,
      content: '죄송합니다. AI 응답을 가져오는 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 스트리밍 대화 (실시간 응답)
 */
export async function* streamChatWithSolar(messages, context = null) {
  const systemPrompt = buildSystemPrompt(context);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOLAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'solar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Solar API stream request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('Solar stream error:', error);
    yield '죄송합니다. 스트리밍 중 오류가 발생했습니다.';
  }
}

/**
 * 시스템 프롬프트 생성
 */
function buildSystemPrompt(context) {
  let prompt = `당신은 한국 부동산 전문 상담 AI입니다.
사용자의 부동산 관련 질문에 친절하고 전문적으로 답변해주세요.

역할:
- 부동산 시세 분석 및 투자 조언
- 대출 상환 계획 및 이자 계산
- 부동산 관련 세금 (취득세, 양도세 등) 안내
- 전세/월세 시장 분석
- 내 집 마련 전략 상담

주의사항:
- 구체적인 수치와 계산을 제공할 때는 정확하게 계산해주세요
- 투자 조언은 참고용이며, 최종 결정은 사용자에게 있음을 안내하세요
- 한국 부동산 시장 기준으로 답변해주세요
- 금액은 한국 원화 기준, 억 단위로 표시해주세요
`;

  if (context) {
    prompt += `\n\n[사용자의 부동산 데이터]\n`;

    if (context.myProperties?.length > 0) {
      prompt += `\n📍 보유 부동산:\n`;
      context.myProperties.forEach(p => {
        prompt += `- ${p.name} ${p.area}㎡: 매입가 ${formatPrice(p.purchasePrice)}, 현재가 ${formatPrice(p.currentValue || p.purchasePrice)}\n`;
      });
    }

    if (context.loans?.length > 0) {
      prompt += `\n🏦 대출 정보:\n`;
      context.loans.forEach(l => {
        prompt += `- 대출금 ${formatPrice(l.amount)}, 금리 ${l.rate}%, ${l.type || '원리금균등'}\n`;
      });

      // 총 대출 및 월 이자 계산
      const totalLoan = context.loans.reduce((sum, l) => sum + l.amount, 0);
      const monthlyInterest = context.loans.reduce((sum, l) => sum + (l.amount * l.rate / 100 / 12), 0);
      prompt += `- 총 대출: ${formatPrice(totalLoan)}, 월 이자: ${formatPrice(monthlyInterest)}\n`;
    }

    if (context.watchProperties?.length > 0) {
      prompt += `\n👀 관심 부동산:\n`;
      context.watchProperties.forEach(p => {
        prompt += `- ${p.name} ${p.area}㎡\n`;
      });

      // 최근 시세 정보
      if (context.priceHistory) {
        context.watchProperties.forEach(p => {
          const history = context.priceHistory[p.id];
          if (history?.length > 0) {
            const latest = history[history.length - 1];
            prompt += `  └ 최근 시세: 매매 ${formatPrice(latest.salePrice)}, 전세 ${formatPrice(latest.jeonsePrice)}\n`;
          }
        });
      }
    }

    // 순자산 계산
    const totalAssets = (context.myProperties || []).reduce((sum, p) => sum + (p.currentValue || p.purchasePrice), 0);
    const totalDebt = (context.loans || []).reduce((sum, l) => sum + l.amount, 0);
    const netWorth = totalAssets - totalDebt;

    prompt += `\n💰 요약:\n`;
    prompt += `- 부동산 자산: ${formatPrice(totalAssets)}\n`;
    prompt += `- 총 대출: ${formatPrice(totalDebt)}\n`;
    prompt += `- 순자산: ${formatPrice(netWorth)}\n`;
  }

  return prompt;
}

/**
 * 금액 포맷팅 (억 단위)
 */
function formatPrice(amount) {
  if (!amount) return '0원';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

export default chatWithSolar;
