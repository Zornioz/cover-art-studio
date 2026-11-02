import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { ensureFontsReady } from './fonts/fontLoader'
import { installWebApiIfNeeded } from './platform/webApi'

// Under Electron the preload script has already exposed window.api; in a plain browser
// (GitHub Pages) fall back to the browser implementation.
installWebApiIfNeeded()

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

void ensureFontsReady().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
