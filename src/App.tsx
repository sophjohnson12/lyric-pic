import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './components/landing/LandingPage'
import GamePage from './components/game/GamePage'
import LoginPage from './components/admin/LoginPage'
import AdminPage from './components/admin/AdminPage'
import ProtectedRoute from './components/admin/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/:artistSlug" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  )
}
