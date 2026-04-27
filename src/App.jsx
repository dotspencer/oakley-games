import { useEffect, useMemo, useRef, useState } from 'react'

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function shuffleArray(list) {
  const shuffled = [...list]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function createConfettiBurst() {
  const colors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#577590']
  return Array.from({ length: 100 }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    left: Math.random() * 100,
    delay: Math.random() * 0.2,
    duration: 1.4 + Math.random() * 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotate: Math.random() * 720,
    xOffset: (Math.random() - 0.5) * 260,
  }))
}

export default function App() {
  const [stage, setStage] = useState('start')
  const [picked, setPicked] = useState([])
  const [target, setTarget] = useState(null)
  const [message, setMessage] = useState('Tap the speaker to hear a number.')
  const [confetti, setConfetti] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [recentlyCorrect, setRecentlyCorrect] = useState(null)
  const [recentlyIncorrect, setRecentlyIncorrect] = useState(null)
  const activeAudioRef = useRef(null)

  const numbers = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), [])
  const [numberOrder, setNumberOrder] = useState(() => shuffleArray(numbers))
  const remaining = numbers.filter((n) => !picked.includes(n))

  const resetToStart = () => {
    activeAudioRef.current?.pause()
    activeAudioRef.current = null
    setStage('start')
    setPicked([])
    setTarget(null)
    setShowSuccess(false)
    setRecentlyCorrect(null)
    setRecentlyIncorrect(null)
    setMessage('Tap the speaker to hear a number.')
    setConfetti([])
  }

  const startGame = () => {
    setStage('play')
    setPicked([])
    setTarget(null)
    setShowSuccess(false)
    setRecentlyCorrect(null)
    setRecentlyIncorrect(null)
    setMessage('Tap the speaker to hear a number.')
    setNumberOrder(shuffleArray(numbers))
  }

  const reshuffleBoard = () => {
    setNumberOrder(shuffleArray(numbers))
  }

  const playClip = (src) => {
    activeAudioRef.current?.pause()
    const audio = new Audio(src)
    activeAudioRef.current = audio
    return new Promise((resolve) => {
      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      audio.play().catch(() => resolve())
    })
  }

  const playNumberClip = (n) => playClip(`/oakley-games/audio/${n}.m4a`)

  const playIncorrectClip = async (correctNumber) => {
    await playClip('/oakley-games/audio/sorry.m4a')
    await playNumberClip(correctNumber)
  }

  const promptNumber = () => {
    if (stage !== 'play') return
    if (recentlyIncorrect !== null) return
    // Replay the same target until it's answered correctly.
    if (target !== null) {
      setMessage('Find the number!')
      playNumberClip(target)
      return
    }

    if (!remaining.length) return
    const next = randomFrom(remaining)
    setTarget(next)
    setMessage('Find the number!')
    playNumberClip(next)
  }

  const handlePick = (n) => {
    if (stage !== 'play') return
    if (target === null) {
      setMessage('Tap the speaker first!')
      return
    }

    if (n === target) {
      const updated = picked.includes(n) ? picked : [...picked, n]
      setPicked(updated)
      setShowSuccess(true)
      setRecentlyIncorrect(null)
      setRecentlyCorrect(n)
      setConfetti(createConfettiBurst())
      setTimeout(() => setConfetti([]), 1700)
      setTimeout(() => {
        setRecentlyCorrect(null)
        setShowSuccess(false)
        reshuffleBoard()
      }, 2200)

      if (updated.length === 10) {
        setStage('win')
        setMessage('Amazing! You found all numbers.')
        setTarget(null)
      } else {
        setTarget(null)
        setMessage('Great job! Tap speaker for the next number.')
      }
    } else {
      const correctNumber = target
      setRecentlyIncorrect(correctNumber)
      setMessage(`The number is ${correctNumber}. Restarting...`)
      playIncorrectClip(correctNumber)
      setTarget(null)
      setShowSuccess(false)
      setTimeout(() => {
        resetToStart()
      }, 6000)
    }
  }

  useEffect(() => {
    return () => {
      activeAudioRef.current?.pause()
    }
  }, [])

  return (
    <main className={`app app--${stage} ${showSuccess ? 'app--correct' : ''}`}>
      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="confetti"
          style={{
            left: `${piece.left}%`,
            '--delay': `${piece.delay}s`,
            '--duration': `${piece.duration}s`,
            '--color': piece.color,
            '--rotate': `${piece.rotate}deg`,
            '--x-offset': `${piece.xOffset}px`,
          }}
        />
      ))}

      {stage === 'start' && (
        <section className="card center">
          <h1>Number Game 1-10</h1>
          <button className="big-button" onClick={startGame}>
            Start Game
          </button>
        </section>
      )}

      {stage === 'play' && (
        <section className="card">
          <p className="status">{message}</p>
          <button
            className="speaker"
            onClick={promptNumber}
            aria-label="Play random number"
            disabled={recentlyIncorrect !== null}
          >
            🔊
          </button>
          <div className="grid">
            {numberOrder.map((n) => (
              <button
                key={n}
                className={`number ${recentlyCorrect === n ? 'number--flash' : ''} ${recentlyIncorrect === n ? 'number--target' : ''}`}
                onClick={() => handlePick(n)}
                disabled={(target === null && recentlyCorrect === n) || recentlyIncorrect !== null}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="dot-progress" aria-label="Progress indicator">
            {numbers.map((n, index) => (
              <span
                key={`dot-${n}`}
                className={`progress-dot ${index < picked.length ? 'progress-dot--done' : ''}`}
              />
            ))}
          </div>
          <p className="progress">Found: {picked.length} / 10</p>
        </section>
      )}

      {stage === 'win' && (
        <section className="card center certificate">
          <h1>Number Star Certificate</h1>
          <p>This certifies that</p>
          <h2>Super Number Learner</h2>
          <p>found every number from 1 to 10.</p>
          <p className="treat">Reward: A treat of your choice!</p>
          <button className="big-button" onClick={resetToStart}>
            Play Again
          </button>
        </section>
      )}
    </main>
  )
}
