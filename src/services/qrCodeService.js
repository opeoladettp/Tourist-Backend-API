const QRCode = require('qrcode');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3 Client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

class QRCodeService {
  /**
   * Generate QR code for a tour and upload to S3 or local storage
   * @param {Object} tourData - Tour data to encode in QR code
   * @param {string} tourType - 'template' or 'custom'
   * @returns {Promise<string>} - S3 URL or local URL of the uploaded QR code
   */
  static async generateTourQRCode(tourData, tourType = 'custom') {
    try {
      // Check if S3 is configured
      if (!process.env.S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.log('S3 not configured, QR codes will be stored locally');
        return await this.generateTourQRCodeLocal(tourData, tourType);
      }
      // Create QR code data object
      const qrData = {
        type: tourType,
        id: tourData._id,
        name: tourData.tour_name || tourData.template_name,
        joinCode: tourData.join_code,
        startDate: tourData.start_date,
        endDate: tourData.end_date,
        provider: tourData.provider_id?.provider_name || 'Unknown Provider',
        url: `${process.env.FRONTEND_URL || 'https://tourlicity.com'}/tours/${tourData._id}`,
        generatedAt: new Date().toISOString()
      };

      // Generate QR code as buffer (using default renderer)
      const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512,
        errorCorrectionLevel: 'M'
      });

      // Generate unique filename
      const filename = `qr-codes/${tourType}/${tourData._id}-${uuidv4()}.png`;

      // Upload to S3
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filename,
        Body: qrCodeBuffer,
        ContentType: 'image/png',
        Metadata: {
          tourId: tourData._id.toString(),
          tourType: tourType,
          generatedAt: new Date().toISOString()
        }
      };

      const command = new PutObjectCommand(uploadParams);
      const uploadResult = await s3Client.send(command);
      
      // Construct the public URL since AWS SDK v3 doesn't return Location
      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${filename}`;
      
      console.log(`QR code generated and uploaded for ${tourType} tour: ${tourData._id}`);
      return publicUrl;

    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code with custom data
   * @param {Object} customData - Custom data to encode
   * @param {string} filename - Custom filename
   * @returns {Promise<string>} - S3 URL or local URL of the uploaded QR code
   */
  static async generateCustomQRCode(customData, filename) {
    try {
      // Check if S3 is configured
      if (!process.env.S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return await this.generateCustomQRCodeLocal(customData, filename);
      }

      const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(customData), {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512,
        errorCorrectionLevel: 'M'
      });

      const s3Key = `qr-codes/custom/${filename}-${uuidv4()}.png`;

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: qrCodeBuffer,
        ContentType: 'image/png',
        Metadata: {
          type: 'custom',
          generatedAt: new Date().toISOString()
        }
      };

      const command = new PutObjectCommand(uploadParams);
      const uploadResult = await s3Client.send(command);
      
      // Construct the public URL since AWS SDK v3 doesn't return Location
      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      return publicUrl;

    } catch (error) {
      console.error('Error generating custom QR code:', error);
      throw new Error('Failed to generate custom QR code');
    }
  }

  /**
   * Generate QR code with custom data locally
   * @param {Object} customData - Custom data to encode
   * @param {string} filename - Custom filename
   * @returns {Promise<string>} - Local URL of the uploaded QR code
   */
  static async generateCustomQRCodeLocal(customData, filename) {
    try {
      const fs = require('fs');
      const path = require('path');

      const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(customData), {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512,
        errorCorrectionLevel: 'M'
      });

      // Create uploads directory if it doesn't exist
      const uploadsDir = 'uploads/qr-codes';
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
      }
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const uniqueFilename = `${filename}-${uuidv4()}.png`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Write file to local storage
      fs.writeFileSync(filePath, qrCodeBuffer);

      // Return local URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const localUrl = `${baseUrl}/uploads/qr-codes/${uniqueFilename}`;

      console.log(`Custom QR code generated locally: ${uniqueFilename}`);
      return localUrl;

    } catch (error) {
      console.error('Error generating local custom QR code:', error);
      throw new Error('Failed to generate local custom QR code');
    }
  }

  /**
   * Delete QR code from S3
   * @param {string} qrCodeUrl - S3 URL of the QR code to delete
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteQRCode(qrCodeUrl) {
    try {
      if (!qrCodeUrl) return true;

      // Extract S3 key from URL
      const urlParts = qrCodeUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part.includes(process.env.S3_BUCKET_NAME));
      
      if (bucketIndex === -1) {
        console.warn('Invalid S3 URL format:', qrCodeUrl);
        return false;
      }

      const key = urlParts.slice(bucketIndex + 1).join('/');

      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      });

      await s3Client.send(deleteCommand);
      console.log(`QR code deleted from S3: ${key}`);
      return true;

    } catch (error) {
      console.error('Error deleting QR code:', error);
      return false;
    }
  }

  /**
   * Regenerate QR code for a tour (delete old and create new)
   * @param {Object} tourData - Tour data
   * @param {string} oldQrCodeUrl - URL of old QR code to delete
   * @param {string} tourType - 'template' or 'custom'
   * @returns {Promise<string>} - New QR code URL
   */
  static async regenerateQRCode(tourData, oldQrCodeUrl, tourType = 'custom') {
    try {
      // Delete old QR code
      if (oldQrCodeUrl) {
        await this.deleteQRCode(oldQrCodeUrl);
      }

      // Generate new QR code
      return await this.generateTourQRCode(tourData, tourType);

    } catch (error) {
      console.error('Error regenerating QR code:', error);
      throw new Error('Failed to regenerate QR code');
    }
  }

  /**
   * Generate QR code locally (fallback when S3 not configured)
   * @param {Object} tourData - Tour data to encode in QR code
   * @param {string} tourType - 'template' or 'custom'
   * @returns {Promise<string>} - Local URL of the uploaded QR code
   */
  static async generateTourQRCodeLocal(tourData, tourType = 'custom') {
    try {
      const fs = require('fs');
      const path = require('path');

      // Create QR code data object
      const qrData = {
        type: tourType,
        id: tourData._id,
        name: tourData.tour_name || tourData.template_name,
        joinCode: tourData.join_code,
        startDate: tourData.start_date,
        endDate: tourData.end_date,
        provider: tourData.provider_id?.provider_name || 'Unknown Provider',
        url: `${process.env.FRONTEND_URL || 'https://tourlicity.com'}/tours/${tourData._id}`,
        generatedAt: new Date().toISOString()
      };

      // Generate QR code as buffer
      const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512,
        errorCorrectionLevel: 'M'
      });

      // Create uploads directory if it doesn't exist
      const uploadsDir = 'uploads/qr-codes';
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
      }
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const filename = `${tourType}-${tourData._id}-${uuidv4()}.png`;
      const filePath = path.join(uploadsDir, filename);

      // Write file to local storage
      fs.writeFileSync(filePath, qrCodeBuffer);

      // Return local URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const localUrl = `${baseUrl}/uploads/qr-codes/${filename}`;

      console.log(`QR code generated locally for ${tourType} tour: ${tourData._id}`);
      return localUrl;

    } catch (error) {
      console.error('Error generating local QR code:', error);
      throw new Error('Failed to generate local QR code');
    }
  }

  /**
   * Generate QR code for tour registration/join
   * @param {Object} tourData - Tour data
   * @returns {Promise<string>} - QR code URL for joining tour
   */
  static async generateJoinQRCode(tourData) {
    try {
      const joinData = {
        type: 'join_tour',
        tourId: tourData._id,
        joinCode: tourData.join_code,
        tourName: tourData.tour_name,
        provider: tourData.provider_id?.provider_name,
        joinUrl: `${process.env.FRONTEND_URL || 'https://tourlicity.com'}/join/${tourData.join_code}`,
        generatedAt: new Date().toISOString()
      };

      return await this.generateCustomQRCode(joinData, `join-${tourData.join_code}`);

    } catch (error) {
      console.error('Error generating join QR code:', error);
      throw new Error('Failed to generate join QR code');
    }
  }
}

module.exports = QRCodeService;