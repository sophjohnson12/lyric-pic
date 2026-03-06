interface AlbumIconProps {
  album: {
    name: string
    image_url: string | null
    theme_primary_color: string | null
    theme_secondary_color: string | null
  }
  size?: 'sm' | 'lg'
}

function getInitials(name: string): string {
  return name
    .split(/[\s:]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

export default function AlbumIcon({ album, size = 'sm' }: AlbumIconProps) {
  const isLg = size === 'lg'
  return (
    <div
      className={`${isLg ? 'w-12 h-12' : 'w-7 h-7'} rounded-lg flex items-center justify-center text-white shrink-0 overflow-hidden`}
      style={{
        backgroundColor: album.theme_primary_color || '#6b7280',
        border: 'solid',
        borderWidth: '1px',
        borderColor: album.theme_secondary_color || '#9ca3af',
        fontSize: isLg ? '12px' : '10px',
        fontWeight: 'bold',
      }}
    >
      {album.image_url ? (
        <img
          src={album.image_url}
          alt={album.name}
          style={{ width: isLg ? 30 : 15, height: isLg ? 30 : 15, objectFit: 'contain' }}
        />
      ) : (
        getInitials(album.name)
      )}
    </div>
  )
}
