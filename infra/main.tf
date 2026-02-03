terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.0"
    }
    azapi = {
      source = "Azure/azapi"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
  subscription_id = var.subscription_id
}

provider "azapi" {
  skip_provider_registration = false
  subscription_id            = var.subscription_id
}

# Data source to get current client configuration
data "azurerm_client_config" "current" {}

# Resource Group for RACMC-GPT
resource "azurerm_resource_group" "racmc" {
  name     = "rg-racmc-${var.environment}"
  location = var.location
  tags     = var.tags
}

# Storage Account (Free tier: 5GB)
# Note: Storage account names must be 3-24 characters, lowercase letters and numbers only
resource "azurerm_storage_account" "main" {
  name                     = lower(substr("st${replace(var.project_name, "-", "")}${var.environment}", 0, 24))
  resource_group_name      = azurerm_resource_group.racmc.name
  location                 = azurerm_resource_group.racmc.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_account_replication

  tags = var.tags
}

# Storage Container for application data
resource "azurerm_storage_container" "data" {
  name                  = "data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Storage Container for blob documents
resource "azurerm_storage_container" "documents" {
  name                  = "documents"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}


# Key Vault (Free tier: 10k operations/month)
# Note: Key Vault names must be 3-24 characters and globally unique
resource "azurerm_key_vault" "main" {
  name                = substr("kv-${var.project_name}-${var.environment}", 0, 24)
  location            = azurerm_resource_group.racmc.location
  resource_group_name = azurerm_resource_group.racmc.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = var.key_vault_sku

  purge_protection_enabled   = false
  soft_delete_retention_days = 7

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Update"
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Update"
    ]
  }

  tags = var.tags
}


# Static Web App Module (Free tier)
# module "static_web_app" {
#   source = "./modules/static_web_app"

#   name                = "${var.project_name}-${var.environment}"
#   location            = azurerm_resource_group.racmc.location
#   resource_group_name = azurerm_resource_group.racmc.name
#   sku_tier            = var.static_web_app_sku_tier
#   sku_size            = var.static_web_app_sku_size
#   tags                = var.tags
# }


# AI Search Module (Free tier: 50MB, 10k docs)
module "ai_search" {
  source = "./modules/ai_search"

  name                = "${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.racmc.location
  resource_group_name = azurerm_resource_group.racmc.name
  sku                 = var.ai_search_sku
  replica_count       = var.ai_search_replica_count
  partition_count     = var.ai_search_partition_count
  tags                = var.tags
}


resource "azurerm_key_vault_secret" "azure_search_key" {
  name         = "azure-search-key"
  value        = module.ai_search.primary_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "azure_openai_key" {
  name         = "azure-openai-key"
  value        = var.azure_openai_key
  key_vault_id = azurerm_key_vault.main.id
}

# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = lower(substr("acr${replace(var.project_name, "-", "")}${var.environment}", 0, 30))
  resource_group_name = azurerm_resource_group.racmc.name
  location            = azurerm_resource_group.racmc.location
  sku                 = var.acr_sku
  admin_enabled       = true

  tags = var.tags
}

# App Service Plan (Linux)
resource "azurerm_service_plan" "plan" {
  name                = "${var.project_name}-${var.environment}-plan"
  location            = azurerm_resource_group.racmc.location
  resource_group_name = azurerm_resource_group.racmc.name
  # `kind` and `reserved` are set automatically by the provider and must not be configured here

  # azurerm_service_plan requires sku_name and os_type
  sku_name = var.app_service_plan_size
  os_type  = "Linux"

  tags = var.tags
}

# Frontend App Service (container from ACR)
resource "azurerm_linux_web_app" "frontend" {
  name                = "${var.project_name}-${var.environment}-web"
  resource_group_name = azurerm_resource_group.racmc.name
  location            = azurerm_resource_group.racmc.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    application_stack {
      docker_image_name = "${azurerm_container_registry.acr.login_server}/${var.frontend_image}:${var.image_tag}"
    }
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
  }

  tags = var.tags
}

# service plan for function app backend
resource "azurerm_service_plan" "func_plan" {
  name                = "${var.project_name}-${var.environment}-func-plan"
  resource_group_name = azurerm_resource_group.racmc.name
  location            = azurerm_resource_group.racmc.location

  os_type  = "Linux"
  sku_name = var.function_app_service_plan_size
}

resource "azurerm_application_insights" "app_insights" {
  name                = "${var.project_name}-${var.environment}-app-insights"
  location            = azurerm_resource_group.racmc.location
  resource_group_name = azurerm_resource_group.racmc.name
  application_type    = "web"
}


# # Backend
resource "azurerm_linux_function_app" "backend" {
  name                        = "${var.project_name}-${var.environment}-func-backend"
  resource_group_name         = azurerm_resource_group.racmc.name
  location                    = azurerm_resource_group.racmc.location
  service_plan_id             = azurerm_service_plan.func_plan.id
  functions_extension_version = "~4"
  storage_account_name        = azurerm_storage_account.main.name
  storage_account_access_key  = azurerm_storage_account.main.primary_access_key


  # zip_deploy_file = "./function_app.zip"

  site_config {
    application_stack {
      python_version = "3.13"
    }

    always_on = true
  }


  app_settings = {
    SCM_DO_BUILD_DURING_DEPLOYMENT = true
    WEBSITE_RUN_FROM_PACKAGE             = "0"
    AzureWebJobsStorage = azurerm_storage_account.main.primary_connection_string
    # WEBSITES_PORT                        = "80"
    # WEBSITES_ENABLE_APP_SERVICE_STORAGE  = "true"
    FUNCTIONS_EXTENSION_VERSION = "~4"
    BlobStorageConnectionString = azurerm_storage_account.main.primary_connection_string
    AzureWebJobsFeatureFlags             = "EnableWorkerIndexing"
    FUNCTIONS_WORKER_RUNTIME             = "python"
    ENABLE_ORYX_BUILD                    = true
    AZURE_OPENAI_ENDPOINT                = "https://genai-research-eastus2.openai.azure.com/"
    AZURE_OPENAI_KEY                     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_openai_key.id})"
    AZURE_OPENAI_PREVIEW_API_VERSION     = "2024-12-01-preview"
    AZURE_OPENAI_API_KEY                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_openai_key.id})"
    AZURE_OPENAI_API_VERSION             = "2024-12-01-preview"
    OPENAI_API_VERSION                   = "2024-12-01-preview"
    AZURE_DEPLOYMENT_EMBEDDING           = "text-embedding-3-large"
    AZURE_OPENAI_EMBEDDING_NAME          = "text-embedding-3-large"
    AZURE_OPENAI_EMBEDDING_ENDPOINT      = "https://genai-research-eastus2.openai.azure.com/"
    AZURE_OPENAI_EMBEDDING_KEY           = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_openai_key.id})"
    SEARCH_TOP_K                         = "5"
    SEARCH_STRICTNESS                    = "3"
    SEARCH_ENABLE_IN_DOMAIN              = "true"
    AZURE_SEARCH_SERVICE                 = "srch-racmc-gpt-dev"
    AZURE_SEARCH_INDEX                   = "semantic-index"
    AZURE_SEARCH_ENDPOINT                = module.ai_search.search_endpoint
    AZURE_SEARCH_KEY                     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_search_key.id})"
    AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG  = "default"
    AZURE_SEARCH_INDEX_IS_PRECHUNKED     = "False"
    AZURE_SEARCH_TOP_K                   = "5"
    AZURE_SEARCH_ENABLE_IN_DOMAIN        = "false"
    AZURESEARCH_FIELDS_CONTENT_VECTOR    = "contentVector"
    AZURE_SEARCH_CONTENT_COLUMNS         = ""
    AZURE_SEARCH_FILENAME_COLUMN         = ""
    AZURE_SEARCH_TITLE_COLUMN            = ""
    AZURE_SEARCH_URL_COLUMN              = ""
    AZURE_SEARCH_VECTOR_COLUMNS          = ""
    AZURE_SEARCH_QUERY_TYPE              = "simple"
    AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = ""
    AZURE_SEARCH_STRICTNESS              = "2",
    AZURE_OPENAI_TOP_P                   = "0.95",
    AZURE_OPENAI_MAX_TOKENS              = "1024",
    AZURE_OPENAI_TEMPERATURE             = "0.7",
    AZURE_OPENAI_STOP_SEQUENCE           = "stop all tokens"
    APPINSIGHTS_INSTRUMENTATIONKEY       = azurerm_application_insights.app_insights.instrumentation_key
  }

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}


resource "azurerm_key_vault_access_policy" "func" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_function_app.backend.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List"
  ]

  depends_on = [
    azurerm_linux_function_app.backend
  ]
}


resource "azurerm_role_assignment" "func_kv_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_function_app.backend.identity[0].principal_id

  depends_on = [
    azurerm_linux_function_app.backend
  ]

}

data "azurerm_function_app_host_keys" "keys" {
  name                = azurerm_linux_function_app.backend.name
  resource_group_name = azurerm_resource_group.racmc.name
}

# resource "azurerm_function_app_flex_consumption" "backend" {
#   name                = "${var.project_name}-${var.environment}-func-backend"
#   resource_group_name = azurerm_resource_group.racmc.name
#   location            = azurerm_resource_group.racmc.location
#   service_plan_id     = azurerm_service_plan.func_plan.id

#   storage_container_type      = "blobContainer"
#   storage_container_endpoint  = "${azurerm_storage_account.main.primary_blob_endpoint}${azurerm_storage_container.data.name}"
#   storage_authentication_type = "StorageAccountConnectionString"
#   storage_access_key          = azurerm_storage_account.main.primary_access_key
#   runtime_name                = "python"
#   runtime_version             = "3.11"
#   maximum_instance_count      = 50
#   instance_memory_in_mb       = 2048

#   identity {
#     type = "SystemAssigned"
#   }

#   site_config {
#   }

#   app_settings = {
#     AzureWebJobsStorage         = azurerm_storage_account.main.primary_connection_string
#     WEBSITES_PORT               = "80"
#     FUNCTIONS_EXTENSION_VERSION = "~4"
#     BlobStorageConnectionString = azurerm_storage_account.main.primary_connection_string
#     AzureWebJobsFeatureFlags  = "EnableWorkerIndexing"
#     # FUNCTIONS_WORKER_RUNTIME = "python"
#     AZURE_OPENAI_ENDPOINT = "https://genai-research-eastus2.openai.azure.com/"
#     AZURE_OPENAI_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_openai_key.id})"
#     AZURE_OPENAI_PREVIEW_API_VERSION = "2024-12-01-preview"
#     AZURE_OPENAI_API_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_openai_key.id})"
#     AZURE_OPENAI_API_VERSION = "2024-12-01-preview"
#     OPENAI_API_VERSION = "2024-12-01-preview"
#     AZURE_DEPLOYMENT_EMBEDDING = "text-embedding-3-large"
#     AZURE_OPENAI_EMBEDDING_NAME = "text-embedding-3-large"
#     AZURE_OPENAI_EMBEDDING_ENDPOINT = "https://genai-research-eastus2.openai.azure.com/"
#     AZURE_OPENAI_EMBEDDING_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_openai_key.id})"
#     SEARCH_TOP_K = "5"
#     SEARCH_STRICTNESS = "3"
#     SEARCH_ENABLE_IN_DOMAIN = "true"
#     AZURE_SEARCH_SERVICE = "srch-racmc-gpt-dev"
#     AZURE_SEARCH_INDEX = "semantic-index"
#     AZURE_SEARCH_ENDPOINT = module.ai_search.search_endpoint
#     AZURE_SEARCH_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.azure_search_key.id})"
#     AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG = "default"
#     AZURE_SEARCH_INDEX_IS_PRECHUNKED = "False"
#     AZURE_SEARCH_TOP_K = "5"
#     AZURE_SEARCH_ENABLE_IN_DOMAIN = "false"
#     AZURESEARCH_FIELDS_CONTENT_VECTOR = "contentVector"
#     AZURE_SEARCH_CONTENT_COLUMNS = ""
#     AZURE_SEARCH_FILENAME_COLUMN = ""
#     AZURE_SEARCH_TITLE_COLUMN = ""
#     AZURE_SEARCH_URL_COLUMN = ""
#     AZURE_SEARCH_VECTOR_COLUMNS = ""
#     AZURE_SEARCH_QUERY_TYPE = "simple"
#     AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = ""
#     AZURE_SEARCH_STRICTNESS = "2",
#     AZURE_OPENAI_TOP_P = "0.95",
#     AZURE_OPENAI_MAX_TOKENS = "1024",
#     AZURE_OPENAI_TEMPERATURE = "0.7",
#     AZURE_OPENAI_STOP_SEQUENCE = "stop all tokens"
#   }
# }



# ========================================
# Event Grid Subscription: Blob Created -> Function App
# ========================================

# data "azurerm_function_app_host_keys" "keys" {
#   name                = azurerm_function_app_flex_consumption.backend.name
#   resource_group_name = azurerm_resource_group.racmc.name
# }

# resource "azurerm_eventgrid_event_subscription" "ingestor_blob_to_function" {
#   name  = "ingestor-blob-to-func-${var.environment}"
#   scope = azurerm_storage_account.main.id
#   event_delivery_schema = "EventGridSchema"

#   webhook_endpoint {
#     url = "https://${azurerm_function_app_flex_consumption.backend.default_hostname}/runtime/webhooks/eventgrid?functionName=blob_trigger&code=${data.azurerm_function_app_host_keys.keys.default_function_key}"
#   }

#   included_event_types = [
#     "Microsoft.Storage.BlobCreated",
#   ]

#   depends_on = [
#     azurerm_function_app_flex_consumption.backend
#   ]
# }

# resource "azurerm_eventgrid_event_subscription" "blob_to_function" {
#   name  = "ingestor-blob-to-func-${var.environment}"
#   scope = azurerm_storage_account.main.id

#   event_delivery_schema = "EventGridSchema"
#   included_event_types  = ["Microsoft.Storage.BlobCreated"]

#   subject_filter {
#     subject_begins_with = "/blobServices/default/containers/documents/input/"
#   }

#   azure_function_endpoint {
#     function_id = "${azurerm_function_app_flex_consumption.backend.id}/functions/blob_trigger"
#   }

#   # azure_function_endpoint {
#   #   function_id = azurerm_function_app_flex_consumption.backend.id
#   # }

#   retry_policy {
#     max_delivery_attempts = 5
#     event_time_to_live    = 1440
#   }
# }



# ========================================
# Key Vault Access Policy para Function
# ========================================
# resource "azurerm_key_vault_access_policy" "func_kv_policy" {
#   key_vault_id = azurerm_key_vault.main.id
#   tenant_id    = data.azurerm_client_config.current.tenant_id
#   object_id    = azurerm_function_app_flex_consumption.backend.identity[0].principal_id

#   secret_permissions = [
#     "Get",
#     "List"
#   ]
# }

# resource "azurerm_function_app_flex_consumption" "trigger_blob" {
#   name                = "${var.project_name}-${var.environment}-func-blob-trigger"
#   resource_group_name = azurerm_resource_group.racmc.name
#   location            = azurerm_resource_group.racmc.location
#   service_plan_id     = azurerm_service_plan.trigger_blob_plan.id

#   storage_container_type      = "blobContainer"
#   storage_container_endpoint  = "${azurerm_storage_account.main.primary_blob_endpoint}${azurerm_storage_container.data.name}"
#   storage_authentication_type = "StorageAccountConnectionString"
#   storage_access_key          = azurerm_storage_account.main.primary_access_key
#   runtime_name                = "python"
#   runtime_version             = "3.11"
#   maximum_instance_count      = 50
#   instance_memory_in_mb       = 2048

#   site_config {
#   }

#   app_settings = {
#     # FUNCTIONS_WORKER_RUNTIME       = "python"
#     AzureWebJobsStorage            = azurerm_storage_account.main.primary_connection_string
#     FUNCTIONS_EXTENSION_VERSION    = "~4"
#     AzureWebJobsFeatureFlags       = "EnableWorkerIndexing"
#     BlobStorageConnectionString    = azurerm_storage_account.main.primary_connection_string
#     APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.app_insights.instrumentation_key
#   }

# }

# resource "azurerm_linux_function_app" "backend" {
#   name                        = "${var.project_name}-${var.environment}-func-backend"
#   resource_group_name         = azurerm_resource_group.racmc.name
#   location                    = azurerm_resource_group.racmc.location
#   service_plan_id             = azurerm_service_plan.func_plan.id
#   functions_extension_version = "~4"
#   storage_account_name        = azurerm_storage_account.main.name
#   storage_account_access_key  = azurerm_storage_account.main.primary_access_key


#   zip_deploy_file = "./function_app.zip"

#   site_config {
#     application_stack {
#       # docker {
#       #   image_name   = var.backend_image
#       #   image_tag    = var.image_tag
#       #   registry_url = azurerm_container_registry.acr.login_server
#       # }
#       python_version = "3.13"
#     }

#     always_on = false
#   }


#   app_settings = {
#     FUNCTIONS_WORKER_RUNTIME    = "python"
#     AzureWebJobsStorage         = azurerm_storage_account.main.primary_connection_string
#     WEBSITES_PORT               = "80"
#     FUNCTIONS_EXTENSION_VERSION = "~4"
#   }

#   identity {
#     type = "SystemAssigned"
#   }


#   tags = var.tags
# }

# # Trigger Blog Embeddings (Ingestor from ACR)
# resource "azurerm_linux_function_app" "trigger_blob" {
#   name                        = "${var.project_name}-${var.environment}-func-blob-trigger"
#   resource_group_name         = azurerm_resource_group.racmc.name
#   location                    = azurerm_resource_group.racmc.location
#   service_plan_id             = azurerm_service_plan.func_plan.id
#   functions_extension_version = "~4"
#   storage_account_name        = azurerm_storage_account.main.name
#   storage_account_access_key  = azurerm_storage_account.main.primary_access_key

#   zip_deploy_file = "./function_app.zip"

#   site_config {
#     application_stack {
#       python_version = "3.13"
#     }



#     always_on = false
#   }

#   app_settings = {
#     FUNCTIONS_WORKER_RUNTIME       = "python"
#     AzureWebJobsStorage            = azurerm_storage_account.main.primary_connection_string
#     FUNCTIONS_EXTENSION_VERSION    = "~4"
#     AzureWebJobsFeatureFlags       = "EnableWorkerIndexing"
#     BlobStorageConnectionString    = azurerm_storage_account.main.primary_connection_string
#     APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.app_insights.instrumentation_key
#   }

#   identity {
#     type = "SystemAssigned"
#   }

#   tags = var.tags
# }


