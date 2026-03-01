import { motion } from 'motion/react'

interface GuessCounterProps {
  guessMessage: string | null
  guessCount: number
  allowedCount: number
}

export default function GuessCounter({ guessMessage, guessCount, allowedCount }: GuessCounterProps) {  
    return (
    <div className="flex flex-col gap-1 w-full text-xs text-gray-500">
        <div className="flex flex-row gap-2 items-center justify-center py-4">
            {guessMessage || "Guesses:"}
            {Array.from({ length: allowedCount }, (_, index) => {
                const isFlipped = index < guessCount;
                
                return (
                <div key={index} className="relative w-6 h-6 [perspective:1000px]">
                    <motion.div
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-full h-full relative [transform-style:preserve-3d]"
                    >
                    {/* Front Side (Blank/Remaining) */}
                    <div 
                        className="absolute inset-0 w-full h-full rounded-full bg-secondary shadow-inner [backface-visibility:hidden]" 
                    />

                    {/* Back Side (Number/Incorrect) */}
                    <div 
                        className="absolute inset-0 w-full h-full rounded-full bg-primary flex items-center justify-center text-white font-bold [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    >
                        {index + 1}
                    </div>
                    </motion.div>
                </div>
                );
            })}
        </div>
    </div>
  )
}
