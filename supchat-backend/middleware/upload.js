//middleware/uploads.js
const multer = require("multer");

const storage = multer.memoryStorage(); // stocke le fichier en RAM, on le transfère manuellement après
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
});

module.exports = upload;
