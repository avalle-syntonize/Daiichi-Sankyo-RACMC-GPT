# Architecture Diagram Update - Reference

## Updated Components (2026-01-22)

### Changes Made to architecture.drawio:

1. **Frontend**:
   - OLD: "React + Vite, MSAL.js Auth, Azure Static Web Apps (Free Tier)"
   - NEW: "Next.js 15 + React 19, NextAuth.js, Azure App Service (Linux Web App, Docker)"

2. **Backend**:
   - OLD: "FastAPI + Python 3.11, Azure Container Apps (Consumption, 0.25 vCPU), Auto-scale 0-10"
   - NEW: "FastAPI + Python 3.11, Azure App Service (Linux Web App, Docker), App Service Plan B1"

3. **New Component Added**: 
   - Azure Container Registry (ACR)
   - Docker Images: frontend:latest, backend:latest
   - Basic Tier

### Architecture Flow (Simplified):

```
┌──────────┐
│ Usuario  │
│ (Browser)│
└────┬─────┘
     │ HTTPS
     ▼
┌────────────────────────┐
│  Azure App Service     │
│  (Frontend - Next.js)  │
│  Linux Web App         │
│  Docker Container      │
└────────┬───────────────┘
         │ API Calls + JWT
         ▼
┌────────────────────────┐
│  Azure App Service     │
│  (Backend - FastAPI)   │
│  Linux Web App         │
│  Docker Container      │
└───┬────────────────┬───┘
    │                │
    │                └──► Azure OpenAI (GPT-4, Embeddings)
    │
    └───────────────────► Azure AI Search (Vector Search)

┌────────────────────────┐
│  Container Registry    │
│  (ACR)                 │
│  - frontend:latest     │
│  - backend:latest      │
└────────────────────────┘
          ▲
          │ Docker Push
          │
    CI/CD Pipeline
    (GitHub Actions)
```

### Key Infrastructure Components:

1. **App Service Plan** (Linux, B1 tier)
   - Hosts both frontend and backend Web Apps
   - Shared resources

2. **Azure Container Registry** (ACR)
   - Stores Docker images
   - Basic tier
   - Images pulled by App Services

3. **Frontend App Service**
   - Name: racmc-gpt-{env}-web
   - Next.js 15 application
   - NextAuth.js authentication
   - Docker-based deployment

4. **Backend App Service**
   - Name: racmc-gpt-{env}-api
   - FastAPI Python application
   - REST API endpoints
   - Docker-based deployment

5. **Supporting Services**:
   - Azure AI Search (Free tier)
   - Azure OpenAI
   - Azure Blob Storage
   - Azure Key Vault
   - Entra ID (Azure AD)

### To Regenerate PNG:

1. Open `docs/diagrams/architecture.drawio` in Draw.io (https://app.diagrams.net/)
2. Verify the changes are correct
3. Export as PNG: File → Export as → PNG
4. Save to `docs/images/architecture.png`
5. Commit both files

**Note**: The Draw.io XML file has been updated. A new PNG export is required to reflect these changes visually.
