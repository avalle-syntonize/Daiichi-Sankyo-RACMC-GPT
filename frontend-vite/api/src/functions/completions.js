const { app } = require('@azure/functions');

const handler = async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);

    // Obtener token Azure AD
    // const token = request.headers.get('x-ms-token-aad-id-token');

    // if (!token) {
    //     return { status: 401, body: "No token found. User might not be authenticated." };
    // }

    // Información opcional del usuario
    const token = request.headers.get('x-ms-client-principal');
    const userInfo = token ? JSON.parse(Buffer.from(token, 'base64').toString('ascii')) : null;

    if (!userInfo){
        return { status: 401, body: "No user info found. User might not be authenticated." };
    }

    context.log('User info:', userInfo);

    const name = request.query.get('name') || 'world';

    return {
        status: 200,
        body: JSON.stringify({ userInfo }),
    };
};

app.http('completions', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: handler
});
