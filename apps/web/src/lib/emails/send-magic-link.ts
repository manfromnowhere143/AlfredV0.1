/**
 * MAGIC LINK EMAIL — State-of-the-Art Clean Design
 * Gmail-safe (no SVG, pure HTML/CSS)
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendMagicLinkEmailParams {
  to: string;
  magicLink: string;
  from: string;
}

export async function sendMagicLinkEmail({ to, magicLink, from }: SendMagicLinkEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: 'Sign in to Alfred',
      html: generateEmailHtml(magicLink, to),
      text: generateEmailText(magicLink),
    });

    if (error) {
      console.error('Failed to send magic link email:', error);
      throw new Error('Failed to send email');
    }

    console.log('Magic link email sent:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    throw error;
  }
}

function generateEmailHtml(magicLink: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Sign in to Alfred</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f7;-webkit-font-smoothing:antialiased;">
  
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Your magic link to sign in to Alfred ✨
  </div>
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:420px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06);">
          
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding:44px 40px 0;">
              <!-- Flower of Life - Pure CSS/HTML circles -->
              <table cellpadding="0" cellspacing="0" border="0" style="width:52px;height:52px;">
                <tr>
                  <td align="center" valign="middle" style="width:52px;height:52px;border-radius:50%;border:1px solid rgba(0,0,0,0.08);background:linear-gradient(135deg,#fafafa 0%,#f0f0f0 100%);">
                    <span style="font-size:24px;font-weight:300;color:#1a1a1a;letter-spacing:-0.02em;">A</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding:24px 40px 0;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#1a1a1a;letter-spacing:-0.02em;line-height:1.3;">
                Sign in to Alfred
              </h1>
            </td>
          </tr>
          
          <!-- Description -->
          <tr>
            <td align="center" style="padding:12px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#6e6e73;">
                Click the button below to sign in as<br/>
                <strong style="color:#1a1a1a;">${email}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Button -->
          <tr>
            <td align="center" style="padding:28px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#1a1a1a;border-radius:10px;">
                    <a href="${magicLink}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      Continue to Alfred
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Expiry Note -->
          <tr>
            <td align="center" style="padding:0 40px 36px;">
              <p style="margin:0;font-size:13px;color:#aeaeb2;">
                This link expires in 24 hours
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:420px;">
          <tr>
            <td align="center" style="padding:28px 40px 0;">
              <p style="margin:0;font-size:12px;color:#86868b;line-height:1.5;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px;">
              <p style="margin:0;font-size:12px;color:#aeaeb2;">
                © ${new Date().getFullYear()} Alfred
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`.trim();
}

function generateEmailText(magicLink: string): string {
  return `Sign in to Alfred

Click the link below to securely sign in:
${magicLink}

This link expires in 24 hours.

If you didn't request this email, you can safely ignore it.

© ${new Date().getFullYear()} Alfred`;
}
