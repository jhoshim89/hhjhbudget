import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssetSummary from './AssetSummary';

// Mock Recharts to avoid sizing issues in JSDOM
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container">{children}</div>,
    AreaChart: () => <div className="recharts-area-chart">Chart</div>,
    Area: () => null,
    defs: () => null,
    linearGradient: () => null,
    stop: () => null,
    Tooltip: () => null,
  };
});

describe('AssetSummary', () => {
  it('renders total assets formatted correctly', () => {
    render(<AssetSummary totalAssets={523400000} />);
    // formatKRW handles this: 5.2억
    expect(screen.getByText(/5.2억/)).toBeInTheDocument(); 
  });

  it('renders percentage change', () => {
    render(<AssetSummary totalAssets={523400000} prevAssets={500000000} />);
    // (523.4 - 500) / 500 * 100 = 4.68% -> 4.7%
    expect(screen.getByText(/4.7%/)).toBeInTheDocument();
  });
});