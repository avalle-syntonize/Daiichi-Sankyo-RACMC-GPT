variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "racmc-gpt"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "RACMC-GPT"
    ManagedBy   = "Terraform"
    Environment = "dev"
  }
}

# Static Web App Variables


# AI Search Variables
variable "ai_search_sku" {
  description = "SKU for Azure AI Search (free, basic, standard)"
  type        = string
  default     = "free"
}

variable "ai_search_replica_count" {
  description = "Number of replicas for AI Search"
  type        = number
  default     = 1
}

variable "ai_search_partition_count" {
  description = "Number of partitions for AI Search"
  type        = number
  default     = 1
}

# Storage Variables
variable "storage_account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
}

variable "storage_account_replication" {
  description = "Storage account replication type"
  type        = string
  default     = "LRS"
}

# Key Vault Variables
variable "key_vault_sku" {
  description = "SKU for Key Vault"
  type        = string
  default     = "standard"
}


variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

# ACR + App Service variables
variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
}

variable "frontend_image" {
  description = "ACR repository name for frontend image"
  type        = string
  default     = "frontend"
}

variable "backend_image" {
  description = "ACR repository name for backend image"
  type        = string
  default     = "backend"
}

variable "image_tag" {
  description = "Tag to deploy from ACR"
  type        = string
  default     = "latest"
}

variable "app_service_plan_tier" {
  description = "App Service plan tier"
  type        = string
  default     = "Basic"
}

variable "app_service_plan_size" {
  description = "App Service plan size"
  type        = string
  default     = "B1"
}

variable "function_app_service_plan_size" {
  description = "Function App Service plan size"
  type        = string
  default     = "Y1"
}

variable "trigger_blob_image" {
  description = "ACR repository name for blob trigger function image"
  type        = string
  default     = "blob-trigger"
}

variable "static_web_app_sku_tier" {
  description = "Static Web App SKU tier"
  type        = string
  default     = "Free"
}

variable "static_web_app_sku_size" {
  description = "Static Web App SKU size"
  type        = string
  default     = "F1"
}