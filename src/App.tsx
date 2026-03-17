import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GamePage from './components/game/GamePage'
import DifficultyPage from './components/game/DifficultyPage'
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
import FlaggedLyricsPage from './components/admin/FlaggedLyricsPage'
import LyricPage from './components/admin/LyricPage'
import LyricsPage from './components/admin/LyricsPage'
import BlocklistedLyricsPage from './components/admin/BlocklistedLyricsPage'
import LyricGroupsPage from './components/admin/LyricGroupsPage'
import LyricGroupPage from './components/admin/LyricGroupPage'
import FlaggedImagesPage from './components/admin/FlaggedImagesPage'
import ImagePage from './components/admin/ImagePage'
import ImagesPage from './components/admin/ImagesPage'
import BlocklistedImagesPage from './components/admin/BlocklistedImagesPage'
import SettingsPage from './components/admin/SettingsPage'
import DifficultyRanksPage from './components/admin/DifficultyRanksPage'
import ArtistLevelsPage from './components/admin/ArtistLevelsPage'
import LevelFormPage from './components/admin/LevelFormPage'
import CopywriterCorner from './components/admin/CopywriterCorner'

export default function App() {
  return (
    <>
      <div id="bg-pattern" aria-hidden="true" />
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
          <Route path="artists/:artistId/levels" element={<ArtistLevelsPage />} />
          <Route path="artists/:artistId/levels/new" element={<LevelFormPage />} />
          <Route path="artists/:artistId/levels/:id" element={<LevelFormPage />} />
          <Route path="artists/:artistId/difficulty" element={<DifficultyRanksPage />} />
          <Route path="artists/:artistId/songs" element={<ArtistSongsPage />} />
          <Route path="artists/:artistId/songs/new" element={<SongFormPage />} />
          <Route path="artists/:artistId/songs/:id" element={<SongFormPage />} />
          <Route path="artists/:artistId/songs/:songId/lyrics" element={<SongLyricsPage />} />
          <Route path="lyrics" element={<FlaggedLyricsPage />} />
          <Route path="lyrics/all" element={<LyricsPage />} />
          <Route path="lyrics/blocklisted" element={<BlocklistedLyricsPage />} />
          <Route path="lyrics/groups" element={<LyricGroupsPage />} />
          <Route path="lyrics/groups/:groupId" element={<LyricGroupPage />} />
          <Route path="lyrics/:lyricId" element={<LyricPage />} />
          <Route path="images" element={<FlaggedImagesPage />} />
          <Route path="images/all" element={<ImagesPage />} />
          <Route path="images/blocklisted" element={<BlocklistedImagesPage />} />
          <Route path="images/:imageId" element={<ImagePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="copywriter" element={<CopywriterCorner />} />
        </Route>
        <Route path="/:artistSlug" element={<DifficultyPage />} />
        <Route path="/:artistSlug/:difficulty" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}
