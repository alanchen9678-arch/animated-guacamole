import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import App from './App.jsx'
import './index.css'
import { migrateLegacyBrandStorage } from './utils/brand-storage-migration.js'

migrateLegacyBrandStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
