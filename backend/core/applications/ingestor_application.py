from core.domain.ports.Ingestor_repository import IngestorRepository


class IngestorApplication:
    def __init__(self, respository: IngestorRepository):
        self.repository = respository

    def process(self, new_blob_name, source_blob_client, blob_completed, language):
        return self.repository.process(new_blob_name, source_blob_client, blob_completed, language)