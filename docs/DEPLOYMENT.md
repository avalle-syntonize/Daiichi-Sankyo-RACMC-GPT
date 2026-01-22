# Guía de Despliegue - RACMC-GPT

## 📋 Overview

Esta guía detalla los procedimientos para desplegar RACMC-GPT en Azure utilizando Infrastructure as Code (IaC) con Terraform. El sistema se despliega en Azure Static Web Apps (frontend) y Azure Container Apps (backend).

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
│  │  │ Azure Static     │  │  Azure Container Apps   │  │  │
│  │  │ Web Apps         │──▶  Environment             │  │  │
│  │  │ (Next.js)        │  │  (FastAPI Backend)      │  │  │
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
| **Development** | Desarrollo activo | `rg-racmc-dev` | `racmc-dev.azurestaticapps.net` |
| **Staging** | Testing pre-producción | `rg-racmc-staging` | `racmc-staging.azurestaticapps.net` |
| **Production** | Producción | `rg-racmc-prod` | `racmc-gpt.daiichi-sankyo.eu` |

### Naming Conventions

```
Resource Groups:     rg-racmc-{environment}
Static Web Apps:     swa-racmc-{environment}
Container Apps:      ca-racmc-api-{environment}
Storage Accounts:    stracmc{env}{location}{nn}
Key Vault:           kv-racmc-{environment}
AI Search:           srch-racmc-{environment}
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

# Container Apps
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

```bash
# Para desplegar frontend
az staticwebapp secrets list \
  --name swa-racmc-dev \
  --query "properties.apiKey" \
  --output tsv
```

---

## 🌐 Despliegue del Frontend (Next.js)

### 1. Build Local

```bash
cd frontend

# Instalar dependencias
npm ci

# Build para producción
npm run build

# Test build localmente
npm start
```

### 2. Despliegue Manual a Static Web Apps

**Opción A: Azure CLI**

```bash
# Instalar SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy \
  --app-location ./frontend \
  --output-location .next \
  --deployment-token $DEPLOYMENT_TOKEN
```

**Opción B: GitHub Actions (Recomendado)**

Ver sección [CI/CD con GitHub Actions](#cicd)

### 3. Configurar Variables de Entorno en Azure

```bash
# Configurar app settings
az staticwebapp appsettings set \
  --name swa-racmc-dev \
  --setting-names \
    NEXTAUTH_URL=https://racmc-dev.azurestaticapps.net \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID \
    AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET \
    AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID \
    NEXT_PUBLIC_API_URL=https://ca-racmc-api-dev.eastus.azurecontainerapps.io

# Verificar
az staticwebapp appsettings list --name swa-racmc-dev
```

### 4. Configuración de Static Web App

**staticwebapp.config.json:**

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif,svg}", "/api/*"]
  },
  "routes": [
    {
      "route": "/api/auth/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/chatbot",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/",
      "statusCode": 302
    },
    "403": {
      "redirect": "/error?code=403",
      "statusCode": 302
    }
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "mimeTypes": {
    ".json": "application/json",
    ".svg": "image/svg+xml"
  }
}
```

---

## 🐳 Despliegue del Backend (FastAPI)

### 1. Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Build y Push a Container Registry

```bash
# Login a Azure Container Registry
az acr login --name acrracmcdev

# Build imagen
docker build -t acrracmcdev.azurecr.io/racmc-gpt-frontend:latest ./frontend

# Push imagen
docker push acrracmcdev.azurecr.io/racmc-gpt-frontend:latest

# Tag con versión
docker tag acrracmcdev.azurecr.io/racmc-gpt-frontend:latest \
  acrracmcdev.azurecr.io/racmc-gpt-frontend:1.0.0
docker push acrracmcdev.azurecr.io/racmc-gpt-frontend:1.0.0
```

### 3. Desplegar a Container Apps

```bash
# Deploy backend API
az containerapp update \
  --name ca-racmc-api-dev \
  --resource-group rg-racmc-dev \
  --image acrracmcdev.azurecr.io/racmc-api:latest \
  --set-env-vars \
    AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT \
    AZURE_OPENAI_KEY=secretref:openai-key \
    AZURE_SEARCH_ENDPOINT=$SEARCH_ENDPOINT \
    AZURE_SEARCH_KEY=secretref:search-key

# Verificar deployment
az containerapp revision list \
  --name ca-racmc-api-dev \
  --resource-group rg-racmc-dev \
  --output table
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

# Static Web Apps
AZURE_STATIC_WEB_APPS_API_TOKEN_DEV
AZURE_STATIC_WEB_APPS_API_TOKEN_PROD

# Container Registry
ACR_LOGIN_SERVER
ACR_USERNAME
ACR_PASSWORD

# Application Secrets
NEXTAUTH_SECRET
AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID
```

### 2. Workflow: Deploy Frontend

**.github/workflows/deploy-frontend.yml:**

```yaml
name: Deploy Frontend to Azure Static Web Apps

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

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build Next.js application
        working-directory: ./frontend
        run: npm run build
        env:
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          AZURE_AD_CLIENT_ID: ${{ secrets.AZURE_AD_CLIENT_ID }}
          AZURE_AD_CLIENT_SECRET: ${{ secrets.AZURE_AD_CLIENT_SECRET }}
          AZURE_AD_TENANT_ID: ${{ secrets.AZURE_AD_TENANT_ID }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_DEV }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "frontend"
          output_location: ".next"
          skip_app_build: true

      - name: Notify Deployment Status
        if: always()
        run: |
          echo "Deployment completed with status: ${{ job.status }}"
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

**Dar acceso a Container App:**

```bash
# Habilitar Managed Identity en Container App
az containerapp identity assign \
  --name ca-racmc-api-dev \
  --resource-group rg-racmc-dev \
  --system-assigned

# Obtener identity ID
IDENTITY_ID=$(az containerapp identity show \
  --name ca-racmc-api-dev \
  --resource-group rg-racmc-dev \
  --query principalId -o tsv)

# Dar acceso a Key Vault
az keyvault set-policy \
  --name kv-racmc-dev \
  --object-id $IDENTITY_ID \
  --secret-permissions get list
```

### 2. Referenciar Secretos en Container Apps

```bash
az containerapp create \
  --name ca-racmc-api-dev \
  --resource-group rg-racmc-dev \
  --environment containerapp-env-racmc-dev \
  --image acrracmcdev.azurecr.io/racmc-api:latest \
  --secrets \
    openai-key=keyvaultref:https://kv-racmc-dev.vault.azure.net/secrets/openai-api-key,identityref:system \
    search-key=keyvaultref:https://kv-racmc-dev.vault.azure.net/secrets/azure-search-key,identityref:system \
  --env-vars \
    AZURE_OPENAI_KEY=secretref:openai-key \
    AZURE_SEARCH_KEY=secretref:search-key
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

# Configurar en Static Web App
az staticwebapp appsettings set \
  --name swa-racmc-dev \
  --setting-names \
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
   - Configurar DNS CNAME
   - Validar en Azure Static Web Apps

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
# Verificar logs
az staticwebapp logs show \
  --name swa-racmc-dev \
  --resource-group rg-racmc-dev

# Verificar build
az staticwebapp show \
  --name swa-racmc-dev \
  --query "defaultHostname"
```

### Backend API no responde

```bash
# Ver logs de Container App
az containerapp logs show \
  --name ca-racmc-api-dev \
  --resource-group rg-racmc-dev \
  --follow

# Verificar health endpoint
curl https://ca-racmc-api-dev.eastus.azurecontainerapps.io/health
```

### Errores de autenticación

1. Verificar redirect URIs en Azure AD
2. Verificar variables de entorno (client ID, secret, tenant ID)
3. Revisar logs de NextAuth en Application Insights
4. Verificar que usuario tiene acceso a la aplicación en Entra ID

---

## 📚 Referencias

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Static Web Apps - Next.js](https://docs.microsoft.com/en-us/azure/static-web-apps/deploy-nextjs)
- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Responsable**: Syntonize DevOps Team
