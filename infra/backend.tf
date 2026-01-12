terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstateracmcgpt"
    container_name       = "tfstate"
    key                  = "racmc-gpt.terraform.tfstate"
  }
}
