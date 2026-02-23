import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GamePage from './components/game/GamePage'
import LoginPage from './components/admin/LoginPage'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import ArtistsPage from './components/admin/ArtistsPage'
import ArtistFormPage from './components/admin/ArtistFormPage'
import ArtistAlbumsPage from './components/admin/ArtistAlbumsPage'
import AlbumFormPage from './components/admin/AlbumFormPage'
import ImportAlbumsPage from './components/admin/ImportAlbumsPage'
import ArtistSongsPage from './components/admin/ArtistSongsPage'
import SongFormPage from './components/admin/SongFormPage'
import SongLyricsPage from './components/admin/SongLyricsPage'
import LyricsPage from './components/admin/LyricsPage'
import ImagesPage from './components/admin/ImagesPage'
import SettingsPage from './components/admin/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/taylorswift" replace />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<ArtistsPage />} />
          <Route path="artists/new" element={<ArtistFormPage />} />
          <Route path="artists/:id" element={<ArtistFormPage />} />
          <Route path="artists/:artistId/albums" element={<ArtistAlbumsPage />} />
          <Route path="artists/:artistId/albums/imports" element={<ImportAlbumsPage />} />
          <Route path="artists/:artistId/albums/new" element={<AlbumFormPage />} />
          <Route path="artists/:artistId/albums/:id" element={<AlbumFormPage />} />
          <Route path="artists/:artistId/songs" element={<ArtistSongsPage />} />
          <Route path="artists/:artistId/songs/new" element={<SongFormPage />} />
          <Route path="artists/:artistId/songs/:id" element={<SongFormPage />} />
          <Route path="artists/:artistId/songs/:songId/lyrics" element={<SongLyricsPage />} />
          <Route path="lyrics" element={<LyricsPage />} />
          <Route path="images" element={<ImagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/:artistSlug" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  )
}
