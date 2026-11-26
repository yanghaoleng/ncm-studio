import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import './styles.css'

const DataDashboard = lazy(() => import('./DataDashboard.jsx'))
const isDataDashboard = window.location.pathname === '/data' || window.location.pathname.startsWith('/data/')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDataDashboard ? <Suspense fallback={null}><DataDashboard /></Suspense> : <App />}
    {!isDataDashboard && <Analytics />}
  </StrictMode>,
)
