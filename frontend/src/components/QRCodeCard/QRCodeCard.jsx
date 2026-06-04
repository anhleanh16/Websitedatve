export default function QRCodeCard({ qrCode }) {
  return (
    <div className="qr-code-card">
      <h4>Booking Confirmation</h4>
      <img src={qrCode} alt="QR Code" className="qr-image" />
      <p>Scan this QR code at the cinema</p>
    </div>
  );
}
