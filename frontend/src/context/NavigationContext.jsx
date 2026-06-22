import { createContext, useContext, useState } from 'react'

const NavigationContext = createContext(null)
const NAVIGATION_STORAGE_KEY = 'aurora.activePage'

export function NavigationProvider({ children }) {
  const [activePage, setActivePage] = useState(() => {
    try {
      return window.localStorage.getItem(NAVIGATION_STORAGE_KEY) || 'home'
    } catch {
      return 'home'
    }
  })

  function navigate(nextPage) {
    setActivePage(nextPage)
    try {
      window.localStorage.setItem(NAVIGATION_STORAGE_KEY, nextPage)
    } catch {
      // Storage can be unavailable in some private browsing modes.
    }
  }

  return (
    <NavigationContext.Provider value={{ activePage, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
