# Terraform Infrastructure for RACMC-GPT

This directory contains Terraform configurations to provision Azure infrastructure for the RACMC-GPT project using Free Tier services wherever possible.

## Architecture Overview

The infrastructure includes:
- **Azure Static Web Apps** (Free tier) - Frontend hosting
- **Azure Container Apps** (Consumption tier) - API backend with 180k vCPU-seconds free/month
- **Azure AI Search** (Free tier) - Search service with 50MB storage, 10k documents
- **Azure Blob Storage** (5GB free) - Data storage
- **Azure Key Vault** (10k operations free/month) - Secrets management

## Prerequisites

1. **Azure CLI** - Install from [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Terraform** - Version >= 1.0, install from [terraform.io](https://www.terraform.io/downloads.html)
3. **Azure Subscription** - Active Azure subscription with appropriate permissions

## Initial Setup

### 1. Login to Azure

```bash
az login
az account set --subscription "<your-subscription-id>"
```

### 2. Create Backend Storage (One-time setup)

Before running Terraform, you need to create the storage account for Terraform state:

```bash
# Set variables
RESOURCE_GROUP_NAME="rg-terraform-state"
STORAGE_ACCOUNT_NAME="sttfstateracmcgpt"
CONTAINER_NAME="tfstate"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob

# Create blob container
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --auth-mode login
```

### 3. Configure Backend Authentication

You can authenticate to the backend in two ways:

**Option A: Using Azure CLI (Recommended for local development)**
```bash
# Already authenticated from step 1
```

**Option B: Using Access Key**
```bash
# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --query '[0].value' -o tsv)

# Export as environment variable
export ARM_ACCESS_KEY=$ACCOUNT_KEY
```

## Running Terraform

### 1. Initialize Terraform

```bash
cd infra
terraform init
```

This command will:
- Download required providers (azurerm)
- Initialize the backend (Azure Blob Storage)
- Set up the working directory

### 2. Review the Plan

```bash
terraform plan
```

This shows you what resources will be created without making any changes.

**Note**: The plan might take a few minutes to complete.

### 3. Apply the Configuration

```bash
terraform apply
```

Review the planned changes and type `yes` to proceed.

**Estimated time**: 10-15 minutes for initial deployment.

### 4. View Outputs

```bash
terraform output
```

This will display important information like:
- Static Web App hostname
- Container Apps environment details
- AI Search endpoint
- Storage account details
- Key Vault URI

## Variable Customization

You can customize variables in several ways:

### Option 1: Edit variables.tf
Modify default values directly in `variables.tf`

### Option 2: Create terraform.tfvars
Create a `terraform.tfvars` file:

```hcl
environment         = "dev"
location           = "East US"
project_name       = "racmc-gpt"
resource_group_name = "rg-racmc-gpt-dev"

# Custom tags
tags = {
  Project     = "RACMC-GPT"
  ManagedBy   = "Terraform"
  Environment = "dev"
  CostCenter  = "Engineering"
}
```

### Option 3: Command-line flags
```bash
terraform apply -var="environment=staging" -var="location=West Europe"
```

## Free Tier Limits

Be aware of these service limits:

| Service | Tier | Limits |
|---------|------|--------|
| Static Web Apps | Free | 100GB bandwidth/month, Custom domains |
| Container Apps | Consumption | 180k vCPU-seconds, 360k GiB-seconds free/month |
| AI Search | Free | 50MB storage, 3 indexes, 10k documents |
| Blob Storage | General | 5GB LRS hot storage free first 12 months |
| Key Vault | Standard | 10k operations free/month |

## Modules

### static_web_app
Provisions Azure Static Web App for frontend hosting.

**Inputs:**
- `name` - Name of the Static Web App
- `location` - Azure region
- `sku_tier` - SKU tier (default: "Free")

**Outputs:**
- `static_web_app_id` - Resource ID
- `default_hostname` - Default URL
- `api_key` - Deployment key (sensitive)

### container_apps
Provisions Container Apps Environment and a sample container app.

**Inputs:**
- `name` - Name prefix
- `location` - Azure region
- `sku_name` - SKU (default: "Consumption")
- `min_replicas` - Min replicas (default: 0)
- `max_replicas` - Max replicas (default: 2)
- `cpu` - CPU allocation (default: 0.25 vCPU)
- `memory` - Memory allocation (default: "0.5Gi")

**Outputs:**
- `environment_id` - Environment resource ID
- `environment_default_domain` - Default domain
- `environment_static_ip` - Static IP address

### ai_search
Provisions Azure AI Search service.

**Inputs:**
- `name` - Service name
- `location` - Azure region
- `sku` - SKU tier (default: "free")
- `replica_count` - Number of replicas (default: 1)
- `partition_count` - Number of partitions (default: 1)

**Outputs:**
- `search_id` - Resource ID
- `search_name` - Service name
- `search_endpoint` - Service endpoint URL
- `primary_key` - Admin key (sensitive)

## Common Commands

```bash
# Format Terraform files
terraform fmt

# Validate configuration
terraform validate

# Show current state
terraform show

# List resources
terraform state list

# Refresh state
terraform refresh

# Destroy all resources
terraform destroy
```

## Troubleshooting

### Issue: Backend initialization fails
**Solution**: Verify that the storage account and container exist, and you have proper authentication.

### Issue: Resource names must be unique
**Solution**: Azure resource names must be globally unique. Modify the `project_name` variable to use a unique identifier.

### Issue: Quota exceeded
**Solution**: Check your subscription quotas using:
```bash
az vm list-usage --location "East US" -o table
```

### Issue: Provider authentication error
**Solution**: Re-authenticate using:
```bash
az login
az account set --subscription "<subscription-id>"
```

## Security Best Practices

1. **Never commit state files** - Already in `.gitignore`
2. **Use Key Vault for secrets** - Store sensitive data in the provisioned Key Vault
3. **Limit access** - Use Azure RBAC to control who can manage infrastructure
4. **Enable audit logging** - Monitor who makes changes
5. **Use managed identities** - For application authentication where possible

## Cost Management

Even with free tiers, monitor your usage:

```bash
# View current costs
az consumption usage list --start-date 2024-01-01 --end-date 2024-01-31

# Set up budget alerts in Azure Portal
# Navigate to: Cost Management + Billing > Budgets
```

## Updating Infrastructure

When making changes:

1. Edit Terraform files
2. Run `terraform plan` to review changes
3. Run `terraform apply` to apply changes
4. Commit changes to version control

## CI/CD Integration

For automated deployments, set up these secrets in your CI/CD pipeline:

```bash
ARM_CLIENT_ID       # Service Principal ID
ARM_CLIENT_SECRET   # Service Principal Secret
ARM_SUBSCRIPTION_ID # Azure Subscription ID
ARM_TENANT_ID       # Azure Tenant ID
```

Example GitHub Actions workflow:

```yaml
- name: Terraform Apply
  run: |
    cd infra
    terraform init
    terraform apply -auto-approve
  env:
    ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
    ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
    ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
    ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
```

## Additional Resources

- [Azure Free Services](https://azure.microsoft.com/free/)
- [Terraform Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Container Apps Docs](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure AI Search Docs](https://docs.microsoft.com/en-us/azure/search/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Azure service documentation
3. Open an issue in the project repository
