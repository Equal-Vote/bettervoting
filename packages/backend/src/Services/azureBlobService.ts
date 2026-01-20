import { BlobServiceClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
if (!connectionString) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

export async function uploadBufferToBlob(
  containerName: string,
  blobName: string,
  buffer: Buffer,
  contentType?: string,
  onProgress?: (progress: any) => void,
): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    onProgress,
    blobHTTPHeaders: {
      blobContentType: contentType || 'application/octet-stream',
    },
  });

  return blockBlobClient.url;
}

export default { uploadBufferToBlob };
