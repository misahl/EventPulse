// src/pages/api/send-otp.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, otpCode } = req.body;

  if (!email || !otpCode) {
    return res.status(400).json({ error: 'Missing required parameters: email or otpCode' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    // FALLBACK LOCAL DEV MODE
    const logMsg = `\n=======================================================\n[MOCK MAILER SERVER] ✉️ Simulated OTP email for ${email}\nVerification Code: ${otpCode}\n=======================================================\n`;
    console.log(logMsg);

    return res.status(200).json({ 
      success: true, 
      emailSent: false, 
      fallback: true,
      message: 'Email service credentials not configured. OTP code logged to server console.' 
    });
  }

  try {
    // REAL EMAIL DELIVERY: Send via Resend REST API using native fetch
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EventPulse <onboarding@resend.dev>', // Resend sandbox default from address
        to: email,
        subject: 'EventPulse — 6-Digit Account Verification OTP',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 20px auto; padding: 30px; background-color: #0d121e; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); color: #f8fafc; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #a78bfa; margin: 0; font-size: 24px; letter-spacing: -0.5px;">EventPulse</h2>
              <span style="font-size: 11px; color: #64748b; font-family: monospace;">HACKATHON PS-3</span>
            </div>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;" />
            <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Thank you for registering an account on EventPulse. Please use the following 6-digit OTP code to verify and activate your account:</p>
            
            <div style="font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 6px; margin: 25px 0; color: #34d399; padding: 15px; background-color: #020617; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); font-family: monospace;">
              ${otpCode}
            </div>
            
            <p style="font-size: 13px; line-height: 1.5; color: #94a3b8;">Enter this code on the activation screen to verify your email. This verification code will expire shortly.</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 25px; margin-bottom: 15px;" />
            <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">If you did not create an account, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API Error details:', result);
      throw new Error(result.message || 'Resend mailer request failed');
    }

    console.log(`[REAL MAILER SERVER] ✉️ Successfully sent OTP email to ${email} (Message ID: ${result.id})`);
    return res.status(200).json({ 
      success: true, 
      emailSent: true, 
      fallback: false,
      message: 'Verification OTP email sent successfully!' 
    });

  } catch (error) {
    console.error('Mailer Server Error:', error);
    return res.status(500).json({ 
      error: 'Failed to deliver verification email', 
      details: error.message 
    });
  }
}
