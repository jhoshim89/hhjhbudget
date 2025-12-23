# Project Context: Budget Dashboard

## Project Overview
This is a React-based budget dashboard application designed to visualize financial data. It is built with **Vite** for fast development and **Tailwind CSS** for styling. The project currently includes a functional React implementation and a collection of high-fidelity HTML/CSS design prototypes in the `HTMLEXAMPLE` directory.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3.4 (with PostCSS & Autoprefixer)
- **Visualization:** Recharts 2.10
- **Language:** JavaScript (ES Modules), with `.jsx` for components.

## Key Commands
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Builds the application for production. |
| `npm run preview` | Previews the production build locally. |

## Directory Structure
- **`src/`**: Contains the React source code.
    - `App.jsx`: Main entry component.
    - `Dashboard.jsx`: The core dashboard component (currently contains hardcoded data and Recharts implementation).
    - `main.jsx`: React root rendering.
- **`HTMLEXAMPLE/`**: Contains 5 distinct HTML/Tailwind design prototypes for reference.
    - `README.md`: Detailed documentation of the design styles (Glassmorphism, Y2K Cyber, Terminal, Swiss Minimal, Maximalist).
    - `*.html`: The prototype files.
- **`AGENTS.md`**: Guidelines for AI agents, including code style and conventions.
- **Configuration Files**: `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `package.json`.

## Development Conventions (from AGENTS.md)
- **Styling**: Tailwind CSS with a dark theme focus (slate-900/800/700).
- **Component Style**: Functional components with hooks (`useState`, `useMemo`).
- **Data Handling**: Currently uses a hardcoded `rawData` array in `Dashboard.jsx`, intended for future Google Sheets integration.
- **Number Formatting**: Custom `formatKRW` and `formatFull` functions for Korean currency.
- **Error Handling**: `console.error` for API failures; `try/catch` for async ops.
- **Imports**: React imports -> Third-party -> Local components.

## Design Prototypes (HTMLEXAMPLE)
The `HTMLEXAMPLE` directory provides 5 distinct visual directions:
1.  **Glassmorphism**: iOS-style, translucent, gradients.
2.  **Y2K Cyber**: Neon, glitch effects, cyberpunk aesthetic.
3.  **Terminal/Hacker**: Monospace, green text on black, command-line feel.
4.  **Swiss Minimalism**: Strict grid, typography-focused, clean.
5.  **Maximalist Data**: High density, data-heavy, Bloomberg terminal style.

These prototypes are intended to be converted into React components or used as styling references for the main `Dashboard.jsx`.
