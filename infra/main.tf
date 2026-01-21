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

# Backend App Service (FastAPI container from ACR)
resource "azurerm_linux_web_app" "api" {
  name                = "${var.project_name}-${var.environment}-api"
  resource_group_name = azurerm_resource_group.racmc.name
  location            = azurerm_resource_group.racmc.location
  service_plan_id     = azurerm_service_plan.plan.id


  site_config {
    application_stack {
      docker_image_name = "${azurerm_container_registry.acr.login_server}/${var.backend_image}:${var.image_tag}"
    }
  }

  app_settings = {
    "WEBSITES_PORT" = "80"
  }

  tags = var.tags
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
