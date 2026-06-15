import { createContext, useContext, useState } from 'react'

const NavigationContext = createContext(null)

export function NavigationProvider({ children }) {
  const [activePage, setActivePage] = useState('home')
  return (
    <NavigationContext.Provider value={{ activePage, navigate: setActivePage }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
