export const EVENT_CODE_PATTERN = /^[A-Z2-7]{16}$/
export const ATTENDEE_CODE_PATTERN = /^[0-9a-f]{64}$/

// Links look like /attendee/{event_code}/{attendee_code}, optionally with a trailing slash.
export function parsePassPath(pathname, base = '/attendee/') {
  if (!pathname.startsWith(base)) return null
  const parts = pathname.slice(base.length).split('/').filter(Boolean)
  if (parts.length !== 2) return null
  let eventCode
  let attendeeCode
  try {
    eventCode = decodeURIComponent(parts[0]).trim().toUpperCase()
    attendeeCode = decodeURIComponent(parts[1]).trim().toLowerCase()
  } catch {
    return null
  }
  if (!EVENT_CODE_PATTERN.test(eventCode) || !ATTENDEE_CODE_PATTERN.test(attendeeCode)) return null
  return { eventCode, attendeeCode }
}

export class PassNotFoundError extends Error {
  constructor() {
    super('This attendee link is not valid. Check that you opened the complete link from your invitation.')
    this.name = 'PassNotFoundError'
  }
}

async function getJson(path, signal) {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, signal })
  if (response.status === 404 || response.status === 422) throw new PassNotFoundError()
  if (!response.ok) throw new Error(`The server could not load your pass (${response.status}). Please try again.`)
  return response.json()
}

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isOptionalText = (value) => value == null || typeof value === 'string'
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())

export async function loadPass(eventCode, attendeeCode, signal) {
  const [event, attendee] = await Promise.all([
    getJson(`/api/v2/events/${encodeURIComponent(eventCode)}`, signal),
    getJson(`/api/v2/attendees/${encodeURIComponent(eventCode)}/${encodeURIComponent(attendeeCode)}`, signal),
  ])
  if (event?.code !== eventCode || !isText(event.name) || !isDate(event.start_date) || !isDate(event.end_date) ||
      !['street', 'zip', 'town', 'country'].every((key) => isOptionalText(event[key])) ||
      attendee?.code !== attendeeCode || attendee.event_code !== eventCode ||
      !isText(attendee.first_name) || !isText(attendee.last_name) || !isOptionalText(attendee.company)) {
    throw new Error('The server returned an unexpected response. Please try again.')
  }
  return { event, attendee }
}

function localDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateRange(start, end, locale = 'en-GB') {
  const format = (value, options) => new Intl.DateTimeFormat(locale, options).format(localDate(value))
  const full = { day: 'numeric', month: 'long', year: 'numeric' }
  if (start === end) return format(start, full)
  const [startYear, startMonth] = start.split('-')
  const [endYear, endMonth] = end.split('-')
  if (startYear === endYear && startMonth === endMonth) {
    return `${format(start, { day: 'numeric' })}–${format(end, full)}`
  }
  if (startYear === endYear) return `${format(start, { day: 'numeric', month: 'long' })} – ${format(end, full)}`
  return `${format(start, full)} – ${format(end, full)}`
}

export function eventLocation(event) {
  return [event.street, [event.zip, event.town].filter(Boolean).join(' '), event.country]
    .map((part) => part?.trim()).filter(Boolean).join(', ')
}
