import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

export const sendVerificationEmail = async (email, code) => {
    const mailOptions = {
        from: `"iDonatio" ${process.env.GMAIL_USER}`,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${code}`,
        html: `<p>Your verification code is: <strong>${code}</strong></p>`
    };

    await transporter.sendMail(mailOptions);
};