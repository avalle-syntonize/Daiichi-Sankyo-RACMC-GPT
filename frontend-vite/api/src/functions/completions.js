const { app } = require('@azure/functions');

const handler = async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);

    // Información opcional del usuario
    const token = request.headers.get('x-ms-client-principal');
    // const userInfo = token ? JSON.parse(Buffer.from(token, 'base64').toString('ascii')) : null;

    // if (!userInfo) {
    //     return { status: 401, body: "No user info found. User might not be authenticated." };
    // }

    const requestBody = await request.json();

    const response = await fetch(`https://racmc-gpt-dev-func-backend.azurewebsites.net/api/stream/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    return {
        status: response.status,
        headers: {
            'Content-Type': 'application/x-ndjson',
        },
        body: response.body
    };
};

app.setup({ enableHttpStreaming: true });

app.http('completions', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: handler
});
