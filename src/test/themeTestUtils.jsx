import { render } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';

export function renderWithTheme(ui, { theme = 'dark' } = {}) {
  return render(
    <ThemeProvider defaultTheme={theme}>
      {ui}
    </ThemeProvider>
  );
}
