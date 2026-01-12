output "search_id" {
  description = "ID of the AI Search service"
  value       = azurerm_search_service.main.id
}

output "search_name" {
  description = "Name of the AI Search service"
  value       = azurerm_search_service.main.name
}

output "search_endpoint" {
  description = "Endpoint URL for the AI Search service"
  value       = "https://${azurerm_search_service.main.name}.search.windows.net"
}

output "primary_key" {
  description = "Primary admin key for the AI Search service"
  value       = azurerm_search_service.main.primary_key
  sensitive   = true
}

output "secondary_key" {
  description = "Secondary admin key for the AI Search service"
  value       = azurerm_search_service.main.secondary_key
  sensitive   = true
}
