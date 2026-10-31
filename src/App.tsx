import { useCallback, useEffect, useState } from 'react'

import { AppSidebar } from '@/components/AppSidebar'
import type { MainView } from '@/components/AppSidebar'
import { AuthScreen } from '@/components/AuthScreen'
import type { AuthMode } from '@/components/AuthScreen'
import { FilesOverview } from '@/components/FilesOverview'
import { HomeCloudHeader } from '@/components/HomeCloudHeader'
import { TrashOverview } from '@/components/TrashOverview'
import { api } from '@/lib/api'
import type { StorageResponse } from '@/lib/api'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

function normalizePath(pathname: string) {
  const path = pathname.replace(/\/+$/, '')
  return path || '/'
}

function App() {
  const [user, setUser] = useState(api.getCurrentUser())
  const [storage, setStorage] = useState<StorageResponse | null>(null)
  const [storageError, setStorageError] = useState('')
  const [route, setRoute] = useState(() => {
    const currentPath = normalizePath(window.location.pathname)
    const initialPath = currentPath === '/' ? (api.getCurrentUser() ? '/home' : '/login') : currentPath
    if (initialPath !== currentPath) window.history.replaceState({}, '', initialPath)
    return initialPath
  })
  const activeView: MainView = route === '/trash' ? 'trash' : 'files'
  const pageTitle = activeView === 'trash' ? 'Trash' : 'My Files'

  const navigate = useCallback((path: string, replace = false) => {
    if (window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, '', path)
      else window.history.pushState({}, '', path)
    }
    setRoute(path)
  }, [])

  const refreshStorage = useCallback(async () => {
    try {
      setStorage(await api.getStorage())
      setStorageError('')
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Storage unavailable')
    }
  }, [])

  useEffect(() => {
    if (user) void refreshStorage()
    else setStorage(null)
  }, [refreshStorage, user])

  useEffect(() => {
    const handlePopState = () => setRoute(normalizePath(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      navigate('/login', true)
    }
    window.addEventListener('homecloud:session-expired', handleSessionExpired)
    return () => window.removeEventListener('homecloud:session-expired', handleSessionExpired)
  }, [navigate])

  useEffect(() => {
    const authRoute = route === '/login' || route === '/register'
    const appRoute = route === '/home' || route === '/trash'
    if (route === '/') navigate(user ? '/home' : '/login', true)
    else if (!user && appRoute) navigate('/login', true)
    else if (user && authRoute) navigate('/home', true)
    else if (!authRoute && !appRoute) navigate(user ? '/home' : '/login', true)
  }, [navigate, route, user])

  async function submitAuth(mode: AuthMode, values: { username: string; email?: string; password: string }) {
    if (mode === 'register') {
      const registeredUser = await api.register({ username: values.username, email: values.email ?? '', password: values.password })
      await api.login({ username: values.username, password: values.password })
      api.setSessionUser(registeredUser)
    } else {
      await api.login({ username: values.username, password: values.password })
    }
    setUser(api.getCurrentUser())
    navigate('/home')
  }

  async function signOut() {
    try { await api.logout() }
    catch { /* The local session is cleared even if the server cannot be reached. */ }
    finally {
      setUser(null)
      navigate('/login', true)
    }
  }

  if (!user || route === '/login' || route === '/register') {
    const mode: AuthMode = route === '/register' ? 'register' : 'login'
    return (
      <AuthScreen
        mode={mode}
        onModeChange={(nextMode) => navigate(nextMode === 'register' ? '/register' : '/login')}
        onSubmit={(values) => submitAuth(mode, values)}
      />
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          activeView={activeView}
          onNavigate={(view) => navigate(view === 'trash' ? '/trash' : '/home')}
          storage={storage}
          storageError={storageError}
        />
        <SidebarInset>
          <HomeCloudHeader
            onNavigateHome={() => navigate('/home')}
            onSignOut={() => { void signOut() }}
            pageTitle={pageTitle}
            username={user.username}
          />
          <section className="flex flex-1 flex-col gap-6 p-6 md:p-8">
            <div>
              <p className="text-sm font-medium text-primary">HomeCloud</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{pageTitle}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeView === 'trash' ? 'Restore deleted items or permanently remove them.' : 'Browse and organize your files and folders.'}
              </p>
            </div>
            {activeView === 'trash'
              ? <TrashOverview onStorageChanged={refreshStorage} />
              : <FilesOverview onStorageChanged={refreshStorage} />}
          </section>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
