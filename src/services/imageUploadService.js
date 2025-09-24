const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

class ImageUploadService {
  /**
   * Create multer middleware for S3 upload
   * @param {string} folder - S3 folder path
   * @param {Array} allowedTypes - Allowed file types
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Object} - Multer middleware
   */
  static createUploadMiddleware(folder = 'images', allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'], maxSize = 5 * 1024 * 1024) {
    // Check if S3 is configured
    if (!process.env.S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('S3 not configured, using local storage for file uploads');
      
      // Fallback to local storage
      const upload = multer({
        storage: multer.diskStorage({
          destination: function (req, file, cb) {
            const uploadPath = `uploads/${folder}`;
            // Create directory if it doesn't exist
            const fs = require('fs');
            if (!fs.existsSync('uploads')) {
              fs.mkdirSync('uploads');
            }
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          },
          filename: function (req, file, cb) {
            const fileExtension = path.extname(file.originalname);
            const fileName = `${Date.now()}-${uuidv4()}${fileExtension}`;
            cb(null, fileName);
          }
        }),
        fileFilter: function (req, file, cb) {
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
          }
        },
        limits: {
          fileSize: maxSize
        }
      });

      return upload;
    }

    // S3 storage configuration
    const upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read',
        key: function (req, file, cb) {
          const fileExtension = path.extname(file.originalname);
          const fileName = `${folder}/${Date.now()}-${uuidv4()}${fileExtension}`;
          cb(null, fileName);
        },
        metadata: function (req, file, cb) {
          cb(null, {
            fieldName: file.fieldname,
            originalName: file.originalname,
            uploadedBy: req.user ? req.user._id.toString() : 'unknown',
            uploadedAt: new Date().toISOString()
          });
        }
      }),
      fileFilter: function (req, file, cb) {
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
        }
      },
      limits: {
        fileSize: maxSize
      }
    });

    return upload;
  }

  /**
   * Upload single image to S3
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} fileName - File name
   * @param {string} folder - S3 folder
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} - S3 URL
   */
  static async uploadImageBuffer(imageBuffer, fileName, folder = 'images', contentType = 'image/jpeg') {
    try {
      const key = `${folder}/${Date.now()}-${uuidv4()}-${fileName}`;
      
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: {
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await s3.upload(uploadParams).promise();
      return result.Location;
    } catch (error) {
      console.error('Error uploading image buffer:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Delete image from S3
   * @param {string} imageUrl - S3 URL of image to delete
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteImage(imageUrl) {
    try {
      if (!imageUrl) return true;

      // Extract S3 key from URL
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes(process.env.S3_BUCKET_NAME));
      
      if (bucketIndex === -1) {
        console.warn('Invalid S3 URL format:', imageUrl);
        return false;
      }

      const key = urlParts.slice(bucketIndex + 1).join('/');

      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      };

      await s3.deleteObject(deleteParams).promise();
      console.log(`Image deleted from S3: ${key}`);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Get image metadata from S3
   * @param {string} imageUrl - S3 URL
   * @returns {Promise<Object>} - Image metadata
   */
  static async getImageMetadata(imageUrl) {
    try {
      if (!imageUrl) return null;

      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes(process.env.S3_BUCKET_NAME));
      
      if (bucketIndex === -1) {
        return null;
      }

      const key = urlParts.slice(bucketIndex + 1).join('/');

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      };

      const result = await s3.headObject(params).promise();
      return {
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        metadata: result.Metadata
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {Object} - Validation result
   */
  static validateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const errors = [];

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      errors.push(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate presigned URL for direct upload
   * @param {string} fileName - File name
   * @param {string} fileType - File type for folder organization
   * @param {string} contentType - MIME type
   * @param {number} expiresIn - URL expiration in seconds
   * @returns {Promise<Object>} - Presigned URL data
   */
  static async generatePresignedUrl(fileName, fileType = 'general', contentType = 'image/jpeg', expiresIn = 3600) {
    try {
      // Map file types to folders
      const folderMap = {
        'profile-picture': 'profile-pictures',
        'tour-image': 'tour-images',
        'calendar-image': 'calendar-images',
        'document': 'documents',
        'general': 'general-uploads'
      };

      const folder = folderMap[fileType] || 'general-uploads';
      const key = `${folder}/${Date.now()}-${uuidv4()}-${fileName}`;
      
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
        Expires: expiresIn
      };

      const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

      return {
        presignedUrl,
        publicUrl,
        key,
        expiresIn
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Delete file from S3 by key
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteFile(key) {
    try {
      if (!key) return true;

      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      };

      await s3.deleteObject(deleteParams).promise();
      console.log(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Resize image (optional - requires sharp package)
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {Promise<Buffer>} - Resized image buffer or original if sharp not available
   */
  static async resizeImage(imageBuffer, width = 800, height = 600) {
    try {
      // Try to use sharp if available
      const sharp = require('sharp');
      
      const resizedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return resizedBuffer;
    } catch (error) {
      console.log('Sharp not available, returning original image buffer');
      // Return original buffer if sharp is not available
      return imageBuffer;
    }
  }
}

module.exports = ImageUploadService;