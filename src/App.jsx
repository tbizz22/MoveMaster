import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import { isConfigured } from './lib/airtable'
import BoxList from './pages/BoxList'
import BoxDetail from './pages/BoxDetail'
import NewBox from './pages/NewBox'
import './App.css'

function App() {
  if (!isConfigured()) {
    return (
      <section id="center">
        <h1>Moving Master</h1>
        <p className="error">
          Airtable is not configured — copy <code>.env.example</code> to <code>.env.local</code>{' '}
          and fill in your token and base ID.
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
