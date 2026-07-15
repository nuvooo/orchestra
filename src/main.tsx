import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { OrchestraProvider } from './store/OrchestraContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OrchestraProvider>
      <App />
    </OrchestraProvider>
  </React.StrictMode>,
)
