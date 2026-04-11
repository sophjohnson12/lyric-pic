import { useState, useEffect } from 'react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ColorField from './ColorField'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import { getAppConfig, updateAppConfig } from '../../services/adminService'

function applyDefaultTheme(primary: string, secondary: string) {
  document.documentElement.style.setProperty('--color-theme-primary', primary)
  document.documentElement.style.setProperty('--color-theme-secondary', secondary)
}

export default function SettingsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [enableImages, setEnableImages] = useState(true)
  const [enableBackgrounds, setEnableBackgrounds] = useState(false)
  const [enableMap, setEnableMap] = useState(true)
  const [enableLyricFlag, setEnableLyricFlag] = useState(true)
  const [enableImageFlag, setEnableImageFlag] = useState(true)
  const [maxGuessCount, setMaxGuessCount] = useState('')
  const [minSongLyricCount, setMinSongLyricCount] = useState('')
  const [topDistinctiveCount, setTopDistinctiveCount] = useState('')
  const [maxDistinctiveValue, setMaxDistinctiveValue] = useState('')
  const [minImageCount, setMinImageCount] = useState('')
  const [maxImageCount, setMaxImageCount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setBreadcrumbs([{ label: 'Settings' }])
  }, [setBreadcrumbs])

  useEffect(() => {
    async function load() {
      try {
        const config = await getAppConfig()
        setPrimaryColor(config.theme_primary_color)
        setSecondaryColor(config.theme_secondary_color)
        setEnableImages(config.enable_images)
        setEnableBackgrounds(config.enable_backgrounds)
        setEnableMap(config.enable_map ?? true)
        setEnableLyricFlag(config.enable_lyric_flag)
        setEnableImageFlag(config.enable_image_flag)
        setMaxGuessCount(String(config.max_guess_count))
        setMinSongLyricCount(String(config.min_song_lyric_count))
        setTopDistinctiveCount(String(config.top_distinctive_count))
        setMaxDistinctiveValue(String(config.max_distinctive_value))
        setMinImageCount(String(config.min_image_count))
        setMaxImageCount(String(config.max_image_count))
        applyDefaultTheme(config.theme_primary_color, config.theme_secondary_color)
      } catch (err) {
        console.error('Failed to load app config:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleToggleImages(value: boolean) {
    setEnableImages(value)
    try {
      await updateAppConfig({ enable_images: value })
      showToast('Saved')
    } catch (err) {
      console.error('Failed to save:', err)
      setEnableImages(!value)
      showToast('Failed to save')
    }
  }

  async function handleToggleBackgrounds(value: boolean) {
    setEnableBackgrounds(value)
    try {
      await updateAppConfig({ enable_backgrounds: value })
      showToast('Saved')
    } catch (err) {
      console.error('Failed to save:', err)
      setEnableBackgrounds(!value)
      showToast('Failed to save')
    }
  }

  async function handleToggleMap(value: boolean) {
    setEnableMap(value)
    try {
      await updateAppConfig({ enable_map: value })
      showToast('Saved')
    } catch (err) {
      console.error('Failed to save:', err)
      setEnableMap(!value)
      showToast('Failed to save')
    }
  }

  async function handleToggleLyricFlag(value: boolean) {
    setEnableLyricFlag(value)
    try {
      await updateAppConfig({ enable_lyric_flag: value })
      showToast('Saved')
    } catch (err) {
      console.error('Failed to save:', err)
      setEnableLyricFlag(!value)
      showToast('Failed to save')
    }
  }

  async function handleToggleImageFlag(value: boolean) {
    setEnableImageFlag(value)
    try {
      await updateAppConfig({ enable_image_flag: value })
      showToast('Saved')
    } catch (err) {
      console.error('Failed to save:', err)
      setEnableImageFlag(!value)
      showToast('Failed to save')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const maxGuess = parseInt(maxGuessCount, 10)
    const minSongLyric = parseInt(minSongLyricCount, 10)
    const topDistinctive = parseInt(topDistinctiveCount, 10)
    const maxDistinctive = parseInt(maxDistinctiveValue, 10)
    const min = parseInt(minImageCount, 10)
    const max = parseInt(maxImageCount, 10)
    if (isNaN(maxGuess) || isNaN(minSongLyric) || isNaN(topDistinctive) || isNaN(maxDistinctive) || isNaN(min) || isNaN(max)) {
      showToast('Counts must be valid numbers')
      return
    }
    if (max < min) {
      showToast('Max image count must be ≥ min image count')
      return
    }
    setSaving(true)
    try {
      await updateAppConfig({
        theme_primary_color: primaryColor,
        theme_secondary_color: secondaryColor,
        max_guess_count: maxGuess,
        min_song_lyric_count: minSongLyric,
        top_distinctive_count: topDistinctive,
        max_distinctive_value: maxDistinctive,
        min_image_count: min,
        max_image_count: max,
      })
      applyDefaultTheme(primaryColor, secondaryColor)
      showToast('Settings saved')
    } catch (err) {
      console.error('Failed to save:', err)
      showToast('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 5000)
  }

  if (loading) return <div className="text-neutral-500">Loading...</div>

  return (
    <>
      <AdminFormPage title="Settings" onSubmit={handleSubmit} loading={saving}>
        <div className="space-y-6">
          <h2 className="text-base font-semibold mb-3 text-neutral-600 uppercase tracking-wide text-xs">Default Themes</h2>
          <div className="grid grid-cols-2 gap-4 space-y-5">
            <FormField label="Primary Color">
              <ColorField value={primaryColor} onChange={setPrimaryColor} />
            </FormField>
            <FormField label="Secondary Color">
              <ColorField value={secondaryColor} onChange={setSecondaryColor} />
            </FormField>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-3 text-neutral-600 uppercase tracking-wide text-xs">Game Behavior</h2>
            <div className="space-y-4">
                <FormField label="Max Guess Count" required>
                  <input
                    type="number"
                    min={1}
                    value={maxGuessCount}
                    onChange={e => setMaxGuessCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
                  />
                </FormField>
                <FormField label="Min Song Lyric Count" required>
                  <input
                    type="number"
                    min={1}
                    value={minSongLyricCount}
                    onChange={e => setMinSongLyricCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
                  />
                </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Top Distinctive Count" required>
                  <input
                    type="number"
                    min={1}
                    value={topDistinctiveCount}
                    onChange={e => setTopDistinctiveCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
                  />
                </FormField>
                <FormField label="Max Distinctive Value" required>
                  <input
                    type="number"
                    min={1}
                    value={maxDistinctiveValue}
                    onChange={e => setMaxDistinctiveValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Min Image Count" required>
                  <input
                    type="number"
                    min={1}
                    value={minImageCount}
                    onChange={e => setMinImageCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
                  />
                </FormField>
                <FormField label="Max Image Count" required>
                  <input
                    type="number"
                    min={1}
                    value={maxImageCount}
                    onChange={e => setMaxImageCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-primary/30 rounded-lg bg-neutral-50 text-neutral-800 focus:outline-none focus:border-primary text-sm"
                  />
                </FormField>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Show Images</div>
                  <div className="text-xs text-neutral-500">Players see images for puzzle words</div>
                </div>
                <ToggleSwitch checked={enableImages} onChange={handleToggleImages} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Show Album Backgrounds</div>
                  <div className="text-xs text-neutral-500">Display album SVG pattern after album is guessed</div>
                </div>
                <ToggleSwitch checked={enableBackgrounds} onChange={handleToggleBackgrounds} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Enable Landmark Map</div>
                  <div className="text-xs text-neutral-500">Show the visual map feature to players</div>
                </div>
                <ToggleSwitch checked={enableMap} onChange={handleToggleMap} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Enable Lyric Flagging</div>
                  <div className="text-xs text-neutral-500">Players can flag puzzle words for review</div>
                </div>
                <ToggleSwitch checked={enableLyricFlag} onChange={handleToggleLyricFlag} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Enable Image Flagging</div>
                  <div className="text-xs text-neutral-500">Players can flag puzzle images for review</div>
                </div>
                <ToggleSwitch checked={enableImageFlag} onChange={handleToggleImageFlag} />
              </div>
            </div>
          </div>
        </div>
      </AdminFormPage>
      <Toast message={toast} />
    </>
  )
}
