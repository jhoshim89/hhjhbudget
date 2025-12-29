import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import PasswordGate from './components/auth/PasswordGate'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PasswordGate>
        <App />
      </PasswordGate>
    </ThemeProvider>
  </React.StrictMode>,
)
