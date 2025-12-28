import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../../contexts/ThemeContext';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
    document.documentElement.classList.remove('dark');
  });

  it('should render sun icon in dark mode', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('should toggle theme on click', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByLabelText('Toggle theme');
    fireEvent.click(button);
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });
});
