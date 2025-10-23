import { Resend } from 'resend'

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface EmailTemplate {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailTemplate) {
  try {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('RESEND_API_KEY not configured. Email not sent.')
      console.log(`Would send email to ${to}: ${subject}`)
      return { success: false, error: 'Email service not configured' }
    }

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Avenai <noreply@avenai.io>',
      to: [to],
      subject,
      html,
    })

    console.log(`Email sent successfully to ${to}:`, result.data?.id)
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function createPasswordResetEmail(email: string, resetUrl: string) {
  return {
    to: email,
    subject: 'Reset Your Avenai Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset Your Password</h1>
              <p>We received a request to reset your Avenai password</p>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>You requested to reset your password for your Avenai account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>For security, never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">${resetUrl}</p>
              
              <p>Best regards,<br>The Avenai Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>If you have any questions, contact us at support@avenai.io</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

export function createEmailVerificationEmail(email: string, verificationUrl: string) {
  return {
    to: email,
    subject: 'Verify Your Avenai Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
            .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Verify Your Email</h1>
              <p>Welcome to Avenai! Let's verify your email address</p>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for signing up for Avenai! To complete your registration and start using our AI documentation platform, please verify your email address:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <div class="success">
                <strong>🎉 What happens next?</strong>
                <ul>
                  <li>Click the button above to verify your email</li>
                  <li>You'll be redirected to your dashboard</li>
                  <li>Start uploading documents and creating datasets</li>
                  <li>Begin using our AI chat features</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
              
              <p>Welcome aboard!<br>The Avenai Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>If you have any questions, contact us at support@avenai.io</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}
