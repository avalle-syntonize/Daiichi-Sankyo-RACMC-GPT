# Documentación RACMC-GPT

## 📋 Índice de Documentación

Bienvenido a la documentación completa del proyecto RACMC-GPT. Esta página sirve como índice central para navegar toda la documentación disponible.

---

## 🚀 Para Empezar

### Nuevos en el Proyecto

Si eres nuevo en el proyecto, comienza aquí:

1. **[README.md](../README.md)** - Vista general del proyecto
2. **[ONBOARDING.md](./ONBOARDING.md)** - Guía completa de onboarding para desarrolladores
3. **[MIGRATION.md](./MIGRATION.md)** - Entender el cambio arquitectónico a Next.js

**Tiempo estimado**: 2 horas

### Desarrolladores Experimentados

Si ya conoces el proyecto pero necesitas referencia:

- **[architecture.md](./architecture.md)** - Arquitectura del sistema
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Sistema de autenticación
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Procedimientos de despliegue

---

## 📚 Documentación por Categoría

### 🏗️ Arquitectura y Diseño

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[architecture.md](./architecture.md)** | Arquitectura completa del sistema, diagramas, componentes | Todos |
| **[MIGRATION.md](./MIGRATION.md)** | Rationale del cambio de React SPA a Next.js | Todos |
| **[assumptions.md](./assumptions.md)** | Suposiciones y decisiones del proyecto | Product Owners, Developers |

**Diagramas Visuales:**
- `diagrams/architecture.drawio` - Diagrama editable de arquitectura (Draw.io)
- `images/architecture.png` - Diagrama de arquitectura (imagen)

### 🔐 Seguridad y Autenticación

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[AUTHENTICATION.md](./AUTHENTICATION.md)** | Flujos de autenticación, NextAuth.js, Azure AD | Developers, Security Team |
| **[COMPLIANCE.md](./COMPLIANCE.md)** | GDPR, regulaciones, privacidad, trazabilidad | Compliance, Legal, Developers |

### 🚀 Despliegue e Infraestructura

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Guía completa de despliegue en Azure | DevOps, Developers |
| **[../infra/README.md](../infra/README.md)** | Infraestructura Terraform en detalle | DevOps, SRE |

### 👨‍💻 Desarrollo

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| **[ONBOARDING.md](./ONBOARDING.md)** | Guía completa para nuevos desarrolladores | New Developers |
| **[../CHANGELOG.md](../CHANGELOG.md)** | Historial de cambios y versiones | All Developers |

---

## 🎯 Guías por Caso de Uso

### "Necesito configurar mi entorno de desarrollo"

➡️ [ONBOARDING.md - Development Environment Setup](./ONBOARDING.md#-development-environment-setup)

**También necesitarás:**
- Azure AD credentials (pide al team lead)
- Acceso al repositorio GitHub

### "Quiero entender cómo funciona la autenticación"

➡️ [AUTHENTICATION.md](./AUTHENTICATION.md)

**Conceptos clave:**
- NextAuth.js con Azure AD
- Server-side session management
- JWT tokens en HttpOnly cookies
- Flujos de login/logout

### "Necesito desplegar cambios a producción"

➡️ [DEPLOYMENT.md](./DEPLOYMENT.md)

**Pasos principales:**
1. Merge a `main` branch
2. GitHub Actions ejecuta workflow
3. Aprobación manual requerida
4. Deployment automático a Azure

### "Debo garantizar cumplimiento GDPR"

➡️ [COMPLIANCE.md](./COMPLIANCE.md)

**Aspectos cubiertos:**
- Data minimization
- Right to erasure
- Audit trail
- Privacy by design

### "Quiero entender por qué migramos a Next.js"

➡️ [MIGRATION.md](./MIGRATION.md)

**Razones principales:**
- Mejor seguridad (tokens en servidor)
- Performance mejorado (SSR)
- Mejor DX (developer experience)
- SEO optimizado

### "Necesito provisionar infraestructura en Azure"

➡️ [DEPLOYMENT.md - Infrastructure with Terraform](./DEPLOYMENT.md#-infraestructura-con-terraform)

➡️ [../infra/README.md](../infra/README.md)

**Recursos creados:**
- Azure Static Web Apps
- Azure Container Apps
- Azure AI Search
- Azure Key Vault
- Application Insights

---

## 📖 Documentación por Rol

### 🎨 Frontend Developers

**Lectura esencial:**
1. [ONBOARDING.md](./ONBOARDING.md) - Setup y workflows
2. [architecture.md - Frontend Section](./architecture.md#1-frontend-nextjs-15-on-static-web-apps)
3. [AUTHENTICATION.md](./AUTHENTICATION.md) - Uso de sesiones

**Referencia rápida:**
- Next.js 15 App Router
- Server Components vs Client Components
- NextAuth.js hooks y utilities
- Tailwind CSS + Shadcn/ui

### 🔧 Backend Developers

**Lectura esencial:**
1. [architecture.md - Backend Section](./architecture.md#2-backend-python-fastapi-on-container-apps)
2. [AUTHENTICATION.md - Token Validation](./AUTHENTICATION.md)
3. [DEPLOYMENT.md - Backend Deployment](./DEPLOYMENT.md#-despliegue-del-backend-fastapi)

**Referencia rápida:**
- FastAPI con async/await
- Azure OpenAI integration
- Azure AI Search queries
- JWT validation

### ☁️ DevOps / SRE

**Lectura esencial:**
1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Todo el documento
2. [../infra/README.md](../infra/README.md) - Terraform modules
3. [architecture.md - Infrastructure](./architecture.md)

**Referencia rápida:**
- Terraform state management
- GitHub Actions workflows
- Azure Static Web Apps config
- Container Apps scaling
- Monitoring y alerting

### 🛡️ Security / Compliance

**Lectura esencial:**
1. [COMPLIANCE.md](./COMPLIANCE.md) - Todo el documento
2. [AUTHENTICATION.md - Security Section](./AUTHENTICATION.md#-seguridad-implementada)
3. [architecture.md - Security Principles](./architecture.md#principios-de-diseño)

**Referencia rápida:**
- GDPR compliance
- Audit trail
- Data retention policies
- Token management
- Secrets management (Key Vault)

### 📊 Product Owners / Managers

**Lectura esencial:**
1. [README.md](../README.md) - Project overview
2. [MIGRATION.md - Executive Summary](./MIGRATION.md#-resumen-ejecutivo)
3. [assumptions.md](./assumptions.md) - Project assumptions
4. [CHANGELOG.md](../CHANGELOG.md) - What's changed

**Referencia rápida:**
- Project status y roadmap
- Architecture decisions y rationale
- Compliance guarantees
- Deployment strategy

---

## 🔄 Documentación del Cambio Arquitectónico

El proyecto migró de React SPA a Next.js en enero 2026. Documentos relevantes:

| Documento | Qué Cubre |
|-----------|-----------|
| **[MIGRATION.md](./MIGRATION.md)** | Rationale completo del cambio |
| **[CHANGELOG.md](../CHANGELOG.md)** | Lista detallada de cambios |
| **[README.md](../README.md)** | README actualizado post-migración |
| **[architecture.md](./architecture.md)** | Arquitectura actualizada |

### Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Frontend | React 18 + Vite | Next.js 15 |
| Auth | MSAL.js (cliente) | NextAuth.js (servidor) |
| Rendering | CSR | SSR + CSR |
| Routing | React Router | App Router |
| Bundle | ~250KB | ~180KB |

---

## 📝 Contribuir a la Documentación

### ¿Encontraste algo incorrecto o desactualizado?

1. Crea un issue en GitHub describiendo el problema
2. O mejor, crea un PR con la corrección
3. Tag con label `documentation`

### Añadiendo Nueva Documentación

**Estructura recomendada:**

```markdown
# Título del Documento

## 📋 Overview
Breve descripción

## 🎯 Sección Principal
Contenido...

## 📚 Referencias
Links relevantes

---
**Última actualización**: Fecha
**Versión**: X.X.X
```

**Dónde agregar:**
- **Guías técnicas**: `/docs/`
- **Diagramas**: `/docs/diagrams/`
- **Imágenes**: `/docs/images/`
- **Infraestructura**: `/infra/`

---

## 🔍 Búsqueda Rápida

### Por Keyword

- **Next.js**: [MIGRATION.md](./MIGRATION.md), [ONBOARDING.md](./ONBOARDING.md), [architecture.md](./architecture.md)
- **Authentication**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Azure**: [DEPLOYMENT.md](./DEPLOYMENT.md), [../infra/README.md](../infra/README.md)
- **Terraform**: [DEPLOYMENT.md](./DEPLOYMENT.md), [../infra/README.md](../infra/README.md)
- **GDPR**: [COMPLIANCE.md](./COMPLIANCE.md)
- **Security**: [AUTHENTICATION.md](./AUTHENTICATION.md), [COMPLIANCE.md](./COMPLIANCE.md)
- **Testing**: [ONBOARDING.md - Testing](./ONBOARDING.md#-testing)
- **Troubleshooting**: [ONBOARDING.md - Common Issues](./ONBOARDING.md#-common-issues--solutions)

### Por Tecnología

- **Next.js 15**: [MIGRATION.md](./MIGRATION.md), [architecture.md](./architecture.md)
- **NextAuth.js**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **FastAPI**: [architecture.md](./architecture.md)
- **Azure Static Web Apps**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Azure Container Apps**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Terraform**: [../infra/README.md](../infra/README.md)

---

## 📊 Métricas de Documentación

| Métrica | Valor |
|---------|-------|
| Total de documentos | 10+ |
| Líneas de documentación | 5,000+ |
| Última actualización | Enero 2026 |
| Cobertura | ~95% del sistema |

---

## 🆘 ¿Necesitas Ayuda?

Si no encuentras lo que buscas en la documentación:

1. **Busca en GitHub Issues** - Alguien pudo haber tenido la misma pregunta
2. **Crea un issue** - Con label `question` o `documentation`
3. **Contacta al equipo** - Ver [ONBOARDING.md - Team & Communication](./ONBOARDING.md#-team--communication)

---

## 📅 Plan de Mantenimiento

La documentación se revisa y actualiza:

- **Cada release**: CHANGELOG.md
- **Cambios arquitectónicos**: Todos los docs afectados
- **Mensualmente**: Review general de accuracy
- **Trimestralmente**: Compliance y security docs

**Próxima revisión programada**: Abril 2026

---

**Esta documentación está viva y evoluciona con el proyecto. ¡Mantengámosla actualizada juntos! 📚**

---

**Última actualización**: Enero 2026  
**Mantenido por**: Syntonize Development Team  
**Versión**: 1.0.0
