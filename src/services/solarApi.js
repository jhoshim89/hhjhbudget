// Solar Pro API 연동 (Upstage)
// 3월까지 무료

// 환경변수에서 API 키 로드 (보안을 위해 하드코딩 금지)
const SOLAR_API_KEY = import.meta.env?.VITE_SOLAR_API_KEY;
const API_URL = 'https://api.upstage.ai/v1/solar/chat/completions';

/**
 * Solar Pro API와 대화
 * @param {Array} messages - 대화 메시지 배열 [{role: 'user', content: '...'}]
 * @param {Object} context - 사용자 데이터 컨텍스트 (부동산, 대출 등)
 * @returns {Promise<Object>} API 응답
 */
export async function chatWithSolar(messages, context = null) {
  if (!SOLAR_API_KEY) {
    return {
      success: false,
      error: 'API key not configured',
      content: 'AI 기능을 사용하려면 환경변수(VITE_SOLAR_API_KEY)를 설정하세요.',
    };
  }

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
 * 시스템 프롬프트 생성 (전체 재무 상담용)
 */
function buildSystemPrompt(context) {
  let prompt = `당신은 개인 재무 관리 전문 AI 상담사입니다.
사용자의 재무 관련 질문에 친절하고 전문적으로 답변해주세요.

역할:
- 수입/지출 분석 및 예산 관리 조언
- 저축 및 투자 전략 상담
- 주식/채권 포트폴리오 분석
- 부동산 및 대출 상담
- 재무 목표 설정 및 달성 방안
- 세금 관련 기본 안내

주의사항:
- 구체적인 수치와 계산을 제공할 때는 정확하게 계산해주세요
- 투자 조언은 참고용이며, 최종 결정은 사용자에게 있음을 안내하세요
- 한국 원화 기준으로 답변하고, 큰 금액은 만원/억원 단위로 표시해주세요
- 사용자의 실제 데이터를 기반으로 맞춤형 조언을 제공해주세요

[데이터 입력/수정 기능]
사용자가 데이터 입력이나 수정을 요청하면, 응답 끝에 다음 JSON 형식으로 액션을 포함하세요:
\`\`\`action
{"type": "액션타입", "params": {...}}
\`\`\`

가능한 액션 타입:
1. "updateCardExpense" - 카드 지출 수정
   params: {"amount": 숫자}
   예: {"type": "updateCardExpense", "params": {"amount": 1500000}}

2. "updateFixedIncome" - 고정 수입 수정 (급여, 연구비, 추가수입 등)
   params: {"name": "항목명", "amount": 숫자}
   예: {"type": "updateFixedIncome", "params": {"name": "급여", "amount": 3000000}}

3. "addVariableExpense" - 변동 지출 추가
   params: {"name": "항목명", "amount": 숫자}
   예: {"type": "addVariableExpense", "params": {"name": "병원비", "amount": 50000}}

4. "updateAsset" - 자산 잔고 수정 (재호잔고, 향화잔고, 적금)
   params: {"name": "계좌명", "amount": 숫자}
   예: {"type": "updateAsset", "params": {"name": "재호잔고", "amount": 5000000}}

5. "updateFixedExpense" - 고정 지출 금액 수정
   params: {"name": "항목명", "amount": 숫자}
   예: {"type": "updateFixedExpense", "params": {"name": "통신비", "amount": 100000}}

6. "toggleFixedExpense" - 고정 지출 체크/해제
   params: {"name": "항목명", "checked": true/false}
   예: {"type": "toggleFixedExpense", "params": {"name": "보험료", "checked": true}}

7. "updateManualAccount" - 주식 계좌 수동 입력 (향화카카오, 재호영웅문)
   params: {"name": "계좌명", "amount": 숫자}
   예: {"type": "updateManualAccount", "params": {"name": "향화카카오", "amount": 10000000}}

금액 파싱 규칙:
- "150만원" → 1500000
- "1500000" → 1500000
- "300만" → 3000000
- "1억" → 100000000
- "1억 5000만원" → 150000000

입력 요청 시 반드시:
1. 먼저 입력할 내용을 확인하는 메시지를 작성
2. 응답 마지막에 action JSON 블록 추가
3. 액션이 실행되면 시스템이 자동으로 데이터를 업데이트함
`;

  if (context) {
    prompt += `\n\n[사용자의 재무 데이터 - ${context.summary?.selectedMonth || '현재'}]\n`;

    // 수입 정보
    if (context.incomes) {
      const fixedTotal = (context.incomes.fixed || []).reduce((sum, i) => sum + (i.amount || 0), 0);
      const variableTotal = (context.incomes.variable || []).reduce((sum, i) => sum + (i.amount || 0), 0);
      prompt += `\n💰 수입:\n`;
      prompt += `- 고정 수입: ${formatPrice(fixedTotal)}\n`;
      if (context.incomes.fixed?.length > 0) {
        context.incomes.fixed.filter(i => i.amount > 0).forEach(i => {
          prompt += `  · ${i.name}: ${formatPrice(i.amount)}\n`;
        });
      }
      if (variableTotal > 0) {
        prompt += `- 변동 수입: ${formatPrice(variableTotal)}\n`;
      }
      prompt += `- 총 수입: ${formatPrice(fixedTotal + variableTotal)}\n`;
    }

    // 지출 정보
    if (context.expenses) {
      const fixedTotal = (context.expenses.fixed || [])
        .filter(e => e.checked !== false)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const variableTotal = (context.expenses.variable || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const cardTotal = parseInt(context.expenses.card) || 0;
      prompt += `\n💸 지출:\n`;
      prompt += `- 고정 지출: ${formatPrice(fixedTotal)}\n`;
      if (context.expenses.fixed?.length > 0) {
        context.expenses.fixed.filter(e => e.checked !== false && e.amount > 0).forEach(e => {
          prompt += `  · ${e.name}: ${formatPrice(e.amount)}\n`;
        });
      }
      if (cardTotal > 0) {
        prompt += `- 카드 지출: ${formatPrice(cardTotal)}\n`;
      }
      if (variableTotal > 0) {
        prompt += `- 변동 지출: ${formatPrice(variableTotal)}\n`;
      }
      prompt += `- 총 지출: ${formatPrice(fixedTotal + variableTotal + cardTotal)}\n`;
    }

    // 자산 정보
    if (context.assets) {
      const cashTotal = Object.values(context.assets).reduce((sum, v) => sum + (v || 0), 0);
      if (cashTotal > 0) {
        prompt += `\n🏦 현금/예금:\n`;
        Object.entries(context.assets).forEach(([key, value]) => {
          if (value > 0) prompt += `- ${key}: ${formatPrice(value)}\n`;
        });
      }
    }

    // 채권 정보
    if (context.bond?.balance > 0) {
      prompt += `\n📜 채권:\n`;
      prompt += `- 잔액: ${formatPrice(context.bond.balance)}\n`;
      if (context.bond.yieldRate) prompt += `- 수익률: ${context.bond.yieldRate}%\n`;
    }

    // 투자(주식) 정보
    if (context.holdings?.length > 0) {
      prompt += `\n📈 보유 주식:\n`;
      context.holdings.forEach(h => {
        const currentPrice = context.stockPrices?.[h.ticker] || 0;
        const value = h.qty * currentPrice;
        if (value > 0) {
          prompt += `- ${h.name || h.ticker}: ${h.qty}주 (${formatPrice(value * (context.exchangeRate || 1))})\n`;
        }
      });
    }

    // 수동 계좌
    if (context.manualAccounts) {
      const manualTotal = Object.values(context.manualAccounts).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
      if (manualTotal > 0) {
        prompt += `\n💳 기타 투자 계좌:\n`;
        Object.entries(context.manualAccounts).forEach(([key, value]) => {
          const v = parseInt(value) || 0;
          if (v > 0) prompt += `- ${key}: ${formatPrice(v)}\n`;
        });
      }
    }

    // 부동산 정보
    if (context.realEstate?.myProperties?.length > 0) {
      prompt += `\n🏠 부동산:\n`;
      context.realEstate.myProperties.forEach(p => {
        prompt += `- ${p.name}: 현재가 ${formatPrice(p.currentValue || p.purchasePrice)}\n`;
      });
    }

    // 대출 정보
    if (context.realEstate?.loans?.length > 0) {
      prompt += `\n🏦 대출:\n`;
      const totalLoan = context.realEstate.loans.reduce((sum, l) => sum + l.amount, 0);
      context.realEstate.loans.forEach(l => {
        prompt += `- ${l.name || '대출'}: ${formatPrice(l.amount)} (금리 ${l.rate}%)\n`;
      });
      prompt += `- 총 대출: ${formatPrice(totalLoan)}\n`;
    }

    // 요약
    if (context.summary) {
      prompt += `\n📊 이번 달 요약:\n`;
      prompt += `- 총 수입: ${formatPrice(context.summary.totalIncome)}\n`;
      prompt += `- 총 지출: ${formatPrice(context.summary.totalExpense)}\n`;
      const balance = (context.summary.totalIncome || 0) - (context.summary.totalExpense || 0);
      prompt += `- 수지: ${balance >= 0 ? '+' : ''}${formatPrice(balance)}\n`;
      if (context.summary.totalAssets) {
        prompt += `- 총 자산: ${formatPrice(context.summary.totalAssets)}\n`;
      }
    }
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
