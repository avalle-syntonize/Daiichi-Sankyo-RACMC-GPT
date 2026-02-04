resource "azurerm_static_web_app" "main" {
  name                = "swa-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku_tier            = var.sku_tier
  sku_size            = var.sku_size

  app_settings = { 
    "BASE_API_URL" = "https://racmc-gpt-dev-func-backend.azurewebsites.net/api"
   }
  tags = var.tags
}
