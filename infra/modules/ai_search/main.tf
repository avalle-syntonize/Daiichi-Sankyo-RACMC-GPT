terraform {
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

# resource "azapi_resource" "search_index" {
#   schema_validation_enabled = false

#   type      = "Microsoft.Search/searchServices/indexes@2023-11-01"
#   name      = "semantic-index"
#   parent_id = azurerm_search_service.main.id
 
#   depends_on = [
#     azurerm_search_service.main
#   ]

#   body = {
#     properties = {
#       fields = [
#         { name = "id", type = "Edm.String", key = true, sortable = true, filterable = true },
#         { name = "content", type = "Edm.String", searchable = true, retrievable = true, filterable = true },
#         { 
#           name = "contentVector", 
#           type = "Collection(Edm.Single)", 
#           searchable = true, 
#           retrievable = true, 
#           dimensions = 3072, 
#           vectorSearchProfile = "vector-profile"
#         },
#         { name = "metadata", type = "Edm.String", searchable = true, retrievable = true, filterable = true },
#         { name = "url", type = "Edm.String", searchable = true, retrievable = true, filterable = true },
#         { name = "title", type = "Edm.String", searchable = true, retrievable = true, filterable = true },
#         { name = "filepath", type = "Edm.String", searchable = true, retrievable = true, filterable = true },
#         { name = "language", type = "Edm.String", searchable = true, retrievable = true, filterable = true },
#         { name = "project_id", type = "Edm.String", searchable = true, retrievable = true, filterable = true }
#       ],
#       vectorSearch = {
#         algorithms = [
#           {
#             name = "hnsw-config",
#             kind = "hnsw",
#             hnswParameters = {
#               metric = "cosine",
#               m      = 4,
#               efConstruction = 400
#             }
#           }
#         ],
#         profiles = [
#           {
#             name      = "vector-profile",
#             algorithm = "hnsw-config"
#           }
#         ]
#       }
#     }
#   }
# }