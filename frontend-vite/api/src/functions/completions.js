const { app } = require('@azure/functions');
const { getAppAccessToken } = require('../utils');
const { ReadableStream } = require('stream/web');



const handler = async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);

    // Información opcional del usuario
    const token = request.headers.get('x-ms-client-principal');
    console.log('Received token:', token);
    //get all headers from request
    const headers = { url: process.env.BASE_API_URL + '/stream/completions' };
    // request.headers.forEach((value, key) => {
    //     headers[key] = value;
    // });
    // const userInfo = token ? JSON.parse(Buffer.from(token, 'base64').toString('ascii')) : null;

    const accessToken = await getAppAccessToken();
    // return { status: 200, body: JSON.stringify({ token: accessToken }) };
    // if (!userInfo) {
    //     return { status: 401, body: "No user info found. User might not be authenticated." };
    // }

    const requestBody = await request.json();

    const response = await fetch(`${process.env.BASE_API_URL}/stream/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
    });

    return {
        status: response.status,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
        body: response.body.pipeThrough(new TransformStream({
            transform(chunk, controller) {
                const text = new TextDecoder().decode(chunk);
                const lines = text.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
                }
            }
        }))
    };
};

app.setup({ enableHttpStream: true });

app.http('completions', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: handler
});
