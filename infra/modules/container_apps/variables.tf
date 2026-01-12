variable "name" {
  description = "Name prefix for Container Apps resources"
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

variable "sku_name" {
  description = "SKU name for Container Apps Environment (Consumption or Dedicated)"
  type        = string
  default     = "Consumption"
}

variable "min_replicas" {
  description = "Minimum number of replicas"
  type        = number
  default     = 0
}

variable "max_replicas" {
  description = "Maximum number of replicas"
  type        = number
  default     = 2
}

variable "cpu" {
  description = "CPU allocation (vCPU)"
  type        = number
  default     = 0.25
}

variable "memory" {
  description = "Memory allocation (Gi)"
  type        = string
  default     = "0.5Gi"
}

variable "create_example_app" {
  description = "Whether to create an example container app (for demo/testing purposes)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
