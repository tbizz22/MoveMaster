import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useHousehold } from './lib/HouseholdContext'
import BoxList from './pages/BoxList'
import BoxDetail from './pages/BoxDetail'
import NewBox from './pages/NewBox'
import PrintLabels from './pages/PrintLabels'
import './App.css'

function App() {
  const { householdName } = useHousehold()

  return (
    <HashRouter>
      <header className="app-header no-print">
        <Link to="/" className="app-title">
          Moving Master
        </Link>
        <div className="app-header-right">
          <span className="household-name">{householdName}</span>
          <button type="button" className="button small" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main id="center">
        <Routes>
          <Route path="/" element={<BoxList />} />
          <Route path="/boxes/new" element={<NewBox />} />
          <Route path="/boxes/:id" element={<BoxDetail />} />
          <Route path="/print" element={<PrintLabels />} />
        </Routes>
      </main>
    </HashRouter>
  )
}

export default App
