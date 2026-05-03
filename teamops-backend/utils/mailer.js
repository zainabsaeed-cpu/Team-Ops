const nodemailer = require('nodemailer');

let _transporter = null;
let _isEthereal = false;

const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const emailShell = ({ title, heading, body, ctaLabel, ctaUrl, footerNote, extraHtml = '' }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c5cfc,#06b6d4);padding:32px 40px;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">TeamOps</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Team collaboration platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:20px;font-weight:700;">${heading}</h2>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">${body}</p>
              ${extraHtml}
              ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#06b6d4);border-radius:12px;padding:14px 28px;margin-bottom:24px;color:#ffffff;text-decoration:none;font-weight:700;">${ctaLabel}</a>` : ''}
              ${footerNote ? `<p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">${footerNote}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">&copy; ${new Date().getFullYear()} TeamOps. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function getTransporter() {
    if (_transporter) return _transporter;

  if (process.env.EMAIL_HOST) {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
      auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      } : undefined,
    });
    _isEthereal = false;
    console.log('📧 Mailer: using custom SMTP transport');
    return _transporter;
  }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        _transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        _isEthereal = false;
        console.log('📧 Mailer: using Gmail SMTP');
    } else {
        const testAccount = await nodemailer.createTestAccount();
        _transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        _isEthereal = true;
        console.log('📧 Mailer: no EMAIL_USER/EMAIL_PASS found — using Ethereal test account');
    }

    return _transporter;
}

async function sendVerificationEmail(toEmail, otp) {
    const transporter = await getTransporter();
    const verificationUrl = `${frontendBaseUrl}/login?email=${encodeURIComponent(toEmail)}`;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"TeamOps" <no-reply@teamops.dev>`,
        to: toEmail,
        subject: 'Your TeamOps verification code',
        html: emailShell({
            title: 'Your verification code',
            heading: 'Your verification code',
            body: `Enter this code on the TeamOps sign-up page to activate your account.`,
            ctaLabel: 'Open TeamOps',
            ctaUrl: verificationUrl,
      extraHtml: `<div style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#06b6d4);border-radius:12px;padding:20px 40px;margin-bottom:24px;"><span style="color:#ffffff;font-size:36px;font-weight:800;letter-spacing:10px;">${otp}</span></div>`,
      footerNote: `Your code is: <strong>${otp}</strong>. It expires in <strong>24 hours</strong>. If you didn't create a TeamOps account, you can safely ignore this email.`,
    }),
        text: `Your TeamOps verification code is: ${otp}\n\nThis code expires in 24 hours.`,
    });

    if (_isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`\n📧 ETHEREAL PREVIEW (open in browser to see the email):\n👉  ${previewUrl}\n`);
    } else {
        console.log(`📧 Verification email sent to ${toEmail} (messageId: ${info.messageId})`);
    }

    return info;
}

async function sendInvitationEmail(toEmail, inviteCode, workspaceName = 'TeamOps Workspace') {
    const transporter = await getTransporter();
    const inviteUrl = `${frontendBaseUrl}/register?inviteCode=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(toEmail)}`;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"TeamOps" <no-reply@teamops.dev>`,
        to: toEmail,
        subject: `You're invited to ${workspaceName} on TeamOps`,
        html: emailShell({
            title: `Invite to ${workspaceName}`,
            heading: `You're invited to ${workspaceName}`,
            body: `Join the workspace, collaborate with your team, and start moving cards in real time.`,
            ctaLabel: 'Join workspace',
            ctaUrl: inviteUrl,
            footerNote: `If the button does not work, use this invite code: <strong>${inviteCode}</strong>.`,
        }),
        text: `You've been invited to ${workspaceName} on TeamOps. Join here: ${inviteUrl}\n\nInvite code: ${inviteCode}`,
    });

    if (_isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`\n📧 ETHEREAL INVITE PREVIEW:\n👉  ${previewUrl}\n`);
    } else {
      console.log(`📧 Invitation email sent to ${toEmail} (messageId: ${info.messageId})`);
    }

    return info;
  }

async function sendWorkspaceInviteEmail({ toEmail, workspaceName, inviterName, token }) {
  const transporter = await getTransporter();
  const inviteUrl = `${frontendBaseUrl}/join/invite?token=${encodeURIComponent(token)}`;
  const safeWorkspaceName = escapeHtml(workspaceName || 'TeamOps Workspace');
  const safeInviterName = escapeHtml(inviterName || 'A teammate');

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || `"TeamOps" <no-reply@teamops.dev>`,
    to: toEmail,
    subject: "You're invited to join TeamOps",
    html: emailShell({
      title: 'TeamOps workspace invite',
      heading: "You're invited to join TeamOps",
      body: `${safeInviterName} invited you to join <strong>${safeWorkspaceName}</strong>.`,
      ctaLabel: 'Accept invite',
      ctaUrl: inviteUrl,
      footerNote: `This invite expires in <strong>48 hours</strong>. If the button does not work, open this link: <br /><span style="word-break:break-all;">${escapeHtml(inviteUrl)}</span>`,
    }),
    text: `${inviterName || 'A teammate'} invited you to join ${workspaceName || 'TeamOps Workspace'} on TeamOps.\n\nAccept invite: ${inviteUrl}\n\nThis invite expires in 48 hours.`,
  });

  if (_isEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n📧 ETHEREAL WORKSPACE INVITE PREVIEW:\n👉  ${previewUrl}\n`);
  } else {
    console.log(`📧 Workspace invite email sent to ${toEmail} (messageId: ${info.messageId})`);
  }

  return info;
}

async function sendPasswordResetEmail(toEmail, otp) {
  const transporter = await getTransporter();
  const resetUrl = `${frontendBaseUrl}/login?resetEmail=${encodeURIComponent(toEmail)}`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"TeamOps" <no-reply@teamops.dev>`,
    to: toEmail,
    subject: 'Reset your TeamOps password',
    html: emailShell({
      title: 'Reset your password',
      heading: 'Reset your password',
      body: 'Enter this code in TeamOps to set a new password.',
      ctaLabel: 'Open TeamOps',
      ctaUrl: resetUrl,
      extraHtml: `<div style="display:inline-block;background:linear-gradient(135deg,#7c5cfc,#06b6d4);border-radius:12px;padding:20px 40px;margin-bottom:24px;"><span style="color:#ffffff;font-size:36px;font-weight:800;letter-spacing:10px;">${otp}</span></div>`,
      footerNote: `Your reset code is: <strong>${otp}</strong>. It expires in <strong>24 hours</strong>.`,
    }),
    text: `Your TeamOps password reset code is: ${otp}\n\nThis code expires in 24 hours.`,
  });

  if (_isEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n📧 ETHEREAL RESET PREVIEW:\n👉  ${previewUrl}\n`);
  } else {
    console.log(`📧 Password reset email sent to ${toEmail} (messageId: ${info.messageId})`);
  }

  return info;
}

module.exports = { sendVerificationEmail, sendInvitationEmail, sendWorkspaceInviteEmail, sendPasswordResetEmail };