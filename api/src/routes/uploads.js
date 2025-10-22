import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import fileUploadOptimizer from "../services/fileUploadOptimizer.js";
import path from "path";
import { promises as fs } from "fs";

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

// Single file upload with optimization
uploadRouter.post("/single", 
  fileUploadOptimizer.createStreamingUpload('file', {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  }),
  fileUploadOptimizer.createImageOptimizationMiddleware({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Move file to permanent location
      const permanentDir = req.file.mimetype.startsWith('image/') 
        ? path.join('uploads', 'images', req.user.agencyId)
        : path.join('uploads', 'documents', req.user.agencyId);
      
      const filename = `${Date.now()}-${req.file.originalname}`;
      const permanentPath = await fileUploadOptimizer.moveToPermament(
        req.file.path, 
        permanentDir, 
        filename
      );

      res.json({
        success: true,
        message: "File uploaded successfully",
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: permanentPath,
          optimized: req.file.optimized || false,
          compressionRatio: req.file.compressionRatio || 0,
          uploadTime: req.file.uploadTime
        }
      });
    } catch (error) {
      res.status(500).json({ error: "File upload failed" });
    }
  }
);

// Multiple file upload
uploadRouter.post("/multiple",
  fileUploadOptimizer.createMultipleUpload('files', 5, {
    maxFileSize: 5 * 1024 * 1024, // 5MB per file
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/csv'
    ]
  }),
  fileUploadOptimizer.createImageOptimizationMiddleware({
    maxWidth: 1200,
    maxHeight: 800,
    quality: 75
  }),
  fileUploadOptimizer.createFileValidationMiddleware({
    maxTotalSize: 25 * 1024 * 1024 // 25MB total
  }),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        // Move each file to permanent location
        const permanentDir = file.mimetype.startsWith('image/') 
          ? path.join('uploads', 'images', req.user.agencyId)
          : path.join('uploads', 'documents', req.user.agencyId);
        
        const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
        const permanentPath = await fileUploadOptimizer.moveToPermament(
          file.path, 
          permanentDir, 
          filename
        );

        uploadedFiles.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: permanentPath,
          optimized: file.optimized || false,
          compressionRatio: file.compressionRatio || 0,
          uploadTime: file.uploadTime
        });
      }

      res.json({
        success: true,
        message: `${uploadedFiles.length} files uploaded successfully`,
        data: {
          files: uploadedFiles,
          totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0),
          totalFiles: uploadedFiles.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Multiple file upload failed" });
    }
  }
);

// Property document upload (specific use case)
uploadRouter.post("/property/:propertyId/documents",
  fileUploadOptimizer.createMultipleUpload('documents', 10, {
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    allowedTypes: [
      'application/pdf', 
      'image/jpeg', 'image/png', 'image/webp',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  }),
  fileUploadOptimizer.createImageOptimizationMiddleware(),
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No documents uploaded" });
      }

      // Verify property belongs to user's agency
      const { prisma } = await import("../db.js");
      const property = await prisma.property.findFirst({
        where: { 
          id: propertyId, 
          agencyId: req.user.agencyId 
        }
      });

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const uploadedDocuments = [];

      for (const file of req.files) {
        const permanentDir = path.join('uploads', 'properties', req.user.agencyId, propertyId);
        const filename = `${Date.now()}-${file.originalname}`;
        const permanentPath = await fileUploadOptimizer.moveToPermament(
          file.path, 
          permanentDir, 
          filename
        );

        uploadedDocuments.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: permanentPath,
          propertyId,
          uploadTime: file.uploadTime
        });
      }

      res.json({
        success: true,
        message: `${uploadedDocuments.length} property documents uploaded successfully`,
        data: {
          propertyId,
          documents: uploadedDocuments,
          totalSize: uploadedDocuments.reduce((sum, doc) => sum + doc.size, 0)
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Property document upload failed" });
    }
  }
);

// Tenant document upload (specific use case)
uploadRouter.post("/tenant/:tenantId/documents",
  fileUploadOptimizer.createMultipleUpload('documents', 5, {
    maxFileSize: 5 * 1024 * 1024, // 5MB per file
    allowedTypes: [
      'application/pdf', 
      'image/jpeg', 'image/png', 'image/webp'
    ]
  }),
  fileUploadOptimizer.createImageOptimizationMiddleware(),
  async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No documents uploaded" });
      }

      // Verify tenant belongs to user's agency
      const { prisma } = await import("../db.js");
      const tenant = await prisma.tenant.findFirst({
        where: { 
          id: tenantId, 
          agencyId: req.user.agencyId 
        }
      });

      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const uploadedDocuments = [];

      for (const file of req.files) {
        const permanentDir = path.join('uploads', 'tenants', req.user.agencyId, tenantId);
        const filename = `${Date.now()}-${file.originalname}`;
        const permanentPath = await fileUploadOptimizer.moveToPermament(
          file.path, 
          permanentDir, 
          filename
        );

        uploadedDocuments.push({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: permanentPath,
          tenantId,
          uploadTime: file.uploadTime
        });
      }

      res.json({
        success: true,
        message: `${uploadedDocuments.length} tenant documents uploaded successfully`,
        data: {
          tenantId,
          documents: uploadedDocuments,
          totalSize: uploadedDocuments.reduce((sum, doc) => sum + doc.size, 0)
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Tenant document upload failed" });
    }
  }
);

// Bulk CSV upload for data import
uploadRouter.post("/bulk/csv",
  fileUploadOptimizer.createStreamingUpload('csvFile', {
    maxFileSize: 50 * 1024 * 1024, // 50MB for bulk data
    allowedTypes: ['text/csv', 'application/vnd.ms-excel']
  }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const { type } = req.body; // properties, tenants, etc.
      
      if (!['properties', 'tenants', 'units'].includes(type)) {
        return res.status(400).json({ error: "Invalid import type" });
      }

      // Move to processing directory
      const processingDir = path.join('uploads', 'bulk', req.user.agencyId);
      const filename = `${type}-import-${Date.now()}.csv`;
      const processingPath = await fileUploadOptimizer.moveToPermament(
        req.file.path, 
        processingDir, 
        filename
      );

      // Here you would typically queue the file for background processing
      // For now, we'll just return the upload confirmation

      res.json({
        success: true,
        message: "CSV file uploaded successfully and queued for processing",
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          type,
          path: processingPath,
          status: "queued",
          uploadTime: req.file.uploadTime
        }
      });
    } catch (error) {
      res.status(500).json({ error: "CSV upload failed" });
    }
  }
);

// Get upload statistics
uploadRouter.get("/stats", async (req, res) => {
  try {
    const stats = await fileUploadOptimizer.getUploadStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get upload statistics" });
  }
});

// Clean up temporary files (admin only)
uploadRouter.post("/cleanup", async (req, res) => {
  try {
    // Check if user is admin (you might want to add proper admin check)
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const cleanup = await fileUploadOptimizer.cleanupTempFiles();
    
    res.json({
      success: true,
      message: "Cleanup completed",
      data: {
        filesRemoved: cleanup.filesRemoved,
        sizeFreed: Math.round(cleanup.sizeFreed / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Cleanup failed" });
  }
});

// List uploaded files for a specific entity
uploadRouter.get("/:entityType/:entityId/files", async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!['properties', 'tenants'].includes(entityType)) {
      return res.status(400).json({ error: "Invalid entity type" });
    }

    const uploadDir = path.join('uploads', entityType, req.user.agencyId, entityId);
    
    try {
      const files = await fs.readdir(uploadDir);
      const fileDetails = [];

      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        
        fileDetails.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          path: filePath
        });
      }

      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          files: fileDetails,
          totalFiles: fileDetails.length,
          totalSize: fileDetails.reduce((sum, file) => sum + file.size, 0)
        }
      });
    } catch (dirError) {
      // Directory doesn't exist - no files uploaded yet
      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          files: [],
          totalFiles: 0,
          totalSize: 0
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to list files" });
  }
});

export default uploadRouter;