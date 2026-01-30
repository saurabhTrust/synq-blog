const { uploadToStorage } = require('../services/ipfs');

/**
 * Upload single file to IPFS
 * Used by frontend editor before blog save
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
      });
    }

    const uploaded = await uploadToStorage(req.file);

    if (!uploaded?.ipfsUri && !uploaded?.url) {
      return res.status(500).json({
        success: false,
        message: 'Upload failed',
      });
    }

    return res.status(200).json({
      success: true,
      url: uploaded.ipfsUri || uploaded.url,
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload file',
    });
  }
};

module.exports = {
  uploadFile,
};
