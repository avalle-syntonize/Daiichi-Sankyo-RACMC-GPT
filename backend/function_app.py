import azure.functions as func
from ingestor.main import blob_trigger_process
from dotenv import load_dotenv
from azurefunctions.extensions.http.fastapi import Request as FastApiRequest, StreamingResponse, JSONResponse
# from azure.functions import AsgiMiddleware
from api.main import app as app_api, CompletionsRequest, app_chatbot
from fastapi.responses import HTMLResponse

load_dotenv()

app = func.FunctionApp()

# ----------------------------
# Completions (no streaming)
# ----------------------------
@app.route(route="completions", methods=["POST"])
async def completions(req: FastApiRequest):
    body = await req.json()
    payload = CompletionsRequest(**body)
    context = payload.context
    response = await app_chatbot.get_completions(context, stream_response=False)
    return JSONResponse(response)


# ----------------------------
# Streaming endpoint completions
# ----------------------------
@app.function_name(name="stream_completions")
@app.route(route="stream/completions", methods=["POST"], auth_level=func.AuthLevel.ANONYMOUS)
async def stream_completions(req: FastApiRequest) -> StreamingResponse:
    body = await req.json()
    payload = CompletionsRequest(**body)
    context = payload.context
    # GET APP CHATBOT RESPONSE AS STREAMING RESPONSE
    response = await app_chatbot.get_completions(context, stream_response=True)
    return response  # AS StreamingResponse


# ----------------------------
# Docs (opcional - redirect manual)
# ----------------------------
@app.route(route="docs", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
async def docs(req: FastApiRequest):
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Docs</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
            SwaggerUIBundle({
                url: '/api/openapi.json',
                dom_id: '#swagger-ui'
            });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(html)


@app.route(route="openapi.json", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
async def openapi(req: FastApiRequest):
    return JSONResponse(app_api.openapi())

# # ----------------------------
# # HTTP route for API
# # ----------------------------
# @app.function_name(name="api")
# @app.route(route="{*path}", auth_level=func.AuthLevel.ANONYMOUS)
# def main(req, context):
#     return AsgiMiddleware(app_api).handle(req, context)
#     # return func.HttpResponse("API is under construction.", status_code=200)


# ----------------------------
# Blob trigger
# ----------------------------
@app.blob_trigger(
    arg_name="myblob",
    path="documents/input/{folder}/{name}",
    connection="BlobStorageConnectionString",
)
def blob_trigger(myblob: func.InputStream):
    """
    Waits for a new blob to be uploaded to a container and triggers the azure function.
    """
    blob_trigger_process(myblob)