import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognitionImpl =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const baseTranscriptRef = useRef('')

  useEffect(() => {
    if (!SpeechRecognitionImpl) return
    const recognition = new SpeechRecognitionImpl()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
        } else {
          interim += text
        }
      }
      if (final) {
        baseTranscriptRef.current = `${baseTranscriptRef.current} ${final}`.trim()
      }
      setTranscript(`${baseTranscriptRef.current} ${interim}`.trim())
    }

    recognition.onerror = (event) => {
      setError(event.error === 'no-speech' ? '' : `Speech recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    return () => {
      recognition.stop()
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError('')
    baseTranscriptRef.current = ''
    setTranscript('')
    recognitionRef.current.start()
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    baseTranscriptRef.current = ''
    setTranscript('')
  }, [])

  return {
    supported: Boolean(SpeechRecognitionImpl),
    listening,
    transcript,
    setTranscript,
    error,
    start,
    stop,
    reset,
  }
}
