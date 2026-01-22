# Guía de Despliegue - RACMC-GPT

## 📋 Overview

Esta guía detalla los procedimientos para desplegar RACMC-GPT en Azure utilizando Infrastructure as Code (IaC) con Terraform. El sistema se despliega en **Azure App Service** (frontend y backend como Linux Web Apps) utilizando **Azure Container Registry** para las imágenes Docker.

---

## 🏗️ Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Subscription                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Resource Group: rg-racmc-{env}                │  │
│  │                                                        │  │
│  │  ┌──────────────────┐  ┌─────────────────────────┐  │  │
│  │  │ App Service Plan │  │  Container Registry      │  │  │
│  │  │ (Linux, B1)      │  │  (ACR - Basic)          │  │  │
│  │  └────────┬─────────┘  └──────────┬──────────────┘  │  │
│  │           │                         │                 │  │
│  │  ┌────────┴─────────┐  ┌───────────┴──────────────┐ │  │
│  │  │ App Service      │  │  App Service             │ │  │
│  │  │ (Frontend Web)   │──▶  (Backend API)          │ │  │
│  │  │ Next.js Container│  │  FastAPI Container       │ │  │
│  │  └──────────────────┘  └─────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Azure AI Search  │  │  Blob Storage           │  │  │
│  │  │ (Vector Index)   │  │  (Documents)            │  │  │
│  │  └──────────────────┘  └─────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Azure OpenAI     │  │  Key Vault              │  │  │
│  │  │ (GPT-4 + Ada)    │  │  (Secrets)              │  │  │
│  │  └──────────────────┘  └─────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Application Insights + Log Analytics        │    │  │
│  │  │  (Monitoring & Observability)                 │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Entra ID (Azure AD) - Identity Management         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Estrategia de Despliegue

### Entornos

| Entorno | Propósito | Resource Group | Domain |
|---------|-----------|----------------|--------|
| **Development** | Desarrollo activo | `rg-racmc-dev` | `racmc-gpt-dev-web.azurewebsites.net` |
| **Staging** | Testing pre-producción | `rg-racmc-staging` | `racmc-gpt-staging-web.azurewebsites.net` |
| **Production** | Producción | `rg-racmc-prod` | `racmc-gpt.daiichi-sankyo.eu` |

### Naming Conventions

```
Resource Groups:      rg-racmc-{environment}
App Service Plan:     racmc-gpt-{environment}-plan
App Service (Frontend): racmc-gpt-{environment}-web
App Service (Backend):  racmc-gpt-{environment}-api
Container Registry:   acrracmcgpt{environment}
Storage Accounts:     stracmc{env}{location}{nn}
Key Vault:            kv-racmc-{environment}
AI Search:            srch-racmc-{environment}
```

---

## 🛠️ Prerequisites

### 1. Herramientas Requeridas

```bash
# Azure CLI
az --version  # >= 2.50.0
az login
az account set --subscription "Your-Subscription-ID"

# Terraform
terraform --version  # >= 1.0.0

# Node.js
node --version  # >= 18.0.0
npm --version

# Docker (opcional, para builds locales)
docker --version
```

### 2. Permisos Necesarios

- **Azure Subscription**: Contributor o Owner
- **Entra ID**: Application Administrator (para App Registration)
- **Resource Groups**: Contributor en cada RG

### 3. Configuración de Service Principal (CI/CD)

```bash
# Crear Service Principal para automation
az ad sp create-for-rbac \
  --name "sp-racmc-gpt-cicd" \
  --role Contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/rg-racmc-dev \
  --sdk-auth

# Output (guardar en GitHub Secrets):
{
  "clientId": "xxx",
  "clientSecret": "xxx",
  "subscriptionId": "xxx",
  "tenantId": "xxx"
}
```

---

## 📦 Infraestructura con Terraform

### 1. Configuración Inicial

**Backend Storage (one-time setup):**

```bash
# Variables
RESOURCE_GROUP_NAME="rg-terraform-state"
STORAGE_ACCOUNT_NAME="stracmcdeveus01"
CONTAINER_NAME="tfstate"
LOCATION="eastus"

# Crear resource group
az group create \
  --name $RESOURCE_GROUP_NAME \
  --location $LOCATION

# Crear storage account
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob

# Crear container
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --auth-mode login
```

### 2. Estructura de Archivos Terraform

```
infra/
├── main.tf                    # Recursos principales
├── variables.tf               # Definición de variables
├── outputs.tf                 # Outputs de recursos
├── backend.tf                 # Configuración backend
├── terraform.tfvars.example   # Ejemplo de variables
├── modules/                   # Módulos reutilizables
│   ├── static_web_app/
│   ├── container_apps/
│   ├── ai_search/
│   └── key_vault/
└── README.md                  # Documentación específica
```

### 3. Configurar Variables

**Crear `terraform.tfvars`:**

```hcl
# terraform.tfvars (NO COMMITEAR - agregar a .gitignore)
environment         = "dev"
location           = "East US"
project_name       = "racmc-gpt"
resource_group_name = "rg-racmc-dev"

# Azure AD
azure_ad_tenant_id = "your-tenant-id"

# Tags
tags = {
  Project     = "RACMC-GPT"
  ManagedBy   = "Terraform"
  Environment = "dev"
  CostCenter  = "Engineering"
  Client      = "Daiichi-Sankyo"
}

# App Service + ACR variables
acr_sku = "Basic"
frontend_image = "frontend"
backend_image  = "backend"
image_tag      = "latest"
app_service_plan_size = "B1"
container_app_min_replicas = 0
container_app_max_replicas = 2
container_app_cpu          = "0.25"
container_app_memory       = "0.5Gi"

# AI Search
ai_search_sku = "free"  # free, basic, standard

# Feature flags
create_example_container_app = false
enable_monitoring           = true
```

### 4. Desplegar Infraestructura

```bash
cd infra

# Inicializar Terraform
terraform init

# Validar configuración
terraform validate

# Preview cambios
terraform plan -out=tfplan

# Aplicar cambios
terraform apply tfplan

# Ver outputs
terraform output

# Ejemplo de output:
# static_web_app_default_hostname = "racmc-dev.azurestaticapps.net"
# static_web_app_api_key = <sensitive>
# key_vault_uri = "https://kv-racmc-dev.vault.azure.net/"
```

### 5. Obtener Deployment Token

### 5. Obtener Container Registry Credentials

```bash
# Login server
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)

# Admin credentials
ACR_USERNAME=$(terraform output -raw acr_admin_username)
ACR_PASSWORD=$(az acr credential show \
  --name acrracmcgptdev \
  --query "passwords[0].value" \
  --output tsv)

echo "ACR Login Server: $ACR_LOGIN_SERVER"
echo "ACR Username: $ACR_USERNAME"
```

---

## 🌐 Despliegue del Frontend (Next.js)

### 1. Build Docker Image

```bash
cd frontend

# Build imagen Next.js
docker build -t racmc-frontend:latest .

# Tag para ACR
docker tag racmc-frontend:latest $ACR_LOGIN_SERVER/frontend:latest
docker tag racmc-frontend:latest $ACR_LOGIN_SERVER/frontend:v1.0.0
```

### 2. Push a Azure Container Registry

```bash
# Login a ACR
az acr login --name acrracmcgptdev

# Push imagen
docker push $ACR_LOGIN_SERVER/frontend:latest
docker push $ACR_LOGIN_SERVER/frontend:v1.0.0

# Verificar imágenes en ACR
az acr repository list --name acrracmcgptdev --output table
az acr repository show-tags --name acrracmcgptdev --repository frontend --output table
```

### 3. Configurar Variables de Entorno en App Service

```bash
# Configurar app settings en App Service
az webapp config appsettings set \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev \
  --settings \
    NEXTAUTH_URL=https://racmc-gpt-dev-web.azurewebsites.net \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID \
    AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET \
    AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID \
    NEXT_PUBLIC_API_URL=https://racmc-gpt-dev-api.azurewebsites.net \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    WEBSITES_PORT=3000

# Verificar
az webapp config appsettings list \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev
```

### 4. Deploy a App Service

El App Service ya está configurado en Terraform para pull la imagen desde ACR. Terraform configura:

```hcl
site_config {
  application_stack {
    docker_image_name = "acrracmcgptdev.azurecr.io/frontend:latest"
  }
}
```

Para actualizar a una nueva versión:

```bash
# Opción A: Actualizar via Terraform (recomendado)
cd infra
terraform apply -var="image_tag=v1.0.0"

# Opción B: Actualizar manualmente
az webapp config container set \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev \
  --docker-custom-image-name $ACR_LOGIN_SERVER/frontend:v1.0.0

# Restart App Service
az webapp restart \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev
```

---

## 🐳 Despliegue del Backend (FastAPI)

### 1. Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Expose port
EXPOSE 80

# Run FastAPI with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
```

### 2. Build y Push a Container Registry

```bash
# Login a Azure Container Registry
az acr login --name acrracmcgptdev

# Build imagen backend
cd backend
docker build -t $ACR_LOGIN_SERVER/backend:latest .
docker tag $ACR_LOGIN_SERVER/backend:latest $ACR_LOGIN_SERVER/backend:v1.0.0

# Push imagen
docker push $ACR_LOGIN_SERVER/backend:latest
docker push $ACR_LOGIN_SERVER/backend:v1.0.0

# Verificar
az acr repository show-tags --name acrracmcgptdev --repository backend --output table
```

### 3. Configurar App Service Backend

```bash
# Configurar app settings para backend API
az webapp config appsettings set \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev \
  --settings \
    AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT \
    AZURE_OPENAI_KEY=$OPENAI_KEY \
    AZURE_SEARCH_ENDPOINT=$SEARCH_ENDPOINT \
    AZURE_SEARCH_KEY=$SEARCH_KEY \
    AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION \
    WEBSITES_PORT=80

# Update image
az webapp config container set \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev \
  --docker-custom-image-name $ACR_LOGIN_SERVER/backend:latest

# Restart
az webapp restart \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev
```

---

## 🔄 CI/CD con GitHub Actions {#cicd}

### 1. GitHub Secrets

Configurar en **Settings** → **Secrets and variables** → **Actions**:

```
# Azure Credentials
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
AZURE_SUBSCRIPTION_ID
AZURE_TENANT_ID

# Container Registry
ACR_LOGIN_SERVER          # e.g., acrracmcgptdev.azurecr.io
ACR_USERNAME
ACR_PASSWORD

# App Service Names
WEBAPP_FRONTEND_NAME      # e.g., racmc-gpt-dev-web
WEBAPP_BACKEND_NAME       # e.g., racmc-gpt-dev-api
RESOURCE_GROUP_NAME       # e.g., rg-racmc-dev

# Application Secrets
NEXTAUTH_SECRET
AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID
```

### 2. Workflow: Deploy Frontend

**.github/workflows/deploy-frontend.yml:**

```yaml
name: Deploy Frontend to Azure App Service

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'frontend/**'
  workflow_dispatch:

env:
  NODE_VERSION: '18.x'
  ACR_IMAGE_NAME: 'frontend'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        uses: azure/docker-login@v1
        with:
          login-server: ${{ secrets.ACR_LOGIN_SERVER }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and Push Docker Image
        working-directory: ./frontend
        run: |
          IMAGE_TAG=${{ github.sha }}
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.ACR_IMAGE_NAME }}:${IMAGE_TAG} .
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.ACR_IMAGE_NAME }}:latest .
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.ACR_IMAGE_NAME }}:${IMAGE_TAG}
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.ACR_IMAGE_NAME }}:latest

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.WEBAPP_FRONTEND_NAME }}
          images: ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.ACR_IMAGE_NAME }}:${{ github.sha }}

      - name: Azure Logout
        run: az logout
```

### 3. Workflow: Deploy Infrastructure

**.github/workflows/terraform-deploy.yml:**

```yaml
name: Deploy Infrastructure with Terraform

on:
  push:
    branches:
      - main
    paths:
      - 'infra/**'
  workflow_dispatch:

env:
  TF_VERSION: '1.5.0'
  WORKING_DIR: './infra'

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Terraform Init
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform init

      - name: Terraform Format
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform fmt -check

      - name: Terraform Validate
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform validate

      - name: Terraform Plan
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform plan -out=tfplan
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform apply -auto-approve tfplan
```

---

## 🔐 Gestión de Secretos

### 1. Azure Key Vault

**Almacenar secretos:**

```bash
# Crear Key Vault (si no existe via Terraform)
az keyvault create \
  --name kv-racmc-dev \
  --resource-group rg-racmc-dev \
  --location eastus

# Agregar secretos
az keyvault secret set \
  --vault-name kv-racmc-dev \
  --name openai-api-key \
  --value $OPENAI_API_KEY

az keyvault secret set \
  --vault-name kv-racmc-dev \
  --name azure-search-key \
  --value $AZURE_SEARCH_KEY

az keyvault secret set \
  --vault-name kv-racmc-dev \
  --name nextauth-secret \
  --value $NEXTAUTH_SECRET
```

**Dar acceso a App Service:**

```bash
# Habilitar Managed Identity en App Service
az webapp identity assign \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev

# Obtener identity ID
IDENTITY_ID=$(az webapp identity show \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev \
  --query principalId -o tsv)

# Dar acceso a Key Vault
az keyvault set-policy \
  --name kv-racmc-dev \
  --object-id $IDENTITY_ID \
  --secret-permissions get list
```

### 2. Referenciar Secretos en App Service

```bash
# App Service puede referenciar Key Vault directamente
az webapp config appsettings set \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev \
  --settings \
    AZURE_OPENAI_KEY="@Microsoft.KeyVault(SecretUri=https://kv-racmc-dev.vault.azure.net/secrets/openai-api-key/)" \
    AZURE_SEARCH_KEY="@Microsoft.KeyVault(SecretUri=https://kv-racmc-dev.vault.azure.net/secrets/azure-search-key/)"
```

---

## 📊 Monitoreo y Observabilidad

### 1. Application Insights

```bash
# Crear Application Insights
az monitor app-insights component create \
  --app ai-racmc-dev \
  --location eastus \
  --resource-group rg-racmc-dev \
  --application-type web

# Obtener connection string
AI_CONNECTION_STRING=$(az monitor app-insights component show \
  --app ai-racmc-dev \
  --resource-group rg-racmc-dev \
  --query connectionString -o tsv)

# Configurar en App Service
az webapp config appsettings set \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev \
  --settings \
    APPLICATIONINSIGHTS_CONNECTION_STRING=$AI_CONNECTION_STRING
```

### 2. Dashboards y Alertas

Ver [Azure Monitor Dashboard](https://portal.azure.com/) para:
- Request rates y latencias
- Error rates
- Token consumption (OpenAI)
- Search query performance
- Authentication failures

---

## 🌍 Migración al Tenant Definitivo

### Consideraciones

1. **Azure AD App Registration:**
   - Crear nueva App Registration en tenant del cliente
   - Actualizar redirect URIs
   - Configurar permisos API

2. **Dominio Personalizado:**
   - Registrar dominio: `racmc-gpt.daiichi-sankyo.eu`
   - Configurar DNS CNAME apuntando al App Service
   - Configurar certificado SSL en App Service
   - Validar en Azure App Service custom domain settings

3. **Data Migration:**
   - Si existe data en dev, planear migración
   - Indices de AI Search
   - Blob Storage documents

4. **Testing:**
   - Smoke tests en nuevo tenant
   - Validar autenticación con usuarios reales
   - Performance testing

### Checklist Pre-Producción

- [ ] Enterprise App aprobada en tenant del cliente
- [ ] Dominio personalizado configurado y verificado
- [ ] Certificados SSL configurados
- [ ] Secretos rotados y almacenados en Key Vault de producción
- [ ] Backups configurados
- [ ] Monitoring y alerting activo
- [ ] Documentación de runbooks actualizada
- [ ] Plan de rollback definido

---

## 🆘 Troubleshooting

### Frontend no carga después de deploy

```bash
# Verificar logs de App Service
az webapp log tail \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev

# Verificar estado
az webapp show \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev \
  --query "state"

# Verificar URL
az webapp show \
  --name racmc-gpt-dev-web \
  --resource-group rg-racmc-dev \
  --query "defaultHostName" -o tsv
```

### Backend API no responde

```bash
# Ver logs de App Service
az webapp log tail \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev \
  --follow

# Verificar health endpoint
curl https://racmc-gpt-dev-api.azurewebsites.net/health

# Ver configuración de container
az webapp config container show \
  --name racmc-gpt-dev-api \
  --resource-group rg-racmc-dev
```

### Errores de autenticación

1. Verificar redirect URIs en Azure AD
2. Verificar variables de entorno (client ID, secret, tenant ID)
3. Revisar logs de NextAuth en Application Insights
4. Verificar que usuario tiene acceso a la aplicación en Entra ID

---

## 📚 Referencias

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure App Service - Linux containers](https://docs.microsoft.com/en-us/azure/app-service/quickstart-custom-container)
- [Azure Container Registry Documentation](https://docs.microsoft.com/en-us/azure/container-registry/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Responsable**: Syntonize DevOps Team
