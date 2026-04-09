import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Disable browser scroll restoration globally so Safari never asynchronously
// overrides our programmatic scrollTo(0,0) calls on route transitions.
window.history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
