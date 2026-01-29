terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.0"
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
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore"
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Update"
    ]
  }

  tags = var.tags
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

resource "azurerm_service_plan" "trigger_blob_plan" {
  name                = "${var.project_name}-${var.environment}-func-blob-trigger-plan"
  resource_group_name = azurerm_resource_group.racmc.name
  location            = azurerm_resource_group.racmc.location

  os_type  = "Linux"
  sku_name = var.function_app_service_plan_size
}

# resource "azurerm_function_app_flex_consumption_plan" "func_plan" {
#   name                = "${var.project_name}-${var.environment}-func-plan"
#   location            = azurerm_resource_group.racmc.location
#   resource_group_name = azurerm_resource_group.racmc.name
# }

# resource "azurerm_function_app_flex_consumption_plan" "trigger_blob_plan" {
#   name                = "${var.project_name}-${var.environment}-func-blob-trigger-plan"
#   location            = azurerm_resource_group.racmc.location
#   resource_group_name = azurerm_resource_group.racmc.name
# }

resource "azurerm_application_insights" "app_insights" {
  name                = "${var.project_name}-${var.environment}-app-insights"
  location            = azurerm_resource_group.racmc.location
  resource_group_name = azurerm_resource_group.racmc.name
  application_type    = "web"
}


# # Backend (FastAPI container from ACR)
resource "azurerm_function_app_flex_consumption" "backend" {
  name                = "${var.project_name}-${var.environment}-func-backend"
  resource_group_name = azurerm_resource_group.racmc.name
  location            = azurerm_resource_group.racmc.location
  service_plan_id     = azurerm_service_plan.func_plan.id

  storage_container_type      = "blobContainer"
  storage_container_endpoint  = "${azurerm_storage_account.main.primary_blob_endpoint}${azurerm_storage_container.data.name}"
  storage_authentication_type = "StorageAccountConnectionString"
  storage_access_key          = azurerm_storage_account.main.primary_access_key
  runtime_name                = "python"
  runtime_version             = "3.11"
  maximum_instance_count      = 50
  instance_memory_in_mb       = 2048

  site_config {
  }

  app_settings = {
    # FUNCTIONS_WORKER_RUNTIME    = "python"
    AzureWebJobsStorage         = azurerm_storage_account.main.primary_connection_string
    WEBSITES_PORT               = "80"
    FUNCTIONS_EXTENSION_VERSION = "~4"
  }
}



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


# resource "azurerm_eventgrid_event_subscription" "blob_to_function" {
#   name  = "es-blob-to-func-${var.environment}"
#   scope = azurerm_storage_account.main.id

#   event_delivery_schema = "EventGridSchema"
#   included_event_types  = ["Microsoft.Storage.BlobCreated"]

#   subject_filter {
#     subject_begins_with = "/blobServices/default/containers/data/"
#   }

#   azure_function_endpoint {
#     function_id = "${azurerm_linux_function_app.backend.id}/functions/BlobCreatedTrigger"
#   }

#   retry_policy {
#     max_delivery_attempts = 5
#     event_time_to_live    = 1440
#   }
# }

# resource "azurerm_role_assignment" "acr_pull" {
#   scope                = azurerm_container_registry.acr.id
#   role_definition_name = "AcrPull"
#   principal_id         = azurerm_linux_function_app.backend.identity[0].principal_id
# }

# Static Web App Module (Free tier)
module "static_web_app" {
  source = "./modules/static_web_app"

  name                = "${var.project_name}-${var.environment}"
  location            = azurerm_resource_group.racmc.location
  resource_group_name = azurerm_resource_group.racmc.name
  sku_tier            = var.static_web_app_sku_tier
  sku_size            = var.static_web_app_sku_size
  tags                = var.tags
}


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
