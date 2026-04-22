/* ============================================================
   SoulGPT — Email Service (Resend Version)
   ============================================================ */

   const { Resend } = require('resend');

   function getClient() {
     const apiKey = process.env.RESEND_API_KEY;
   
     if (!apiKey) {
       throw new Error('Resend API key is missing');
     }
   
     return new Resend(apiKey);
   }
   
   async function sendVerificationOtp(email, otp, name = 'friend') {
     const resend = getClient();
   
     const from = process.env.EMAIL_FROM || 'SoulGPT <onboarding@resend.dev>';
   
     const subject = 'SoulGPT — Your verification code';
   
     const html = `
       <div style="font-family: Arial; line-height: 1.6;">
         <h2>SoulGPT Verification</h2>
         <p>Hi ${name},</p>
         <p>Your verification code is:</p>
         <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">
           ${otp}
         </div>
         <p>This code expires in 10 minutes.</p>
       </div>
     `;
   
     console.log('Sending OTP via Resend to:', email);
   
     const result = await resend.emails.send({
       from,
       to: email,
       subject,
       html,
     });
   
     console.log('Resend result:', result);
   
     return result;
   }
   
   module.exports = {
     sendVerificationOtp,
   };