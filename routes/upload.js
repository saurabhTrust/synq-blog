const express = require('express');
const upload = require('../middlewares/upload'); // your existing multer
const { uploadFile } = require('../controllers/uploadController');

const router = express.Router();

/**
 * Upload file to IPFS
 * multipart/form-data
 * key: file
 */
router.post('/upload', upload.single('file'), uploadFile);

module.exports = router;
