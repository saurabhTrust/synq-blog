const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

const PINATA_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/**
 * Decide storage at runtime
 */
const canUsePinata = Boolean(PINATA_API_KEY && PINATA_SECRET_API_KEY);

/**
 * Upload file to IPFS (Pinata) or fallback to local storage
 */
const uploadToStorage = async (file) => {
  if (!file || !file.path) {
    return null;
  }

  try {
    if (canUsePinata) {
      return await uploadToPinata(file);
    }

    return await uploadToLocalStorage(file);
  } catch (error) {
    console.error('Storage upload error:', error.message);

    // Safe fallback
    if (canUsePinata) {
      console.warn('Falling back to local storage');
      return await uploadToLocalStorage(file);
    }

    throw error;
  }
};

/**
 * Upload file to Pinata (IPFS)
 */
const uploadToPinata = async (file) => {
  const formData = new FormData();
  const fileStream = fs.createReadStream(file.path);

  formData.append('file', fileStream);

  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: `${uuidv4()}-${file.originalname}`,
    })
  );

  formData.append(
    'pinataOptions',
    JSON.stringify({ cidVersion: 0 })
  );

  const response = await axios.post(PINATA_ENDPOINT, formData, {
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_API_KEY,
    },
  });

  fs.unlinkSync(file.path);

  const cid = response.data.IpfsHash;

  return {
    cid,
    ipfsUri: `ipfs://${cid}`,
    storage: 'ipfs',
  };
};

/**
 * Local storage fallback
 */
const uploadToLocalStorage = async (file) => {
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname);
  const fileName = `${uuidv4()}${ext}`;
  const destPath = path.join(uploadDir, fileName);

  fs.copyFileSync(file.path, destPath);
  fs.unlinkSync(file.path);

  return {
    url: `/uploads/${fileName}`,
    storage: 'local',
  };
};

module.exports = {
  uploadToStorage,
};
