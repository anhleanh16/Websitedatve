import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER || ''

let transporter = null

const hasSmtpConfig = () => Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM)

export const isEmailVerificationConfigured = () => hasSmtpConfig()

const getTransporter = () => {
    if (transporter) return transporter
    if (!hasSmtpConfig()) return null

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
        },
    })

    return transporter
}

const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

const buildEmailLayout = ({
    preheader,
    headline,
    greetingName,
    intro,
    ctaLabel,
    ctaUrl,
    ctaColor,
    ttlMinutes,
    helperTitle,
    helperText,
    helperBg,
}) => {
    const safeHeadline = escapeHtml(headline)
    const safeName = escapeHtml(greetingName)
    const safeIntro = escapeHtml(intro)
    const safeCtaLabel = escapeHtml(ctaLabel)
    const safeCtaUrl = String(ctaUrl || '#')
    const safeHelperTitle = escapeHtml(helperTitle)
    const safeHelperText = escapeHtml(helperText)
    const safePreheader = escapeHtml(preheader)
    const safeTtl = Number(ttlMinutes || 5)

return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
    <div style="margin:0;padding:0;background:#0b1220;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
        <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
                <td style="background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);padding:24px 28px;color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;opacity:0.95;">Sweetstar Movie</p>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">${safeHeadline}</h1>
                </td>
            </tr>

            <tr>
                <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;color:#111827;">Xin chào ${safeName},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">${safeIntro}</p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
                    <tr>
                    <td style="border-radius:10px;background:${ctaColor};">
                        <a href="${safeCtaUrl}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">${safeCtaLabel}</a>
                    </td>
                    </tr>
                </table>

                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
                    <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6;">
                    Liên kết chỉ có hiệu lực trong <strong>${safeTtl} phút</strong>. Vui lòng thao tác sớm để không bị hết hạn.
                    </p>
                </div>

                <div style="background:${helperBg};border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin:0 0 20px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">${safeHelperTitle}</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563;">${safeHelperText}</p>
                </div>

                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">Nếu nút không hoạt động, bạn có thể dán liên kết sau vào trình duyệt:</p>
                <p style="margin:0 0 20px;font-size:12px;line-height:1.6;word-break:break-all;color:#2563eb;">${safeCtaUrl}</p>

                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Sweetstar Movie Team<br/>Chúc bạn có trải nghiệm điện ảnh thật tuyệt vời.</p>
                </td>
            </tr>

            <tr>
                <td style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">Email giao dịch tự động từ Sweetstar Movie. Vui lòng không trả lời trực tiếp email này.</p>
                </td>
            </tr>
            </table>
        </td>
        </tr>
    </table>
    </div>
`
}

const buildVerificationEmailText = ({ fullName, verifyUrl, ttlMinutes }) => {
    const safeName = String(fullName || 'bạn')
    const safeUrl = String(verifyUrl || '#')
    const safeTtl = Number(ttlMinutes || 5)

    return [
        `Xin chào ${safeName},`,
        '',
        'Cảm ơn bạn đã đăng ký tài khoản Sweetstar Movie.',
        `Vui lòng xác minh email trong vòng ${safeTtl} phút tại liên kết sau:`,
        safeUrl,
        '',
        'Nếu bạn không thực hiện thao tác này, hãy bỏ qua email.',
        '',
        'Sweetstar Movie Team',
    ].join('\n')
}

const buildPasswordResetEmailText = ({ fullName, resetUrl, ttlMinutes }) => {
    const safeName = String(fullName || 'bạn')
    const safeUrl = String(resetUrl || '#')
    const safeTtl = Number(ttlMinutes || 5)

    return [
        `Xin chào ${safeName},`,
        '',
        'Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản Sweetstar Movie của bạn.',
        `Liên kết đặt lại mật khẩu có hiệu lực trong ${safeTtl} phút:`,
        safeUrl,
        '',
        'Nếu bạn không yêu cầu thao tác này, hãy đổi mật khẩu và kiểm tra bảo mật tài khoản.',
        '',
        'Sweetstar Movie Team',
    ].join('\n')
}

const buildEmailChangeOtpText = ({ fullName, otpCode, ttlMinutes }) => {
    const safeName = String(fullName || 'bạn')
    const safeCode = String(otpCode || '')
    const safeTtl = Number(ttlMinutes || 5)

    return [
        `Xin chào ${safeName},`,
        '',
        'Bạn đang yêu cầu đổi email tài khoản Sweetstar Movie.',
        `Mã OTP xác minh của bạn là: ${safeCode}`,
        `Mã có hiệu lực trong ${safeTtl} phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
        '',
        'Nếu bạn không thực hiện thao tác này, hãy bỏ qua email.',
        '',
        'Sweetstar Movie Team',
    ].join('\n')
}

const buildVerificationEmailHtml = ({ fullName, verifyUrl, ttlMinutes }) => {
    return buildEmailLayout({
        preheader: 'Kích hoạt tài khoản Sweetstar Movie chỉ trong vài giây.',
        headline: 'Xác minh email để mở toàn bộ ưu đãi thành viên',
        greetingName: fullName,
        intro:
        'Chỉ còn một bước nữa để hoàn tất đăng ký. Sau khi xác minh, bạn sẽ nhận được đầy đủ tính năng đặt vé nhanh, tích điểm và ưu đãi cá nhân hóa.',
        ctaLabel: 'Xác minh email ngay',
        ctaUrl: verifyUrl,
        ctaColor: '#2563eb',
        ttlMinutes,
        helperTitle: 'Lưu ý bảo mật',
        helperText: 'Nếu bạn không tạo tài khoản này, hãy bỏ qua email. Đội ngũ chúng tôi sẽ không kích hoạt tài khoản nếu không có xác minh từ bạn.',
        helperBg: '#f8fafc',
    })
}

const buildPasswordResetEmailHtml = ({ fullName, resetUrl, ttlMinutes }) => {
    return buildEmailLayout({
        preheader: 'Đặt lại mật khẩu Sweetstar Movie an toàn trong 5 phút.',
        headline: 'Khôi phục tài khoản của bạn ngay',
        greetingName: fullName,
        intro:
        'Yêu cầu đặt lại mật khẩu đã được ghi nhận. Hãy nhấn nút bên dưới để tạo mật khẩu mới và tiếp tục trải nghiệm xem phim không gián đoạn.',
        ctaLabel: 'Đặt lại mật khẩu',
        ctaUrl: resetUrl,
        ctaColor: '#dc2626',
        ttlMinutes,
        helperTitle: 'Bạn không yêu cầu thao tác này?',
        helperText: 'Hãy bỏ qua email này và cân nhắc đổi mật khẩu hiện tại để tăng bảo mật tài khoản.',
        helperBg: '#fff7f7',
    })
}

const buildEmailChangeOtpEmailHtml = ({ fullName, otpCode, ttlMinutes }) => {
        const safeCode = escapeHtml(otpCode)
        const safeTtl = Number(ttlMinutes || 5)

        return `
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Mã OTP xác minh đổi email Sweetstar Movie.</div>
        <div style="margin:0;padding:0;background:#0b1220;font-family:Arial,sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;">
                            <tr>
                                <td style="background:linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%);padding:24px 28px;color:#ffffff;">
                                    <p style="margin:0;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;opacity:0.95;">Sweetstar Movie</p>
                                    <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">Xác minh đổi email tài khoản</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:28px;">
                                    <p style="margin:0 0 14px;font-size:16px;color:#111827;">Xin chào ${escapeHtml(fullName)},</p>
                                    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">Bạn vừa yêu cầu đổi email cho tài khoản Sweetstar Movie. Vui lòng nhập mã OTP bên dưới để hoàn tất xác minh.</p>

                                    <div style="margin:0 0 18px;padding:16px 18px;border:1px dashed #60a5fa;border-radius:12px;background:#eff6ff;text-align:center;">
                                        <p style="margin:0 0 6px;font-size:13px;color:#1d4ed8;letter-spacing:0.5px;text-transform:uppercase;font-weight:700;">Mã OTP của bạn</p>
                                        <p style="margin:0;font-size:36px;line-height:1.1;color:#1e3a8a;font-weight:800;letter-spacing:6px;">${safeCode}</p>
                                    </div>

                                    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
                                        <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6;">Mã OTP chỉ có hiệu lực trong <strong>${safeTtl} phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
                                    </div>

                                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Nếu bạn không thực hiện thao tác này, hãy bỏ qua email để giữ an toàn cho tài khoản.</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                                    <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">Email giao dịch tự động từ Sweetstar Movie. Vui lòng không trả lời trực tiếp email này.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        `
}

export const sendVerificationEmail = async ({ toEmail, fullName, verifyUrl, ttlMinutes }) => {
    const mailTransporter = getTransporter()
    if (!mailTransporter) {
        throw new Error('Thiếu cấu hình SMTP để gửi email xác minh.')
    }

    await mailTransporter.sendMail({
        from: EMAIL_FROM,
        to: String(toEmail || '').trim(),
        subject: 'Kích hoạt tài khoản Sweetstar Movie trong 5 phút',
        text: buildVerificationEmailText({ fullName, verifyUrl, ttlMinutes }),
        html: buildVerificationEmailHtml({ fullName, verifyUrl, ttlMinutes }),
    })
    }

    export const sendPasswordResetEmail = async ({ toEmail, fullName, resetUrl, ttlMinutes }) => {
    const mailTransporter = getTransporter()
    if (!mailTransporter) {
        throw new Error('Thiếu cấu hình SMTP để gửi email đặt lại mật khẩu.')
    }

    await mailTransporter.sendMail({
        from: EMAIL_FROM,
        to: String(toEmail || '').trim(),
        subject: 'Đặt lại mật khẩu Sweetstar Movie trong 5 phút',
        text: buildPasswordResetEmailText({ fullName, resetUrl, ttlMinutes }),
        html: buildPasswordResetEmailHtml({ fullName, resetUrl, ttlMinutes }),
    })
}

export const sendEmailChangeOtpEmail = async ({ toEmail, fullName, otpCode, ttlMinutes }) => {
    const mailTransporter = getTransporter()
    if (!mailTransporter) {
        throw new Error('Thiếu cấu hình SMTP để gửi OTP đổi email.')
    }

    await mailTransporter.sendMail({
        from: EMAIL_FROM,
        to: String(toEmail || '').trim(),
        subject: 'Mã OTP đổi email Sweetstar Movie',
        text: buildEmailChangeOtpText({ fullName, otpCode, ttlMinutes }),
        html: buildEmailChangeOtpEmailHtml({ fullName, otpCode, ttlMinutes }),
    })
}
