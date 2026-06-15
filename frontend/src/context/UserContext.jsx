import { createContext, useContext } from 'react'

const defaultUser = {
  firstName: 'Jordan',
  plan: 'Support Plus',
  streak: 6,
  mood: 'steady',
}

const UserContext = createContext(defaultUser)

export function UserProvider({ children }) {
  return <UserContext.Provider value={defaultUser}>{children}</UserContext.Provider>
}

export function useUser() {
  return useContext(UserContext)
}
