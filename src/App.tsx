import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'

const Articles = lazy(() => import('./pages/Articles'))
const Practice = lazy(() => import('./pages/Practice'))
const Vocab = lazy(() => import('./pages/Vocab'))
const Stats = lazy(() => import('./pages/Stats'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/articles"
          element={<Suspense fallback={null}><Articles /></Suspense>}
        />
        <Route
          path="/practice/:id"
          element={<Suspense fallback={null}><Practice /></Suspense>}
        />
        <Route
          path="/vocab"
          element={<Suspense fallback={null}><Vocab /></Suspense>}
        />
        <Route
          path="/stats"
          element={<Suspense fallback={null}><Stats /></Suspense>}
        />
      </Route>
    </Routes>
  )
}
