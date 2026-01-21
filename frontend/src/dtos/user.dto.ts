import { AdapterUser } from "next-auth/adapters";

export interface UserInfoDTO {
    "@odata.context": string;
    businessPhones: any[];
    displayName: string;
    givenName: string;
    jobTitle: string;
    roles: string[];
    mail: string;
    mobilePhone: string;
    officeLocation: string;
    preferredLanguage: string;
    surname: string;
    userPrincipalName: string;
    id: string;
}

export interface SessionUser extends AdapterUser{
    email: string;
    name: string;
    id: string;
    type: string;
    roles: string[];
} 

export interface UserApp{
    accessToken: string;
    idToken: string;
    user: SessionUser;
}