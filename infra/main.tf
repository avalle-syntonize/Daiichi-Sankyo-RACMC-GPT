resource "azurerm_resource_group" "racmc" {
  name     = "rg-racmc-${var.environment}"
  location = var.location
}

// Terraform overige references update
// Example for using the resource group in another definition
resource "azurerm_some_resource" "example" {
  resource_group_name = azurerm_resource_group.racmc.name
  // other configurations
}

// Add additional references and updates throughout the file as needed