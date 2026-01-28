from core.processors.orchestrator import ProcessorOrchestrator
from core.domain.ports.Ingestor_repository import IngestorRepository


class IngestorAdapter(IngestorRepository):
    
     def __init__(self):
        self.orchestrator = ProcessorOrchestrator()
     
     def process(self, new_blob_name, source_blob_client, blob_completed, project_id):
         return self.orchestrator.process(new_blob_name, source_blob_client, blob_completed, project_id)