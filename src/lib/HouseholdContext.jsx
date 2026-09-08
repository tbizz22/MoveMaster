import { createContext, useContext } from 'react'

export const HouseholdContext = createContext(null)

// { householdId, householdName, role, refresh() }
export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within AuthGate')
  return ctx
}
