import { useContext } from 'react'
import { VisitorContext } from '../context/visitorContextObject'

/** The visitor: who they are, where they are in the entry sequence, and the
 *  set of residences and spaces they have marked for their take-away sheet. */
export const useVisitor = () => {
  const ctx = useContext(VisitorContext)
  if (!ctx) throw new Error('useVisitor must be used inside <VisitorProvider>')
  return ctx
}
