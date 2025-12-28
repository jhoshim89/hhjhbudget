import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
    document.documentElement.classList.remove('dark');
  });

  it('should default to dark theme', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('should persist theme to localStorage', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    fireEvent.click(screen.getByText('Toggle'));
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('should add dark class on document.documentElement', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class when switching to light', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    fireEvent.click(screen.getByText('Toggle'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
