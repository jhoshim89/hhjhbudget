import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Header from './Header';

describe('Header', () => {
  it('renders the title correctly', () => {
    render(<Header />);
    expect(screen.getByText(/BUDGET/i)).toBeInTheDocument();
    expect(screen.getByText(/\.CMD/i)).toBeInTheDocument();
  });

  it('renders exchange rate and indices when provided', () => {
    const indices = [
      { name: 'SPY', value: 595.20, change: 'up' }
    ];
    render(<Header exchangeRate={1380.50} indices={indices} />);
    expect(screen.getByText(/USD 1,380.50/i)).toBeInTheDocument();
    expect(screen.getByText(/SPY 595.20/i)).toBeInTheDocument();
  });

  it('renders current date', () => {
    render(<Header />);
    const today = new Date().toISOString().slice(0, 10);
    expect(screen.getByText(today)).toBeInTheDocument();
  });
});
