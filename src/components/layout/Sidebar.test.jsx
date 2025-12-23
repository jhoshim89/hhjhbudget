import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders all menu items', () => {
    render(<Sidebar activeTab="dashboard" onTabChange={() => {}} />);
    
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('포트폴리오')).toBeInTheDocument();
    expect(screen.getByText('입출금 내역')).toBeInTheDocument();
    expect(screen.getByText('데이터 입력')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    render(<Sidebar activeTab="dashboard" onTabChange={() => {}} />);
    const dashboardBtn = screen.getByText('대시보드').closest('button');
    expect(dashboardBtn).toHaveClass('bg-blue-600'); // active class check
  });

  it('calls onTabChange when a menu is clicked', () => {
    const handleTabChange = vi.fn();
    render(<Sidebar activeTab="dashboard" onTabChange={handleTabChange} />);
    
    fireEvent.click(screen.getByText('포트폴리오'));
    expect(handleTabChange).toHaveBeenCalledWith('portfolio');
  });
});
