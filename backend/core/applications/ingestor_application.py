class IngestorApplication:
    def __init__(self, respository):
        self.repository = respository

    def process(self, new_blob_name, source_blob_client, blob_completed, language):
        return self.repository.process(new_blob_name, source_blob_client, blob_completed, language)