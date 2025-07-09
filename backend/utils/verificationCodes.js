const verificationCodes = new Map();

export const generateVerificationCode = (email) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, {
        code,
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes expiration
    });
    return code;
};

export const verifyCode = (email, code) => {
    const record = verificationCodes.get(email);

    if (!record || record.code !== code) {
        return false;
    }

    if (Date.now() > record.expiresAt) {
        verificationCodes.delete(email);
        return false;
    }

    verificationCodes.delete(email);
    return true;
};