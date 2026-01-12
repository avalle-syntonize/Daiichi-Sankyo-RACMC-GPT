output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

output "static_web_app_default_hostname" {
  description = "Default hostname for Static Web App"
  value       = module.static_web_app.default_hostname
}

output "static_web_app_id" {
  description = "ID of the Static Web App"
  value       = module.static_web_app.static_web_app_id
}

output "container_apps_environment_id" {
  description = "ID of the Container Apps Environment"
  value       = module.container_apps.environment_id
}

output "container_apps_environment_default_domain" {
  description = "Default domain of Container Apps Environment"
  value       = module.container_apps.environment_default_domain
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
