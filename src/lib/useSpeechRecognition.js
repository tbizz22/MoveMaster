import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognitionImpl =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

function joinPhrases(...parts) {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ')
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  // Text finalized in a prior listening session (before an explicit stop()).
  const committedRef = useRef('')
  // Text finalized within the current listening session.
  const sessionFinalRef = useRef('')

  useEffect(() => {
    if (!SpeechRecognitionImpl) return
    const recognition = new SpeechRecognitionImpl()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      // Rebuild the current session's final text from the full results list
      // every time, rather than appending deltas via event.resultIndex.
      // Chrome's continuous mode periodically restarts its internal session
      // without firing onend and replays already-finalized results from
      // index 0 — appending those again caused dictated text to echo/duplicate.
      // Each final result is a phrase the recognizer segmented at a pause, so
      // join them with commas — that's what lets the item parser split them.
      let interim = ''
      const finals = []
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim()
        if (event.results[i].isFinal) {
          if (text) finals.push(text)
        } else {
          interim += text
        }
      }
      sessionFinalRef.current = finals.join(', ')
      setTranscript(joinPhrases(committedRef.current, sessionFinalRef.current, interim))
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setError('')
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError(
          window.isSecureContext
            ? 'Microphone access was blocked. Allow the microphone for this site in your browser settings, then tap Resume.'
            : 'Microphone access requires HTTPS. Open this app via an https:// address.',
        )
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    return () => {
      recognition.stop()
    }
  }, [])

  // Starts fresh, discarding any prior transcript (first mic-open of a dictation).
  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError('')
    committedRef.current = ''
    sessionFinalRef.current = ''
    setTranscript('')
    recognitionRef.current.start()
    setListening(true)
  }, [])

  // Resumes listening without discarding transcript already captured (e.g. after Stop).
  const resume = useCallback(() => {
    if (!recognitionRef.current) return
    setError('')
    committedRef.current = joinPhrases(committedRef.current, sessionFinalRef.current)
    sessionFinalRef.current = ''
    recognitionRef.current.start()
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    committedRef.current = ''
    sessionFinalRef.current = ''
    setTranscript('')
  }, [])

  return {
    supported: Boolean(SpeechRecognitionImpl),
    listening,
    transcript,
    setTranscript,
    error,
    start,
    resume,
    stop,
    reset,
  }
}
