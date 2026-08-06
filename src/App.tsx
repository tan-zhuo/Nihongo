import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Articles from './pages/Articles'
import Practice from './pages/Practice'
import Vocab from './pages/Vocab'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/practice/:id" element={<Practice />} />
        <Route path="/vocab" element={<Vocab />} />
      </Route>
    </Routes>
  )
}
