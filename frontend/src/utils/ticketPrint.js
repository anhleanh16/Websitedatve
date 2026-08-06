const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const qrUrl = (value) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=111827&margin=2`;

const buildFoodQr = (booking) => {
  const combos = Array.isArray(booking.combos) ? booking.combos : [];
  if (!combos.length) return "";
  const items = combos.map((combo) => {
    const options = [combo.selected_popcorn_type, combo.selected_drink_type].filter(Boolean).join(" / ");
    return `${Number(combo.quantity || 0)}x ${combo.combo_name || combo.name || "Combo"}${options ? ` (${options})` : ""}`;
  }).join(" | ");
  return ["SWEETSTAR-FOOD", `BOOKING:${booking.bookingCode}`, `ITEMS:${items}`].join("\n");
};

export const printTicketPdf = (booking) => {
  const printWindow = window.open("", "_blank", "width=900,height=800");
  if (!printWindow) throw new Error("Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup rồi thử lại.");

  const qrCodes = Array.isArray(booking.qrCodes) && booking.qrCodes.length
    ? booking.qrCodes
    : (booking.qrCode ? [booking.qrCode] : []);
  const seatCodes = Array.isArray(booking.seats) ? booking.seats : [];
  const foodQr = buildFoodQr(booking);
  const ticketQrs = qrCodes.map((code, index) => `
    <article class="qr-card">
      <h3>QR vé ${escapeHtml(seatCodes[index] || `#${index + 1}`)}</h3>
      <img src="${qrUrl(code)}" alt="QR vé" />
      <p>${escapeHtml(code)}</p>
    </article>`).join("");
  const comboLines = (booking.combos || []).map((combo) => {
    const options = [combo.selected_popcorn_type, combo.selected_drink_type].filter(Boolean).join(" • ");
    return `<li>${escapeHtml(`${Number(combo.quantity || 0)}x ${combo.combo_name || combo.name || "Combo"}${options ? ` (${options})` : ""}`)}</li>`;
  }).join("");

  printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8" /><title>Vé ${escapeHtml(booking.bookingCode)}</title>
    <style>
      *{box-sizing:border-box} body{margin:0;padding:28px;background:#f3f4f6;color:#111827;font:14px Arial,sans-serif}.ticket{max-width:790px;margin:auto;background:#fff;border:1px solid #ddd;border-radius:18px;overflow:hidden}.head{padding:24px 28px;background:linear-gradient(135deg,#312e81,#6d28d9);color:#fff}.head h1{font-size:24px;margin:0 0 6px}.code{font-size:13px;letter-spacing:1px;opacity:.9}.content{padding:25px 28px}.movie{font-size:22px;font-weight:700;margin:0 0 18px}.info{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;padding:16px 0;border-top:1px dashed #cbd5e1;border-bottom:1px dashed #cbd5e1}.info span{display:block;color:#64748b;font-size:12px;margin-bottom:3px}.info strong{font-size:14px}.section{margin-top:22px}.section h2{font-size:16px;margin:0 0 10px}.combos{margin:0;padding-left:18px;line-height:1.7}.qrs{display:flex;flex-wrap:wrap;gap:16px}.qr-card{width:220px;text-align:center;border:1px solid #dbeafe;border-radius:12px;padding:13px;background:#f8fbff;break-inside:avoid}.qr-card.food{border-color:#fcd34d;background:#fffbeb}.qr-card h3{font-size:14px;margin:0 0 10px}.qr-card img{width:170px;height:170px;background:#fff}.qr-card p{margin:8px 0 0;color:#475569;font:10px monospace;word-break:break-all}.note{margin-top:22px;padding:12px 14px;border-radius:10px;background:#f1f5f9;color:#475569;font-size:12px}@media print{body{padding:0;background:#fff}.ticket{border:0;border-radius:0}.head{print-color-adjust:exact;-webkit-print-color-adjust:exact}.qr-card{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><main class="ticket"><header class="head"><h1>Sweetstar Movie — Vé xem phim</h1><div class="code">Mã đặt vé: ${escapeHtml(booking.bookingCode)}</div></header><section class="content"><h2 class="movie">${escapeHtml(booking.movie)}</h2><div class="info"><div><span>Rạp / Phòng</span><strong>${escapeHtml(booking.cinema)}${booking.room ? ` · ${escapeHtml(booking.room)}` : ""}</strong></div><div><span>Suất chiếu</span><strong>${escapeHtml(booking.showtime)}</strong></div><div><span>Ghế</span><strong>${escapeHtml(seatCodes.join(", ") || "—")}</strong></div><div><span>Khách hàng</span><strong>${escapeHtml(booking.user)}</strong></div></div>${comboLines ? `<section class="section"><h2>Bắp nước / Combo</h2><ul class="combos">${comboLines}</ul></section>` : ""}<section class="section"><h2>Mã QR</h2><div class="qrs">${ticketQrs}${foodQr ? `<article class="qr-card food"><h3>QR nhận bắp nước / combo</h3><img src="${qrUrl(foodQr)}" alt="QR bắp nước và combo" /><p>Dùng tại quầy đồ ăn</p></article>` : ""}</div></section><p class="note">QR vé dùng để check-in vào rạp. QR bắp nước / combo dùng riêng tại quầy đồ ăn.</p></section></main><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`);
  printWindow.document.close();
};
