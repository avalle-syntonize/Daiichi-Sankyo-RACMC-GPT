import azure.functions as func
# from ingestor.main import blob_trigger_process
from dotenv import load_dotenv
from azure.functions import AsgiMiddleware
from api.main import app as app_api
load_dotenv()

app = func.FunctionApp()

# ----------------------------
# HTTP route for FastAPI
# ----------------------------
@app.function_name(name="api")
@app.route(route="{*path}", auth_level=func.AuthLevel.ANONYMOUS)
def main(req: func.HttpRequest, context: func.Context):
    return AsgiMiddleware(app_api).handle(req, context)
    # return func.HttpResponse("API is under construction.", status_code=200)


# ----------------------------
# Blob trigger
# ----------------------------
# @app.blob_trigger(
#     arg_name="myblob",
#     path="documents/input/{folder}/{name}",
#     connection="BlobStorageConnectionString",
# )
# def blob_trigger(myblob: func.InputStream):
#     """
#     Waits for a new blob to be uploaded to a container and triggers the azure function.
#     """
#     blob_trigger_process(myblob)