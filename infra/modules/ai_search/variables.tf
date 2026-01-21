variable "name" {
  description = "Name of the AI Search service"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "sku" {
  description = "SKU for AI Search (free, basic, standard, standard2, standard3, storage_optimized_l1, storage_optimized_l2)"
  type        = string
  default     = "free"
}

variable "replica_count" {
  description = "Number of replicas (1-12)"
  type        = number
  default     = 1
}

variable "partition_count" {
  description = "Number of partitions (1, 2, 3, 4, 6, or 12)"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
