import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

export const sendVerificationEmail = async (email, code) => {
    const mailOptions = {
        from: `"iDonatio" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Verify Your iDonatio Account",
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            color: #007AFF;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .code-container {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          .verification-code {
            font-size: 32px;
            letter-spacing: 3px;
            color: #007AFF;
            font-weight: bold;
          }
          .button {
            display: inline-block;
            background-color: #007AFF;
            color: white !important;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">iDonatio</div>
          <h2>Verify Your Email Address</h2>
        </div>
        
        <p>Thank you for creating an account with iDonatio. To complete your registration, please use the following verification code:</p>
        
        <div class="code-container">
          <div class="verification-code">${code}</div>
        </div>
        
        <p>This code will expire in 15 minutes. If you didn't request this code, you can safely ignore this email.</p>
        
        <p>Need help? <a href="mailto:support@idonatio.com" style="color: #007AFF;">Contact our support team</a></p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} iDonatio. All rights reserved.</p>
          <p>If you're having trouble with the code above, you can also copy and paste it directly.</p>
        </div>
      </body>
      </html>
    `,
        text: `
      Verify Your iDonatio Account\n\n
      Thank you for creating an account with iDonatio.\n\n
      Your verification code is: ${code}\n\n
      This code will expire in 15 minutes. If you didn't request this code, you can safely ignore this email.\n\n
      Need help? Contact our support team at support@idonatio.com\n\n
      © ${new Date().getFullYear()} iDonatio. All rights reserved.
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new Error("Failed to send verification email");
    }
};