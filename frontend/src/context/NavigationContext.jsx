import { createContext, useEffect, useContext, useState } from 'react'

const NavigationContext = createContext(null)
const NAVIGATION_STORAGE_KEY = 'aurora.activePage'
const LOCKED_PAGE_ID = 'checkins'

export function NavigationProvider({ children, lockedPageId = null }) {
  const [activePage, setActivePage] = useState(() => {
    try {
      const storedPage = window.localStorage.getItem(NAVIGATION_STORAGE_KEY) || 'home'
      return lockedPageId ? LOCKED_PAGE_ID : storedPage
    } catch {
      return lockedPageId ? LOCKED_PAGE_ID : 'home'
    }
  })

  useEffect(() => {
    if (!lockedPageId) return
    setActivePage((currentPage) => (currentPage === LOCKED_PAGE_ID ? currentPage : LOCKED_PAGE_ID))
    try {
      window.localStorage.setItem(NAVIGATION_STORAGE_KEY, LOCKED_PAGE_ID)
    } catch {
      // Storage can be unavailable in some private browsing modes.
    }
  }, [lockedPageId])

  function navigate(nextPage) {
    const resolvedPage = lockedPageId && nextPage !== LOCKED_PAGE_ID ? LOCKED_PAGE_ID : nextPage
    setActivePage(resolvedPage)
    try {
      window.localStorage.setItem(NAVIGATION_STORAGE_KEY, resolvedPage)
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
