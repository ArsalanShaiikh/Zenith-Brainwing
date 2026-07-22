import { useContext } from 'react'
import { ViewContext } from '../context/viewContextObject'

export const useView = () => {
  const ctx = useContext(ViewContext)
  if (!ctx) throw new Error('useView must be used inside <ViewProvider>')
  return ctx
}
