import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/landing/LandingPage'
import GamePage from './components/game/GamePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/:artistSlug" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  )
}
