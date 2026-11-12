import { BadRequest, InternalServerError } from "@curveball/http-errors";
import Logger from '../Services/Logging/Logger';
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from 'express';
import ServiceLocator from "../ServiceLocator";
import multer from "multer";
import { getErrorMessage } from '../errorUtils';
/* eslint-disable @typescript-eslint/no-explicit-any -- multer has no type declarations installed (@types/multer); revisit if that's added */

const storage = multer.memoryStorage();

const BlobService = ServiceLocator.blobService();

const CONTAINER_NAME = 'candidate-photos';

// The frontend always re-encodes to a 300px JPEG (PhotoUtil.js), so anything else is
// not coming from our UI. In particular this keeps out image/svg+xml, which can carry script.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Uploads are buffered in memory before going to blob storage, so the cap is also a
// bound on memory per request. A 300px JPEG is tens of kilobytes.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const fileFilter = (req: any, file: any, cb: any) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  });

interface ImageRequest extends Request {
    file: any
}

// TODO: add multer file and S3 types
const uploadImageController = async (req: ImageRequest, res: Response, _next: NextFunction) => {
    const file = req.file
    if (!file) {
        throw new BadRequest("No image file provided");
    }
    const blobName = `${randomUUID()}.jpg`;
    try {
      const photo_filename = await BlobService.uploadBufferToBlob(
        CONTAINER_NAME,
        blobName,
        file.buffer,
        file.mimetype,
        (progress: any) => Logger.info(req, progress),
      );

      Logger.info(req, `File uploaded successfully. ${photo_filename}`);
      res.json({ photo_filename });
    } catch (e: unknown) {
      throw new InternalServerError(getErrorMessage(e));
    }
}

export {
    uploadImageController,
    upload,
}
