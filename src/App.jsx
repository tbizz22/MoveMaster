import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import { checkConfigured } from './lib/airtable'
import BoxList from './pages/BoxList'
import BoxDetail from './pages/BoxDetail'
import NewBox from './pages/NewBox'
import './App.css'

function App() {
  const [configured, setConfigured] = useState(null)

  useEffect(() => {
    checkConfigured().then(setConfigured)
  }, [])

  if (configured === null) {
    return (
      <section id="center">
        <h1>Moving Master</h1>
        <p>Checking configuration…</p>
      </section>
    )
  }

  if (!configured) {
    return (
      <section id="center">
        <h1>Moving Master</h1>
        <p className="error">
          Airtable is not configured on the server — set <code>AIRTABLE_TOKEN</code> and{' '}
          <code>AIRTABLE_BASE_ID</code> in <code>.env.local</code> (no <code>VITE_</code> prefix —
          these stay server-side and are read by the API routes in <code>/api</code>, not the
          browser).
        </p>
      </section>
    )
  }

  return (
    <HashRouter>
      <header className="app-header">
        <Link to="/" className="app-title">
          Moving Master
        </Link>
      </header>
      <main id="center">
        <Routes>
          <Route path="/" element={<BoxList />} />
          <Route path="/boxes/new" element={<NewBox />} />
          <Route path="/boxes/:id" element={<BoxDetail />} />
        </Routes>
      </main>
    </HashRouter>
  )
}

export default App
