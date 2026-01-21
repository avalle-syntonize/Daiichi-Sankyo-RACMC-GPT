'use client';
import { UnauthorizedError } from "@/custom/exceptions/unauthorizedError";
import { StorageTokenDTO } from "@/dtos/storage.dto";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from 'uuid';

class StorageClientService {
    private _accountName: string;
    private _blobContainer: string;
    constructor() {
        this._accountName = process.env.NEXT_PUBLIC_BLOB_ACCOUNT_NAME || '';
        this._blobContainer = process.env.NEXT_PUBLIC_BLOB_CONTAINER || '';
    }

    private async getSasToken() {
        const myHeaders = new Headers();

        const requestOptions: RequestInit = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };
        const request = await fetch(`api/storage/token`, requestOptions)

        if (request.status == 401) throw new UnauthorizedError();

        const response = await request.json() as StorageTokenDTO

        return response
    }

    public uploadFileToBlob = async (file: File) => {
        if (!file) return '';

        const destDirectory = `${uuidv4()}`;
        const fileName = `${uuidv4()}-${file.name}`;
        // upload file
        return await this.createBlobInContainer(file, destDirectory, fileName);
    };

    private createBlobInContainer = async (file: File, destDirectory: string, destFileName: string) => {
        // create blobClient for container
        const containerClient = await this.getBlobClient();
        // await containerClient.createIfNotExists();
        const directoryName = destFileName;
        const blobClient = containerClient.getBlockBlobClient(directoryName);

        // set mimetype as determined from browser with file upload control
        const options = { blobHTTPHeaders: { blobContentType: file.type } };
        // upload file
        const uploadResult = await blobClient.uploadData(file, options);
        return uploadResult._response.request.url.split('?')[0]; // Remove undesired query params
    };

    private async getBlobClient(): Promise<ContainerClient> {
        const sasToken = await this.getSasToken();
        const uploadUrl = `https://${this._accountName}.blob.core.windows.net/?${sasToken.sasToken}`;
        const blobService = new BlobServiceClient(uploadUrl);
        return blobService.getContainerClient(this._blobContainer!);
    }

}

export default new StorageClientService()