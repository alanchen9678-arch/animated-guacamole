import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useLocation, useNavigate as useRouterNavigate } from 'react-router'
import { getPageIdFromPath, PAGE_PATHS } from '../routes/AppRoutes.jsx'

const NavigationContext = createContext(null)
const NAVIGATION_STORAGE_KEY = 'dawn-harbor.activePage'
const LOCKED_PAGE_ID = 'checkins'

export function NavigationProvider({ children, lockedPageId = null, authenticated = false }) {
  const location = useLocation()
  const routerNavigate = useRouterNavigate()
  const migratedLegacyPage = useRef(false)
  const activePage = getPageIdFromPath(location.pathname)

  useEffect(() => {
    if (!authenticated || migratedLegacyPage.current) return
    migratedLegacyPage.current = true

    let storedPage = null
    try {
      storedPage = window.localStorage.getItem(NAVIGATION_STORAGE_KEY)
      window.localStorage.removeItem(NAVIGATION_STORAGE_KEY)
    } catch {
      // Storage can be unavailable in some private browsing modes.
    }

    if (location.pathname === '/' || location.pathname === '/app') {
      const destination = PAGE_PATHS[storedPage] || PAGE_PATHS.home
      routerNavigate(destination, { replace: true })
    }
  }, [authenticated, location.pathname, routerNavigate])

  useEffect(() => {
    if (!lockedPageId || activePage === LOCKED_PAGE_ID) return
    routerNavigate(PAGE_PATHS[LOCKED_PAGE_ID], { replace: true })
  }, [activePage, lockedPageId, routerNavigate])

  const navigate = useCallback((nextPage, options = {}) => {
    const requestedPath = PAGE_PATHS[nextPage] || nextPage
    const requestedPage = getPageIdFromPath(requestedPath)
    const destination = lockedPageId && requestedPage !== LOCKED_PAGE_ID
      ? PAGE_PATHS[LOCKED_PAGE_ID]
      : requestedPath
    routerNavigate(destination, options)
  }, [lockedPageId, routerNavigate])

  const currentPath = `${location.pathname}${location.search}`

  return (
    <NavigationContext.Provider value={{ activePage, currentPath, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
