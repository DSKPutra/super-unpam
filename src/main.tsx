import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/install' // tangkap beforeinstallprompt sedini mungkin
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
