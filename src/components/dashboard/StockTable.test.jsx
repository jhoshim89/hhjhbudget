import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StockTable from './StockTable';

describe('StockTable', () => {
  const stocks = [
    { ticker: 'NVDA', qty: 10, avgPrice: 100 },
    { ticker: 'TSLA', qty: 5, avgPrice: 300 }
  ];
  
  // prices map: ticker -> current price
  const prices = { 'NVDA': 150, 'TSLA': 200 };
  const exchangeRate = 1380;

  it('renders stock rows', () => {
    render(<StockTable stocks={stocks} prices={prices} exchangeRate={exchangeRate} />);
    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
  });

  it('calculates market value correctly', () => {
    render(<StockTable stocks={stocks} prices={prices} exchangeRate={exchangeRate} />);
    // NVDA: 10 * 150 = 1500 USD. 1500 * 1380 = 2,070,000 KRW -> 207만원 or 207만
    // formatKRW(2070000) -> 207만
    expect(screen.getByText(/207만/)).toBeInTheDocument();
  });

  it('calculates return percentage correctly', () => {
    render(<StockTable stocks={stocks} prices={prices} exchangeRate={exchangeRate} />);
    // NVDA: (150 - 100) / 100 = 50%
    expect(screen.getByText('+50.0%')).toBeInTheDocument();
    
    // TSLA: (200 - 300) / 300 = -33.3%
    expect(screen.getByText('-33.3%')).toBeInTheDocument();
  });
});
