import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PassNotFoundError, eventLocation, formatDateRange, loadPass, parsePassPath,
} from '../src/attendee-api.js'

const eventCode = 'LW6MOVT3IZAABDXE'
const attendeeCode = 'a'.repeat(64)
const event = {
  code: eventCode, name: 'Popperinge Bierfestival', start_date: '2026-10-24', end_date: '2026-10-25',
  street: null, zip: '8970', town: 'Poperinge', country: 'Belgium',
}
const attendee = {
  code: attendeeCode, event_code: eventCode, first_name: 'Ada', last_name: 'Lovelace', company: null,
}

test('reads the event and attendee codes from the link', () => {
  assert.deepEqual(parsePassPath(`/attendee/${eventCode}/${attendeeCode}`), { eventCode, attendeeCode })
  assert.deepEqual(parsePassPath(`/attendee/${eventCode.toLowerCase()}/${attendeeCode.toUpperCase()}/`),
    { eventCode, attendeeCode })
  for (const invalid of ['/attendee/', `/attendee/${eventCode}`, `/attendee/${eventCode}/abc`,
    `/attendee/${eventCode}/${attendeeCode}/extra`, `/other/${eventCode}/${attendeeCode}`, '/attendee/%E0%A4%A/x']) {
    assert.equal(parsePassPath(invalid), null, invalid)
  }
})

test('loads the event and attendee', async () => {
  const originalFetch = globalThis.fetch
  try {
    const urls = []
    globalThis.fetch = async (url) => {
      urls.push(url)
      return Response.json(url.includes('/attendees/') ? attendee : event)
    }
    assert.deepEqual(await loadPass(eventCode, attendeeCode), { event, attendee })
    assert.deepEqual(urls.sort(), [`/api/v2/attendees/${eventCode}/${attendeeCode}`, `/api/v2/events/${eventCode}`])

    globalThis.fetch = async (url) => url.includes('/attendees/')
      ? Response.json({ detail: 'Attendee not found' }, { status: 404 }) : Response.json(event)
    await assert.rejects(loadPass(eventCode, attendeeCode), PassNotFoundError)

    globalThis.fetch = async () => Response.json({}, { status: 500 })
    await assert.rejects(loadPass(eventCode, attendeeCode), /could not load your pass \(500\)/)

    globalThis.fetch = async (url) => Response.json(url.includes('/attendees/') ? { ...attendee, event_code: 'X' } : event)
    await assert.rejects(loadPass(eventCode, attendeeCode), /unexpected response/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('formats event dates and location', () => {
  assert.equal(formatDateRange('2026-10-24', '2026-10-24'), '24 October 2026')
  assert.equal(formatDateRange('2026-10-24', '2026-10-25'), '24–25 October 2026')
  assert.equal(formatDateRange('2026-10-30', '2026-11-01'), '30 October – 1 November 2026')
  assert.equal(formatDateRange('2026-12-31', '2027-01-01'), '31 December 2026 – 1 January 2027')
  assert.equal(eventLocation(event), '8970 Poperinge, Belgium')
  assert.equal(eventLocation({ street: ' ', zip: null, town: null, country: null }), '')
})
