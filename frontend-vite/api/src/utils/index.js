


export async function getAppAccessToken() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("client_id", process.env.AZURE_AD_APP_CLIENT_ID);
    urlencoded.append("client_secret", process.env.AZURE_AD_APP_CLIENT_SECRET);
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("scope", `${process.env.TENANT_ID}/.default`);

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
    };

    const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`, requestOptions)

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}