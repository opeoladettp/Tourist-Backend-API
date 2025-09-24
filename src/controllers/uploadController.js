const ImageUploadService = require('../services/imageUploadService');
const User = require('../models/User');
const { sanitizeUser } = require('../utils/helpers');

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileUrl = req.file.location || req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Update user's profile picture
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profile_picture: fileUrl },
      { new: true }
    ).populate('provider_id');

    res.json({
      message: 'Profile picture uploaded successfully',
      fileUrl,
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString(),
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

// Upload tour image (features or teaser)
const uploadTourImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { image_type } = req.body;
    const fileUrl = req.file.location || req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    res.json({
      message: `Tour ${image_type || 'image'} uploaded successfully`,
      fileUrl,
      fileName,
      fileSize,
      imageType: image_type,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tour image upload error:', error);
    res.status(500).json({ error: 'Failed to upload tour image' });
  }
};

// Upload multiple tour images
const uploadMultipleTourImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadedFiles = req.files.map(file => ({
      message: 'Tour image uploaded successfully',
      fileUrl: file.location || file.path,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    }));

    res.json({
      message: `${uploadedFiles.length} tour images uploaded successfully`,
      uploadedFiles
    });
  } catch (error) {
    console.error('Multiple tour images upload error:', error);
    res.status(500).json({ error: 'Failed to upload tour images' });
  }
};

// Upload general file
const uploadGeneralFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { category = 'other' } = req.body;
    const fileUrl = req.file.location || req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    res.json({
      message: 'File uploaded successfully',
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      category,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('General file upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Get presigned URL for direct S3 upload
const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType, contentType = 'image/jpeg' } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    // Validate file type
    const validFileTypes = ['profile-picture', 'tour-image', 'calendar-image', 'document', 'general'];
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: 'Invalid fileType. Must be one of: ' + validFileTypes.join(', ') 
      });
    }

    // Generate presigned URL using ImageUploadService
    const result = await ImageUploadService.generatePresignedUrl(fileName, fileType, contentType);

    res.json({
      message: 'Presigned URL generated successfully',
      presignedUrl: result.presignedUrl,
      publicUrl: result.publicUrl,
      key: result.key,
      expiresIn: result.expiresIn || 3600
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
};

// Delete file from S3
const deleteFile = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    // Extract S3 key from URL
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes('amazonaws.com'));
    
    if (bucketIndex === -1) {
      return res.status(400).json({ error: 'Invalid S3 URL format' });
    }

    const key = urlParts.slice(bucketIndex + 1).join('/');

    // Delete file using ImageUploadService
    await ImageUploadService.deleteFile(key);

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

module.exports = {
  uploadProfilePicture,
  uploadTourImage,
  uploadMultipleTourImages,
  uploadGeneralFile,
  getPresignedUrl,
  deleteFile
};