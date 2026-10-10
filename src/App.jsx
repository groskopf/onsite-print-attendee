import { QRCodeSVG } from 'qrcode.react'

export default function App() {
  return (
    <main>
      <img className="react-logo" src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" width="96" height="96" />
      <h1>Hello World</h1>
      <p>Onsite Print Attendee</p>
      <QRCodeSVG
        className="qr-code"
        value={window.location.href}
        size={240}
        marginSize={4}
        title="QR code for this page"
      />
    </main>
  )
}