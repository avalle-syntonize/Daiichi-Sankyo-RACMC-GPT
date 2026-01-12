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

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-racmc-gpt-dev"
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
variable "static_web_app_sku_tier" {
  description = "SKU tier for Static Web App"
  type        = string
  default     = "Free"
}

variable "static_web_app_sku_size" {
  description = "SKU size for Static Web App"
  type        = string
  default     = "Free"
}

# Container Apps Variables
variable "container_apps_sku_name" {
  description = "SKU name for Container Apps Environment"
  type        = string
  default     = "Consumption"
}

variable "container_min_replicas" {
  description = "Minimum number of replicas for container apps"
  type        = number
  default     = 0
}

variable "container_max_replicas" {
  description = "Maximum number of replicas for container apps"
  type        = number
  default     = 2
}

variable "container_cpu" {
  description = "CPU allocation for container (vCPU)"
  type        = number
  default     = 0.25
}

variable "container_memory" {
  description = "Memory allocation for container (Gi)"
  type        = string
  default     = "0.5Gi"
}

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
