import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { HouseholdContext } from './lib/HouseholdContext'

function AuthForm() {
  const [mode, setMode] = useState('signin') // "signin" | "signup"
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else if (!data.session) {
          setNotice('Account created — check your email to confirm before signing in.')
        }
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="center" className="auth-screen">
      <h1>Moving Master</h1>
      <form className="form auth-form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}

        <button type="submit" className="button primary button-large" disabled={busy}>
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <p className="auth-switch">
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button type="button" className="link-button" onClick={() => setMode('signup')}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" className="link-button" onClick={() => setMode('signin')}>
              Sign in
            </button>
          </>
        )}
      </p>
    </section>
  )
}

function HouseholdSetup({ onReady }) {
  const [mode, setMode] = useState('create') // "create" | "join"
  const [name, setName] = useState('My Household')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'create') {
        const { error } = await supabase.rpc('create_household', { p_name: name || 'My Household' })
        if (error) throw error
      } else {
        const { error } = await supabase.rpc('redeem_invite', { p_code: code.trim() })
        if (error) throw error
      }
      onReady()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="center" className="auth-screen">
      <h1>Set up your household</h1>
      <p>Boxes and items are shared with everyone in your household.</p>

      <div className="toggle-row" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`toggle-chip${mode === 'create' ? ' toggle-chip-active' : ''}`}
          onClick={() => setMode('create')}
        >
          Create a household
        </button>
        <button
          type="button"
          className={`toggle-chip${mode === 'join' ? ' toggle-chip-active' : ''}`}
          onClick={() => setMode('join')}
        >
          Join with a code
        </button>
      </div>

      <form className="form auth-form" onSubmit={submit}>
        {mode === 'create' ? (
          <label>
            Household name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        ) : (
          <label>
            Invite code
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 7K4QXN2P"
              required
              autoFocus
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="button primary button-large" disabled={busy}>
          {busy ? 'Working…' : mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </form>
    </section>
  )
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [household, setHousehold] = useState(undefined) // undefined = loading, null = none yet

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadHousehold() {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('default_household_id')
      .single()
    if (profileError || !profile?.default_household_id) {
      setHousehold(null)
      return
    }
    const { data: householdRow, error: householdError } = await supabase
      .from('households')
      .select('id, name, join_code, owner_user_id')
      .eq('id', profile.default_household_id)
      .single()
    if (householdError || !householdRow) {
      setHousehold(null)
      return
    }
    const { data: auth } = await supabase.auth.getUser()
    setHousehold({
      householdId: householdRow.id,
      householdName: householdRow.name,
      joinCode: householdRow.join_code,
      role: householdRow.owner_user_id === auth.user.id ? 'owner' : 'member',
      refresh: loadHousehold,
    })
  }

  useEffect(() => {
    if (!session) {
      setHousehold(session === null ? null : undefined)
      return
    }
    loadHousehold()
  }, [session])

  if (session === undefined) return null // initial load
  if (session === null) return <AuthForm />
  if (household === undefined) return null // resolving household
  if (household === null) return <HouseholdSetup onReady={loadHousehold} />

  return <HouseholdContext.Provider value={household}>{children}</HouseholdContext.Provider>
}
