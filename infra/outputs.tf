output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.racmc.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.racmc.location
}

# Azure Container Registry outputs
output "acr_login_server" {
  description = "Login server for ACR"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  description = "ACR admin username (if enabled)"
  value       = azurerm_container_registry.acr.admin_username
}

output "acr_admin_enabled" {
  description = "Whether ACR admin user is enabled"
  value       = azurerm_container_registry.acr.admin_enabled
}

# App Service / Web App outputs

output "frontend_name" {
  description = "Name of the frontend App Service"
  value       = azurerm_linux_web_app.frontend.name
}

output "frontend_id" {
  description = "ID of the frontend App Service"
  value       = azurerm_linux_web_app.frontend.id
}


output "backend_name" {
  description = "Name of the backend Function App"
  value       = azurerm_function_app_flex_consumption.backend.name
}
output "backend_id" {
  description = "ID of the backend Function App"
  value       = azurerm_function_app_flex_consumption.backend.id
}

output "backend_ingestor_name" {
  description = "Name of the backend Function App for blob trigger"
  value       = azurerm_function_app_flex_consumption.trigger_blob.name
}
output "backend_ingestor_id" {
  description = "ID of the backend Function App for blob trigger"
  value       = azurerm_function_app_flex_consumption.trigger_blob.id
}

# output "api_name" {
#   description = "Name of the API App Service"
#   value       = azurerm_linux_web_app.api.name
# }

# output "api_id" {
#   description = "ID of the API App Service"
#   value       = azurerm_linux_web_app.api.id
# }

output "app_service_plan_name" {
  description = "Name of the App Service Plan"
  value       = azurerm_service_plan.plan.name
}

output "app_service_plan_id" {
  description = "ID of the App Service Plan"
  value       = azurerm_service_plan.plan.id
}

output "ai_search_endpoint" {
  description = "Endpoint URL for AI Search service"
  value       = module.ai_search.search_endpoint
}

output "ai_search_name" {
  description = "Name of the AI Search service"
  value       = module.ai_search.search_name
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "storage_account_primary_blob_endpoint" {
  description = "Primary blob endpoint for storage account"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}


