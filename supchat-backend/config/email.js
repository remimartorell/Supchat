// supchat-backend/config/email.js
const nodemailer = require('nodemailer');

/*const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // par ex. smtp.ionos.com
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true', // false pour STARTTLS sur le port 587
    requireTLS: true, // Force l'utilisation de STARTTLS
    auth: {
        user: process.env.EMAIL_USER,  // contact@supchat.info
        pass: process.env.EMAIL_PASS   // mot de passe (encadré de guillemets dans le .env)
    },
    tls: {
        // Parfois utile si le serveur utilise des certificats non reconnus
        rejectUnauthorized: false
    }
});*/

/*const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.fr',
    secure: false,
    port: 587,
    auth: {
        user: 'contact@supchat.info',
        pass: 'SupinfoSupchat06',
    },
});*/

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // ex. smtp.ionos.fr
    port: parseInt(process.env.EMAIL_PORT, 10), // 587
    secure: process.env.EMAIL_SECURE === 'true', // false pour STARTTLS
    auth: {
        user: process.env.EMAIL_USER,  // contact@supchat.info
        pass: process.env.EMAIL_PASS,  // mot de passe
    },
    // Optionnel : TLS
    tls: {
        rejectUnauthorized: false,
    },
});

module.exports = transporter;