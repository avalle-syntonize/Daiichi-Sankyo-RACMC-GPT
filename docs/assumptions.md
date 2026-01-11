# Assumptions Iniciales - RACMC GPT

**Fecha:** 2026-01-11  
**Estado:** ⚠️ PENDIENTE DE VALIDACIÓN CON CLIENTE

---

## 1. SharePoint

### Estructura
- **Ruta base:** `/RACMC/[Nombre Proyecto]/documentos/`
- **Organización:** Cada proyecto tiene su propia carpeta con subdirectorio de documentos

### Proyectos Activos
- **Volumen estimado:** ~5-10 proyectos activos
- **Gestión:** Carpetas claramente identificadas por nombre de proyecto

### Permisos de Acceso
- **Tipo de acceso:** Permisos de lectura via Service Principal disponibles
- **Método de autenticación:** Service Principal con permisos de lectura configurados

### Tenant
- **Organización:** Daiichi Sankyo Europe
- **SharePoint URL:** ⚠️ A confirmar con cliente en kickoff meeting

---

## 2. Documentos

### Formatos Soportados
Los siguientes formatos de archivo serán procesados por el sistema:
- PDF
- Excel (XLSX)
- DOCX (Word)
- PPTX (PowerPoint)

### Prioridad de Procesamiento
**Orden de prioridad:** Excel > PDF > DOCX > PPTX

### Características por Formato

#### Excel (XLSX)
- **Tipo:** Template estructurado
- **Estado:** ⚠️ PENDIENTE recibir del cliente
- **Asunción:** Datos estructurados con columnas consistentes entre archivos
- **Uso esperado:** Tablas de datos regulatorios, tracking sheets, comparativas

#### PDF
- **Tipo:** Documentación técnica y documentos regulatorios
- **Contenido esperado:** Technical dossiers, regulatory submissions, guidelines
- **Procesamiento:** Extracción de texto y estructura de secciones

#### DOCX
- **Tipo:** Documentos corporativos estándar
- **Estructura esperada:** Documentos con encabezados, tablas y formato estándar
- **Contenido:** Reports, SOPs, protocols

#### PPTX
- **Tipo:** Presentaciones
- **Contenido esperado:** Slides de presentación, potencialmente con notas de orador
- **Uso:** Executive summaries, training materials, meeting decks

### Volumen de Documentos
- **Estimación:** ~100-500 documentos por proyecto
- **Total aproximado:** 500-5,000 documentos en el sistema

---

## 3. Usuarios y Seguridad

### Usuarios Iniciales
- **Cantidad:** 10-20 usuarios RACMC
- **Perfil:** Personal de Regulatory Affairs de Daiichi Sankyo Europe

### Autenticación
- **Sistema:** Entra ID (Microsoft Azure Active Directory)
- **Tenant:** Daiichi Sankyo Europe
- **Método:** Single Sign-On (SSO) con credenciales corporativas

### Roles y Permisos
- **Modelo inicial:** Sin roles diferenciados inicialmente
- **Nivel de acceso:** Todos los usuarios tienen el mismo nivel de acceso
- **Permisos de documentos:** Acceso de lectura a todos los documentos de proyectos asignados

### Enterprise Application
- **Estado:** ⚠️ A crear o confirmar si ya existe
- **Propósito:** Registro de la aplicación en Entra ID para autenticación

### Seguridad de Datos
- **Cumplimiento:** GDPR compliance (datos en West Europe)
- **Acceso:** Usuarios solo acceden a información de proyectos a los que están asignados
- **Auditoría:** Logs de acceso y consultas para trazabilidad

---

## 4. Infraestructura

### Región de Azure
- **Región principal:** West Europe
- **Justificación:** Cumplimiento GDPR para datos europeos

### Entornos

#### Staging (Desarrollo Inicial)
- **Plataforma:** Cuenta personal de Azure
- **Propósito:** Desarrollo inicial y pruebas tempranas
- **Periodo:** Semanas 1-7

#### Production
- **Plataforma:** Tenant de Syntonize
- **Migración:** Semana 8-9
- **Go-live:** Semana 10

### SLA Target
- **Objetivo:** 99% uptime
- **Disponibilidad esperada:** ~7.3 horas de downtime máximo por mes

### Estrategia de Costos
- **Desarrollo:** Maximizar uso de Azure Free Tier
- **Optimización:** Revisión de costos en Semana 7 antes de migración

### Servicios Azure a Utilizar

| Servicio | Tier/Plan | Propósito |
|----------|-----------|-----------|
| **Azure Static Web Apps** | Free | Frontend hosting (React/Next.js) |
| **Azure Container Apps** | Consumption plan | Backend API hosting |
| **Azure AI Search** | Free tier | Vector database y búsqueda semántica |
| **Azure OpenAI** | Pay-as-you-go | LLM para RAG (GPT-4) |
| **Azure Blob Storage** | Standard | Almacenamiento de documentos procesados |
| **Azure Key Vault** | Standard | Gestión de secretos y credenciales |
| **Azure Logic Apps** | Consumption | Orquestación y SharePoint integration |

---

## 5. Validación

### Ground Truth Dataset
- **Tamaño:** 50-100 pares de preguntas y respuestas (Q&A pairs)
- **Estado:** ⚠️ PENDIENTE recibir del cliente
- **Archivo esperado:** `2025_DaiichiSankyo_GroundTruth_v1_TS.xlsx`

#### Estructura del Archivo Ground Truth
| Columna | Descripción |
|---------|-------------|
| **Question** | Pregunta de ejemplo del usuario |
| **Expected_Answer** | Respuesta esperada correcta |
| **Source_Document** | Documento fuente de donde proviene la información |
| **Page** | Número de página o sección específica |

### Comité Regulatorio
- **Requisito:** Validación requerida antes de go-live
- **Timing:** Semana 9
- **Propósito:** Asegurar compliance regulatorio antes del lanzamiento

### Participantes UAT
- **Cantidad:** 5-7 usuarios finales de RACMC
- **Perfil:** Usuarios representativos del equipo Regulatory Affairs
- **Periodo:** Semana 8

### Enfoque de Testing
**Evaluación basada en métricas:**
- **Precision:** Porcentaje de respuestas correctas
- **Recall:** Cobertura de información relevante
- **Hallucination Rate:** Frecuencia de información incorrecta generada
- **Response Time:** Tiempo de respuesta del sistema
- **Source Accuracy:** Precisión en la citación de fuentes

---

## 6. Contexto del Proyecto

### Duración Total
- **Tiempo:** 10 semanas
- **Inicio:** 2026-01-11
- **Go-live previsto:** Semana 10

### Esfuerzo Estimado
- **Total:** ~195 horas
- **Distribución:** Desarrollo, testing, documentación y deployment

### Hitos Principales (Key Milestones)

| Semana | Hito | Entregables |
|--------|------|-------------|
| **Semana 1** | Architecture & Infrastructure setup | Arquitectura definida, infraestructura base Azure |
| **Semana 2** | UI + Authentication | Frontend básico, login con Entra ID |
| **Semanas 3-4** | Document ingestion + RAG | Pipeline de procesamiento de documentos, RAG básico |
| **Semanas 5-7** | SharePoint integration + Advanced features | Integración con SharePoint, features avanzadas |
| **Semanas 8-9** | Testing, optimization & deployment | UAT, optimización, migración a producción |
| **Semana 10** | Go-live + Handoff | Lanzamiento, documentación, transferencia |

### Fases del Proyecto

#### Fase 1: Foundation (Semanas 1-2)
- Setup de infraestructura Azure
- Arquitectura del sistema
- UI básico y autenticación

#### Fase 2: Core Features (Semanas 3-4)
- Ingesta de documentos
- Implementación RAG
- Búsqueda básica

#### Fase 3: Integration (Semanas 5-7)
- Integración SharePoint
- Features avanzadas
- Optimización de queries

#### Fase 4: Launch (Semanas 8-10)
- Testing completo (UAT)
- Validación regulatoria
- Deployment a producción
- Go-live y handoff

---

## ⚠️ Nota Importante sobre estas Asunciones

### Estado de Validación
Estas son **asunciones iniciales** basadas en las discusiones de planificación del proyecto. **Todas las asunciones deben ser validadas con el cliente** durante la reunión de kickoff.

### Proceso de Actualización
- Este documento será **actualizado** conforme el cliente proporcione clarificaciones
- Las asunciones validadas se marcarán como ✅ **CONFIRMADO**
- Las asunciones modificadas incluirán la nueva información con fecha de actualización
- Las asunciones rechazadas se marcarán como ❌ **DESCARTADO** con la alternativa correcta

### Tracking de Validación
- **Issue de referencia:** #1 - Documento de Dudas Técnicas al Cliente
- En la reunión de kickoff se revisarán todas estas asunciones
- Las respuestas del cliente se documentarán en Issue #1
- Este documento se actualizará basándose en las respuestas del cliente

### Uso de este Documento
- **Permite** al equipo de desarrollo proceder con las tareas de Semana 1 (Issues #2-6)
- **Proporciona** un framework común de entendimiento del proyecto
- **Identifica** áreas que requieren clarificación del cliente
- **Facilita** la comunicación y toma de decisiones durante el desarrollo inicial

### Próximos Pasos
1. Revisar este documento en la reunión de kickoff con el cliente
2. Documentar respuestas y clarificaciones del cliente en Issue #1
3. Actualizar este documento con información validada
4. Ajustar planificación si las asunciones difieren significativamente de la realidad

---

**Documento creado:** 2026-01-11  
**Última actualización:** 2026-01-11  
**Próxima revisión:** Kickoff meeting con cliente
