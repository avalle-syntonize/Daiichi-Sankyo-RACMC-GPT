terraform {
  backend "azurerm" {
    # NOTE: These values should be unique to your deployment
    # Update storage_account_name to ensure global uniqueness
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstateracmcgpt"
    container_name       = "tfstate"
    key                  = "racmc-gpt.terraform.tfstate"
  }
}
