import { InternalServerError } from "@curveball/http-errors";
import Logger from '../Services/Logging/Logger';
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from 'express';
import { uploadBufferToBlob } from '../Services/azureBlobService';

const multer = require("multer");

const storage = multer.memoryStorage();

const CONTAINER_NAME = 'candidate-photos';

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.split("/")[0] === "image") {
        cb(null, true);
    } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1000000000, files: 1 },
  });

interface ImageRequest extends Request {
    file: any
}

// TODO: add multer file and S3 types
const uploadImageController = async (req: ImageRequest, res: Response, next: NextFunction) => {
    const file = req.file
    const blobName = `${randomUUID()}.jpg`;
    try {
      const photo_filename = await uploadBufferToBlob(
        CONTAINER_NAME,
        blobName,
        file.buffer,
        file.mimetype,
        (progress: any) => Logger.info(req, progress),
      );

      Logger.info(req, `File uploaded successfully. ${photo_filename}`);
      res.json({ photo_filename });
    } catch (e: any) {
      throw new InternalServerError(e);
    }
}

export {
    uploadImageController,
    upload,
}
