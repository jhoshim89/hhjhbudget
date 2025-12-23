import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InputConsole from './InputConsole';

describe('InputConsole', () => {
  it('renders tab buttons', () => {
    render(<InputConsole />);
    expect(screen.getByText('지출 (Expense)')).toBeInTheDocument();
    expect(screen.getByText('수입 (Income)')).toBeInTheDocument();
    expect(screen.getByText('자산 (Assets)')).toBeInTheDocument();
  });

  it('switches tabs correctly', () => {
    render(<InputConsole />);
    
    // Default is Expense
    expect(screen.getByText('지출 입력')).toBeInTheDocument();

    // Click Income
    fireEvent.click(screen.getByText('수입 (Income)'));
    expect(screen.getByText('수입 입력')).toBeInTheDocument();

    // Click Assets
    fireEvent.click(screen.getByText('자산 (Assets)'));
    expect(screen.getByText('자산 관리')).toBeInTheDocument();
  });
});
