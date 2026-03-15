interface ImageDisplayProps {
  imageUrls: string[]
  currentIndex: number
}

export default function ImageDisplay({ imageUrls, currentIndex }: ImageDisplayProps) {
  if (imageUrls.length === 0) {
    return (
      <div className="w-full aspect-square bg-secondary rounded-xl flex items-center justify-center">
        <span className="text-neutral-400 text-sm">no image</span>
      </div>
    )
  }

  return (
    <div className="w-full aspect-square rounded-xl overflow-hidden bg-secondary">
      <img
        src={imageUrls[currentIndex]}
        alt="Puzzle clue"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  )
}
