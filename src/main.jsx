import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import DataDashboard from './DataDashboard.jsx'
import './styles.css'

const isDataDashboard = window.location.pathname === '/data' || window.location.pathname.startsWith('/data/')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDataDashboard ? <DataDashboard /> : <App />}
    {!isDataDashboard && <Analytics />}
  </StrictMode>,
)
