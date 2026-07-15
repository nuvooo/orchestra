import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { OrchestraProvider } from './store/OrchestraContext'

// StrictMode is intentionally omitted: several store actions perform side
// effects (API persistence, SSE) that StrictMode's double-invocation would
// duplicate in development.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <OrchestraProvider>
    <App />
  </OrchestraProvider>,
)
