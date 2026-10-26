import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { PassNotFoundError, eventLocation, formatDateRange, loadPass, parsePassPath } from './attendee-api.js'

function Message({ title, children }) {
  return (
    <section className="card message" aria-labelledby="message-heading">
      <h1 id="message-heading">{title}</h1>
      {children}
    </section>
  )
}

function AttendeePass({ event, attendee }) {
  const name = `${attendee.first_name} ${attendee.last_name}`
  const location = eventLocation(event)
  return (
    <article className="card pass" aria-labelledby="attendee-name">
      <header className="pass-event">
        <p className="eyebrow">Your check-in pass</p>
        <h2>{event.name}</h2>
        <p>
          <time dateTime={event.start_date}>{formatDateRange(event.start_date, event.end_date)}</time>
        </p>
        {location && <p>{location}</p>}
      </header>
      <div className="pass-attendee">
        <h1 id="attendee-name">{name}</h1>
        {attendee.company && <p>{attendee.company}</p>}
      </div>
      <QRCodeSVG
        className="qr-code"
        value={attendee.code}
        size={280}
        level="M"
        marginSize={4}
        bgColor="#ffffff"
        fgColor="#000000"
        title={`Check-in QR code for ${name}`}
      />
      <p className="pass-hint">Show this code at the check-in desk to get your name tag.</p>
    </article>
  )
}

export default function App() {
  const [codes] = useState(() => parsePassPath(window.location.pathname))
  const [pass, setPass] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!codes) return undefined
    const controller = new AbortController()
    loadPass(codes.eventCode, codes.attendeeCode, controller.signal)
      .then((result) => setPass(result))
      .catch((cause) => {
        if (controller.signal.aborted) return
        setError(cause instanceof TypeError
          ? { message: 'Unable to connect. Check your internet connection and try again.', retry: true }
          : { message: cause.message, retry: !(cause instanceof PassNotFoundError) })
      })
    return () => controller.abort()
  }, [codes, attempt])

  useEffect(() => {
    document.title = pass ? `${pass.event.name} | Check-in pass` : 'Onsite Print | Check-in pass'
  }, [pass])

  return (
    <div className="page">
      <header className="site-header">
        <span className="brand" role="img" aria-label="Onsite Print">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-name" aria-hidden="true">ONSITE<br />PRINT</span>
        </span>
        <a className="site-link" href="https://onsiteprint.dk" rel="noreferrer">onsiteprint.dk</a>
      </header>
      <main>
        {!codes ? (
          <Message title="Open your personal link">
            <p>Use the link from your event invitation to see your check-in pass.</p>
          </Message>
        ) : error ? (
          <Message title="Your pass could not be shown">
            <p role="alert">{error.message}</p>
            {error.retry && (
              <button type="button" onClick={() => { setError(null); setAttempt((value) => value + 1) }}>
                Try again
              </button>
            )}
          </Message>
        ) : pass ? (
          <AttendeePass event={pass.event} attendee={pass.attendee} />
        ) : (
          <p className="loading" role="status">Loading your pass...</p>
        )}
      </main>
    </div>
  )
}
