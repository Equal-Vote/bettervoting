import type { TransferProgressEvent } from '@azure/core-rest-pipeline';

export default class BlobService {
  public uploaded: { containerName: string; blobName: string; contentType?: string; buffer: Buffer }[];

  constructor() {
    this.uploaded = [];
  }

  uploadBufferToBlob = async (
    containerName: string,
    blobName: string,
    buffer: Buffer,
    contentType?: string,
    _onProgress?: (progress: TransferProgressEvent) => void,
  ) => {
    this.uploaded.push({ containerName, blobName, contentType, buffer });
    return `https://mock.blob/${containerName}/${blobName}`;
  }

  clear = () => {
    this.uploaded = [];
  }
}
