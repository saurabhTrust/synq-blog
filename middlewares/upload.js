const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Temporary upload directory
 */
const TEMP_DIR = path.join(__dirname, '../temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Multer storage config
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  },
});

/**
 * Allow only image files
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpg|jpeg|png|gif/i;
  const ext = path.extname(file.originalname);

  if (!allowedTypes.test(ext)) {
    return cb(new Error('Only image files are allowed'), false);
  }

  cb(null, true);
};

/**
 * Export multer instance
 */
module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
