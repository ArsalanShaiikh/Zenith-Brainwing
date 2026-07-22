import { useState } from 'react'
import { ViewProvider } from './context/ViewContext'
import { useView } from './hooks/useView'
import Preloader from './components/Preloader'
import Shell from './components/Shell'

import './styles/tokens.css'
import './styles/base.css'
import './views/views.css'

/**
 * The shell mounts immediately and sits under the preloader curtain, so the
 * home plate and fonts are already painted when the panel lifts. `ready`
 * gates the Observer and keyboard so nothing can drive the machine early.
 */
const Stage = () => {
  const { setReady } = useView()
  const [curtain, setCurtain] = useState(true)

  return (
    <>
      <Shell />
      {curtain && (
        <Preloader
          onReveal={() => setReady(true)}
          onFinish={() => setCurtain(false)}
        />
      )}
    </>
  )
}

const App = () => (
  <ViewProvider>
    <Stage />
  </ViewProvider>
)

export default App
