import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'

const pageLoaders = {
  articles: () => import('./pages/Articles'),
  kana: () => import('./pages/Kana'),
  grammar: () => import('./pages/Grammar'),
  practice: () => import('./pages/Practice'),
  vocab: () => import('./pages/Vocab'),
  quiz: () => import('./pages/Quiz'),
  stats: () => import('./pages/Stats'),
}

/** Used by entry-server so SSR renders pages instead of Suspense fallbacks. */
export const preloadAllPages = () =>
  Promise.all(Object.values(pageLoaders).map((load) => load()))

const Articles = lazy(pageLoaders.articles)
const Kana = lazy(pageLoaders.kana)
const Grammar = lazy(pageLoaders.grammar)
const Practice = lazy(pageLoaders.practice)
const Vocab = lazy(pageLoaders.vocab)
const Quiz = lazy(pageLoaders.quiz)
const Stats = lazy(pageLoaders.stats)

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
          path="/kana"
          element={<Suspense fallback={null}><Kana /></Suspense>}
        />
        <Route
          path="/grammar"
          element={<Suspense fallback={null}><Grammar /></Suspense>}
        />
        <Route
          path="/quiz"
          element={<Suspense fallback={null}><Quiz /></Suspense>}
        />
        <Route
          path="/stats"
          element={<Suspense fallback={null}><Stats /></Suspense>}
        />
      </Route>
    </Routes>
  )
}
