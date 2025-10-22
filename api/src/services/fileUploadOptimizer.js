import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { Transform } from 'stream';
import sharp from 'sharp';
import logger from '../utils/logger.js';

/**
 * File Upload Optimization Service
 * Provides streaming file uploads, size validation, image optimization, and cleanup
 */

class FileUploadOptimizer {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB default
    this.maxImageSize = 5 * 1024 * 1024; // 5MB for images
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    this.allowedDocumentTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
    this.uploadDir = 'uploads';
    this.tempDir = 'uploads/temp';
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour
    this.tempFileMaxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    this.initializeDirectories();
    this.startCleanupScheduler();
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'images'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'documents'), { recursive: true });
      logger.info('Upload directories initialized');
    } catch (error) {
      logger.error('Failed to initialize upload directories', { error: error.message });
    }
  }

  /**
   * Create multer configuration for streaming uploads
   */
  createMulterConfig(options = {}) {
    const {
      maxFileSize = this.maxFileSize,
      allowedTypes = [...this.allowedImageTypes, ...this.allowedDocumentTypes],
      destination = this.tempDir
    } = options;

    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await fs.mkdir(destination, { recursive: true });
          cb(null, destination);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: maxFileSize,
        files: 10, // Maximum 10 files per request
        fields: 20 // Maximum 20 form fields
      },
      fileFilter: (req, file, cb) => {
        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          return cb(new Error(`File type ${file.mimetype} not allowed`));
        }

        // Additional size check for images
        if (this.allowedImageTypes.includes(file.mimetype) && maxFileSize > this.maxImageSize) {
          return cb(new Error(`Image files cannot exceed ${this.maxImageSize / 1024 / 1024}MB`));
        }

        cb(null, true);
      }
    });
  }

  /**
   * Create streaming file upload middleware
   */
  createStreamingUpload(fieldName, options = {}) {
    const upload = this.createMulterConfig(options);
    
    return (req, res, next) => {
      const startTime = Date.now();
      
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          logger.error('File upload error', { 
            error: err.message, 
            fieldName,
            fileSize: req.file?.size,
            mimetype: req.file?.mimetype
          });
          
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({ 
                error: 'File too large', 
                maxSize: `${options.maxFileSize || this.maxFileSize / 1024 / 1024}MB` 
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(413).json({ error: 'Too many files' });
            }
          }
          
          return res.status(400).json({ error: err.message });
        }

        if (req.file) {
          const duration = Date.now() - startTime;
          logger.info('File uploaded successfully', {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            duration: `${duration}ms`
          });

          // Add cleanup metadata
          req.file.uploadTime = new Date();
          req.file.needsCleanup = true;
        }

        next();
      });
    };
  }

  /**
   * Create multiple file upload middleware
   */
  createMultipleUpload(fieldName, maxCount = 5, options = {}) {
    const upload = this.createMulterConfig(options);
    
    return (req, res, next) => {
      const startTime = Date.now();
      
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) {
          logger.error('Multiple file upload error', { 
            error: err.message, 
            fieldName,
            maxCount
          });
          
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({ 
                error: 'File too large', 
                maxSize: `${options.maxFileSize || this.maxFileSize / 1024 / 1024}MB` 
              });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
              return res.status(413).json({ 
                error: `Too many files. Maximum ${maxCount} files allowed.` 
              });
            }
          }
          
          return res.status(400).json({ error: err.message });
        }

        if (req.files && req.files.length > 0) {
          const duration = Date.now() - startTime;
          const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
          
          logger.info('Multiple files uploaded successfully', {
            fileCount: req.files.length,
            totalSize,
            duration: `${duration}ms`
          });

          // Add cleanup metadata to all files
          req.files.forEach(file => {
            file.uploadTime = new Date();
            file.needsCleanup = true;
          });
        }

        next();
      });
    };
  }

  /**
   * Optimize uploaded images
   */
  async optimizeImage(filePath, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 80,
      format = 'jpeg'
    } = options;

    try {
      const startTime = Date.now();
      const originalStats = await fs.stat(filePath);
      
      const optimizedPath = filePath.replace(/\.[^.]+$/, `-optimized.${format}`);
      
      await sharp(filePath)
        .resize(maxWidth, maxHeight, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality })
        .toFile(optimizedPath);

      const optimizedStats = await fs.stat(optimizedPath);
      const duration = Date.now() - startTime;
      const compressionRatio = ((originalStats.size - optimizedStats.size) / originalStats.size) * 100;

      logger.info('Image optimized', {
        originalPath: filePath,
        optimizedPath,
        originalSize: originalStats.size,
        optimizedSize: optimizedStats.size,
        compressionRatio: `${Math.round(compressionRatio)}%`,
        duration: `${duration}ms`
      });

      // Remove original file
      await fs.unlink(filePath);

      return {
        path: optimizedPath,
        originalSize: originalStats.size,
        optimizedSize: optimizedStats.size,
        compressionRatio,
        duration
      };

    } catch (error) {
      logger.error('Image optimization failed', { 
        filePath, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create image optimization middleware
   */
  createImageOptimizationMiddleware(options = {}) {
    return async (req, res, next) => {
      if (!req.file && (!req.files || req.files.length === 0)) {
        return next();
      }

      try {
        const files = req.files || [req.file];
        const optimizedFiles = [];

        for (const file of files) {
          if (this.allowedImageTypes.includes(file.mimetype)) {
            const optimized = await this.optimizeImage(file.path, options);
            optimizedFiles.push({
              ...file,
              path: optimized.path,
              size: optimized.optimizedSize,
              optimized: true,
              compressionRatio: optimized.compressionRatio
            });
          } else {
            optimizedFiles.push(file);
          }
        }

        if (req.files) {
          req.files = optimizedFiles;
        } else {
          req.file = optimizedFiles[0];
        }

        next();
      } catch (error) {
        logger.error('Image optimization middleware error', { error: error.message });
        next(error);
      }
    };
  }

  /**
   * Move file from temp to permanent location
   */
  async moveToPermament(tempPath, permanentDir, filename) {
    try {
      const permanentPath = path.join(permanentDir, filename);
      await fs.mkdir(path.dirname(permanentPath), { recursive: true });
      await fs.rename(tempPath, permanentPath);
      
      logger.info('File moved to permanent location', {
        from: tempPath,
        to: permanentPath
      });
      
      return permanentPath;
    } catch (error) {
      logger.error('Failed to move file to permanent location', {
        tempPath,
        permanentDir,
        filename,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      let cleanedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Check if file is older than max age
        const age = Date.now() - stats.mtime.getTime();
        if (age > this.tempFileMaxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
          totalSize += stats.size;
          
          logger.debug('Temporary file cleaned up', {
            file: filePath,
            age: `${Math.round(age / 1000 / 60)}min`,
            size: stats.size
          });
        }
      }

      if (cleanedCount > 0) {
        logger.info('Temporary file cleanup completed', {
          filesRemoved: cleanedCount,
          totalSizeFreed: `${Math.round(totalSize / 1024 / 1024)}MB`
        });
      }

      return { filesRemoved: cleanedCount, sizeFreed: totalSize };
    } catch (error) {
      logger.error('Temporary file cleanup failed', { error: error.message });
      return { filesRemoved: 0, sizeFreed: 0 };
    }
  }

  /**
   * Start automatic cleanup scheduler
   */
  startCleanupScheduler() {
    setInterval(() => {
      this.cleanupTempFiles();
    }, this.cleanupInterval);

    logger.info('File cleanup scheduler started', {
      interval: `${this.cleanupInterval / 1000 / 60}min`,
      maxAge: `${this.tempFileMaxAge / 1000 / 60 / 60}h`
    });
  }

  /**
   * Get upload statistics
   */
  async getUploadStats() {
    try {
      const [tempFiles, imageFiles, documentFiles] = await Promise.all([
        fs.readdir(this.tempDir),
        fs.readdir(path.join(this.uploadDir, 'images')),
        fs.readdir(path.join(this.uploadDir, 'documents'))
      ]);

      const tempStats = await this.getDirectoryStats(this.tempDir);
      const imageStats = await this.getDirectoryStats(path.join(this.uploadDir, 'images'));
      const documentStats = await this.getDirectoryStats(path.join(this.uploadDir, 'documents'));

      return {
        temporary: {
          fileCount: tempFiles.length,
          totalSize: tempStats.totalSize,
          oldestFile: tempStats.oldestFile
        },
        images: {
          fileCount: imageFiles.length,
          totalSize: imageStats.totalSize
        },
        documents: {
          fileCount: documentFiles.length,
          totalSize: documentStats.totalSize
        },
        total: {
          fileCount: tempFiles.length + imageFiles.length + documentFiles.length,
          totalSize: tempStats.totalSize + imageStats.totalSize + documentStats.totalSize
        }
      };
    } catch (error) {
      logger.error('Failed to get upload statistics', { error: error.message });
      return null;
    }
  }

  /**
   * Get directory statistics
   */
  async getDirectoryStats(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      let totalSize = 0;
      let oldestFile = null;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        if (!oldestFile || stats.mtime < oldestFile) {
          oldestFile = stats.mtime;
        }
      }

      return { totalSize, oldestFile };
    } catch (error) {
      return { totalSize: 0, oldestFile: null };
    }
  }

  /**
   * Create file validation middleware
   */
  createFileValidationMiddleware(options = {}) {
    const {
      requiredFields = [],
      maxTotalSize = 50 * 1024 * 1024 // 50MB total
    } = options;

    return (req, res, next) => {
      // Check required fields
      for (const field of requiredFields) {
        if (!req.files || !req.files.find(f => f.fieldname === field)) {
          return res.status(400).json({ 
            error: `Required file field '${field}' is missing` 
          });
        }
      }

      // Check total size
      if (req.files) {
        const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > maxTotalSize) {
          return res.status(413).json({ 
            error: `Total file size exceeds limit of ${maxTotalSize / 1024 / 1024}MB` 
          });
        }
      }

      next();
    };
  }
}

// Create singleton instance
const fileUploadOptimizer = new FileUploadOptimizer();

export default fileUploadOptimizer;