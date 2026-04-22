/* ============================================================
   SoulGPT — Email Service
   File: backend/src/services/emailService.js
   ============================================================ */

   const nodemailer = require('nodemailer');

   let transporter = null;
   
   function getTransporter() {
     if (transporter) return transporter;
   
     const host = process.env.EMAIL_HOST;
     const port = Number(process.env.EMAIL_PORT || 587);
     const secure = String(process.env.EMAIL_SECURE) === 'true';
     const user = process.env.EMAIL_USER;
     const pass = process.env.EMAIL_PASS;
   
     if (!host || !user || !pass) {
       throw new Error('Email service is not configured correctly');
     }
   
     transporter = nodemailer.createTransport({
       host,
       port,
       secure,
       auth: {
         user,
         pass,
       },
       connectionTimeout: 10000,
       greetingTimeout: 10000,
       socketTimeout: 15000,
     });
   
     return transporter;
   }
   
   async function sendVerificationOtp(email, otp, name = 'friend') {
     const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
     const subject = 'SoulGPT — Your verification code';
   
     const text = [
       `Hi ${name},`,
       '',
       `Your SoulGPT verification code is: ${otp}`,
       '',
       'This code expires in 10 minutes.',
       'If you did not request this, you can ignore this email.',
     ].join('\n');
   
     const html = `
       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
         <h2>SoulGPT verification</h2>
         <p>Hi ${name},</p>
         <p>Your verification code is:</p>
         <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
           ${otp}
         </div>
         <p>This code expires in <strong>10 minutes</strong>.</p>
         <p>If you did not request this, you can ignore this email.</p>
       </div>
     `;
   
     const tx = getTransporter();
   
     console.log('Verifying SMTP connection...');
     await tx.verify();
     console.log('SMTP verified. Sending OTP to:', email);
   
     const info = await tx.sendMail({
       from,
       to: email,
       subject,
       text,
       html,
     });
   
     console.log('OTP email sent:', info.messageId);
     return info;
   }
   
   module.exports = {
     sendVerificationOtp,
   };