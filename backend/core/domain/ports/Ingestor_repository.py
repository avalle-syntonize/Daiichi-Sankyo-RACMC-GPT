from abc import ABC, abstractmethod

class IngestorRepository(ABC):

    @abstractmethod
    def process(self, new_blob_name: str, source_blob_client: str, blob_completed: bool, project_id: str) -> None:
        pass


