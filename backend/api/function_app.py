import azure.functions as func
from azure.functions import AsgiMiddleware
from main import app 

app_function = func.FunctionApp()

# Ruta catch-all 
@app_function.function_name(name="FastAPI")
@app_function.route(route="{*path}", auth_level=func.AuthLevel.ANONYMOUS)
def main(req: func.HttpRequest, context: func.Context):
    return AsgiMiddleware(app).handle(req, context)
