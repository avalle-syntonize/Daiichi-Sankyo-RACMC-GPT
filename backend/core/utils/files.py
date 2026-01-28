import logging
import time
import core.utils.config as cfg


def move_file_to_completed(
    blob_service_client,
    myblob,
    blob_name,
    blob_url,
    source_container_name,
    source_blob_client,
    creation_time,
    project_id,
    target_container_name: str = "completed",
    container_name: str = "documents",
):
    """Move a file to the completed container after a failed copy operation.

    Args:
        blob_service_client (BlobServiceClient): The Blob Service client used to interact with Azure Blob Storage.
        myblob (Blob): The blob object to be moved.
        blob_name (str): The name of the blob to be moved.
        blob_url (str): The URL of the blob to be moved.
        source_container_name (str): The name of the source container where the blob is located.
        source_blob_client (BlobClient): The Blob client for the source blob.
        creation_time (str): The date corresponding to the file creation time.
        language (str): The language code associated with the blob.
        target_container_name (str, optional): The name of the target container where the file will be moved (default is "completed").
        container_name (str, optional): The name of the container (default is "documents").

    Returns:
        None
    """
    target_blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob=f"{target_container_name}/{project_id}/{creation_time}/{blob_name}",
    )

    try:
        target_blob_client.start_copy_from_url(blob_url)

        wait_for_copy_completion(
            target_blob_client,
            blob_name,
            source_container_name,
            target_container_name,
            source_blob_client,
        )
    except Exception as e:
        logging.error(
            "Failed to copy blob %s from %s to %s: %s",
            blob_name,
            source_container_name,
            target_container_name,
            e,
        )

        move_file_to_failed(
            blob_service_client,
            myblob,
            source_container_name,
            source_blob_client,
            creation_time,
            project_id,
            blob_name,
            blob_url,
        )
        raise e


def move_file_to_failed(
    blob_service_client,
    myblob,
    source_container_name,
    source_blob_client,
    creation_time,
    project_id,
    new_blob_name: str = "",
    new_blob_url: str = "",
    container_name: str = "documents",
    failed_container_name: str = "failed",
):
    """
    Move a file to the failed container after a failed copy operation.

    Parameters:
        blob_service_client: The Blob Service client.
        myblob: The blob object to be moved.
        source_container_name: The name of the source container.
        source_blob_client: The source Blob client.
        container_name: The container name (default is "documents").
        failed_container_name: The name of the failed container where the file will be moved (default is "failed").
        creation_time: date correspondant to the file creation time

    Returns:
        None
    """
    blob_name = myblob.uri.split("/")[-1] if not new_blob_name else new_blob_name
    copy_source = myblob.uri if not new_blob_url else new_blob_url

    failed_blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob=f"{failed_container_name}/{project_id}/{creation_time}/{blob_name}",
    )
    try:
        failed_blob_client.start_copy_from_url(copy_source)
        wait_for_copy_completion(
            failed_blob_client,
            blob_name,
            source_container_name,
            failed_container_name,
            source_blob_client,
        )
    except Exception as e:
        logging.error(
            "Failed to move blob %s to %s due to: %s",
            blob_name,
            failed_container_name,
            e,
        )
        raise e


def wait_for_copy_completion(
    blob_client,
    blob_name,
    source_container_name,
    target_container_name,
    source_blob_client,
):
    """
    Wait for a blob copy operation to complete in Azure Blob Storage.

    Parameters:
    - blob_client (BlobClient): The BlobClient for the target blob where the file is being copied.
    - blob_name (str): The name of the target blob.
    - source_container_name (str): The name of the container where the source blob is located.
    - target_container_name (str): The name of the container where the target blob will be copied.
    - source_blob_client (BlobClient): The BlobClient for the source blob that is being copied.
    Returns:
    - bool: True if the copy operation completed within the timeout, False otherwise.
    """

    max_wait_time = 300
    start_time = time.time()
    logging.info("Waiting for file: %s to finish copying.", blob_name)

    while (time.time() - start_time) < max_wait_time:
        props = blob_client.get_blob_properties()
        if props.copy.status != "pending":
            break
        time.sleep(1)

    if props.copy.status == "success":
        source_blob_client.delete_blob()
        logging.info(
            "Blob %s moved from %s to %s",
            blob_name,
            source_container_name,
            target_container_name,
        )
    else:
        raise Exception(f"Copy operation failed with status: {props.copy.status}")


def rename_file(
    blob_service_client,
    container_name,
    source_container_name,
    blob_name,
    myblob,
    formatted_date,
    project_id
) -> str:
    """Rename a file in a specified blob storage container by copying it to an 'inprogress' folder and modifying its name.

    Args:
        blob_service_client (BlobServiceClient): The Azure Blob Service client used to interact with the blob storage.
        container_name (str): The name of the container where the file will be renamed.
        source_container_name (str): The name of the source container from which the file is being copied.
        blob_name (str): The name of the blob (file) to be renamed.
        myblob (Blob): The blob object representing the file to be renamed.
        formatted_date (str): A formatted date string used for logging or naming purposes.
        language (str): The language to be appended to the file name.

    Returns:
        str: The new name of the renamed file.

    Raises:
        Exception: If the copy operation fails, an error is logged and the file is moved to a failed state.
    """
    # language_code = cfg.LANGUAGES_CODE[language]

    language_code = ''

    logging.info("Start rename file %s", blob_name)
    filename_replace = blob_name.replace(" ", "_")
    if not filename_replace.endswith(f"_{language_code}.pdf"):
        filename_replace = (
            filename_replace.split(".")[0]
            + f"_{language_code}."
            + filename_replace.split(".")[1]
        )

    blob_client = blob_service_client.get_blob_client(
        container=container_name, blob=f"{source_container_name}/{blob_name}"
    )
    new_blob_client = blob_service_client.get_blob_client(
        container=container_name, blob=f"inprogress/{filename_replace}"
    )

    try:
        logging.info("Start copying %s into inprogress folder.", blob_client.url)
        new_blob_client.start_copy_from_url(blob_client.url)

        wait_for_copy_completion(
            new_blob_client,
            blob_name,
            source_container_name,
            source_container_name,
            blob_client,
        )
    except Exception as e:
        logging.error(
            "Failed to copy blob %s from %s to %s: %s",
            blob_name,
            filename_replace,
            source_container_name,
            e,
        )

        move_file_to_failed(
            blob_service_client,
            myblob,
            source_container_name,
            blob_client,
            formatted_date,
            project_id
        )
        raise e

    logging.info("End rename file %s", filename_replace)
    return filename_replace