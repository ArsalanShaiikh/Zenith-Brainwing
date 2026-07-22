import { createContext } from 'react'

/**
 * Lives apart from the provider so ViewContext.jsx exports a component only —
 * Vite fast refresh bails out on files that mix components with other values.
 */
export const ViewContext = createContext(null)
