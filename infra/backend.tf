terraform {
  backend "azurerm" {
    # NOTE: Storage account name follows convention st<application><env><location><nn>
    # Current: stracmcdeveus01 (racmc + dev + East US + 01)s
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stracmcdeveus01"
    container_name       = "tfstate"
    key                  = "racmc-gpt.terraform.tfstate"
  }
}
