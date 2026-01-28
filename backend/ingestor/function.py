{
    "bindings": [
        {
        "name": "ingestor",
        "type": "blobTrigger",
        "direction": "in",
        "path": "documents/input/{folder}/{name}",
        "connection": "BlobStorageConnectionString"
        }
    ],
    "scriptFile": "function_app.py"
}