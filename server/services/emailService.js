const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER || 'mochanlabs@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  },
  connectionTimeout: 10000,
  socketTimeout: 10000
});

const sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || 'mochanlabs@gmail.com',
      to: email,
      subject: 'Admin Login OTP - Mochan Labs',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00b4d8, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h2 style="margin: 0;">Mochan Labs Admin Portal</h2>
          </div>
          <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px;">Your admin login OTP is:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #00b4d8; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #00b4d8; letter-spacing: 2px; margin: 0;">${otp}</p>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    console.error('Error details:', error);
    console.error('Gmail User:', process.env.GMAIL_USER);
    console.error('Gmail App Password set:', !!process.env.GMAIL_APP_PASSWORD);
    return false;
  }
};

module.exports = { sendOTP };
