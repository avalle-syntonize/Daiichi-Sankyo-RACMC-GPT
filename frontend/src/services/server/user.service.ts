
import { UserInfoDTO } from "@/dtos/user.dto";


const urlEndpointBase = process.env.NEXT_PUBLIC_API_URL

class UserService {
    async getUserInfoFromToken(token: string):Promise<UserInfoDTO | null> {
        // TODO : Implementar llamada al backend para obtener la info del usuario
        return null;
    }
}

export default new UserService()