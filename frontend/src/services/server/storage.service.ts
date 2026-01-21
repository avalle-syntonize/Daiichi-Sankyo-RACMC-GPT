import { getSession } from "@/auth.config";
import { UnauthorizedError } from "@/custom/exceptions/unauthorizedError";
import { StorageTokenDTO } from "@/dtos/storage.dto";



const urlEndpointBase = process.env.NEXT_PUBLIC_API_URL;

class StorageService {
    async getSasTokenFromServer(): Promise<StorageTokenDTO> {
        const session = await getSession();
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", `${session?.accessToken!}`);

        const requestOptions: RequestInit = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };
        const request = await fetch(`${urlEndpointBase}/Storage/Token`, requestOptions)

        if (request.status == 401) throw new UnauthorizedError();

        const response = await request.json() as StorageTokenDTO

        return response
    }
}

export default new StorageService()