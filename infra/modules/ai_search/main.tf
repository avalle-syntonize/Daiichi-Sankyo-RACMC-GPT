resource "azurerm_search_service" "main" {
  name                = "srch-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku

  # Replica and partition count only supported on paid tiers
  # Free tier has fixed 1 replica and 1 partition
  replica_count   = lower(var.sku) == "free" ? 1 : var.replica_count
  partition_count = lower(var.sku) == "free" ? 1 : var.partition_count

  tags = var.tags
}
