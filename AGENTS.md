# Agent Guidelines

## Build/Test Commands
- **Dev**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (production build)
- **Preview**: `npm run preview` (preview production build)
- No test framework configured

## Code Style
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS with dark theme (slate-900/800/700 palette)
- **Imports**: React imports at top, third-party libs, then local components
- **Component Style**: Functional components with hooks (useState, useMemo)
- **File Extension**: `.jsx` for React components
- **Formatting**: 2-space indentation, semicolons optional
- **State Management**: Local state with useState/useMemo, no global state lib
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Types**: No TypeScript - plain JavaScript with prop validation via runtime checks
- **Error Handling**: Console.error for API failures, try/catch for async operations
- **Data**: Hardcoded rawData array in Dashboard.jsx, prepared for Google Sheets integration
- **Charts**: Recharts library for all visualizations
- **Number Formatting**: Custom formatKRW and formatFull functions for Korean won display
