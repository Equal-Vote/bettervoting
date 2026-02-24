export default class BlobService {
    client;

    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set. Set it in your environment or use the mock BlobService in tests.');
        }
        // require lazily to avoid loading the azure sdk during build/generate steps
        const { BlobServiceClient } = require('@azure/storage-blob');
        this.client = BlobServiceClient.fromConnectionString(connectionString);
    }

    uploadBufferToBlob = async (
        containerName: string,
        blobName: string,
        buffer: Buffer,
        contentType?: string,
        onProgress?: (progress: any) => void,
    ): Promise<string> => {
        if(!this.client) throw new Error("Couldn't upload to blob, client wasn't initialized since AZURE_STORAGE_CONNECTION_STRING wasn't properly set")

        const containerClient = this.client.getContainerClient(containerName);
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
}