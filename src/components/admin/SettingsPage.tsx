import { useState, useEffect } from 'react'
import { useAdminBreadcrumbs } from './AdminBreadcrumbContext'
import AdminFormPage from './AdminFormPage'
import FormField from './FormField'
import ColorField from './ColorField'
import ToggleSwitch from './ToggleSwitch'
import Toast from '../common/Toast'
import { getAppConfig, updateAppConfig } from '../../services/adminService'

function applyDefaultTheme(primary: string, secondary: string, background: string) {
  document.documentElement.style.setProperty('--color-theme-primary', primary)
  document.documentElement.style.setProperty('--color-theme-secondary', secondary)
  document.documentElement.style.setProperty('--color-theme-bg', background)
}

export default function SettingsPage() {
  const { setBreadcrumbs } = useAdminBreadcrumbs()

  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [enableImages, setEnableImages] = useState(true)
  const [enableLyricFlag, setEnableLyricFlag] = useState(true)
  const [enableImageFlag, setEnableImageFlag] = useState(true)
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
        setBackgroundColor(config.theme_background_color)
        setEnableImages(config.enable_images)
        setEnableLyricFlag(config.enable_lyric_flag)
        setEnableImageFlag(config.enable_image_flag)
        applyDefaultTheme(config.theme_primary_color, config.theme_secondary_color, config.theme_background_color)
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
    setSaving(true)
    try {
      await updateAppConfig({
        theme_primary_color: primaryColor,
        theme_secondary_color: secondaryColor,
        theme_background_color: backgroundColor,
      })
      applyDefaultTheme(primaryColor, secondaryColor, backgroundColor)
      showToast('Colors saved')
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

  if (loading) return <div className="text-text/60">Loading...</div>

  return (
    <>
      <AdminFormPage title="Settings" onSubmit={handleSubmit} loading={saving}>
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold mb-3 text-text/70 uppercase tracking-wide text-xs">Default Theme Colors</h2>
            <div className="space-y-5">
              <FormField label="Primary Color">
                <ColorField value={primaryColor} onChange={setPrimaryColor} />
              </FormField>
              <FormField label="Secondary Color">
                <ColorField value={secondaryColor} onChange={setSecondaryColor} />
              </FormField>
              <FormField label="Background Color">
                <ColorField value={backgroundColor} onChange={setBackgroundColor} />
              </FormField>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-3 text-text/70 uppercase tracking-wide text-xs">Game Behavior</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Show Images</div>
                  <div className="text-xs text-text/60">Players see images for puzzle words</div>
                </div>
                <ToggleSwitch checked={enableImages} onChange={handleToggleImages} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Enable Lyric Flagging</div>
                  <div className="text-xs text-text/60">Players can flag puzzle words for review</div>
                </div>
                <ToggleSwitch checked={enableLyricFlag} onChange={handleToggleLyricFlag} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Enable Image Flagging</div>
                  <div className="text-xs text-text/60">Players can flag puzzle images for review</div>
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
