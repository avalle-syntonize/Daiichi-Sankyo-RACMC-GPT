# Cumplimiento Normativo y Privacidad - RACMC-GPT

## 📋 Overview

RACMC-GPT es un sistema diseñado para cumplir con estrictos requisitos regulatorios de la industria farmacéutica. Este documento detalla las garantías de cumplimiento, privacidad de datos, evidencia de trazabilidad y controles implementados.

---

## 🛡️ Frameworks de Cumplimiento

### Regulaciones Aplicables

| Regulación | Alcance | Estado |
|------------|---------|--------|
| **GDPR** | Protección de datos personales (EU) | ✅ Implementado |
| **ISO 27001** | Seguridad de la información | ✅ Seguido |
| **GxP** | Good Practice (Pharma) | ✅ Considerado |
| **FDA 21 CFR Part 11** | Registros electrónicos | 🔄 En evaluación |
| **SOC 2 Type II** | Controls de servicio | ✅ Azure certified |

---

## 🔐 Privacidad y Protección de Datos

### 1. Principios GDPR Implementados

#### a) Data Minimization

**Implementación:**
```typescript
// Solo almacenamos datos mínimos necesarios
interface UserSession {
  id: string;              // User ID (pseudónimo)
  email: string;           // Email corporativo
  name: string;            // Nombre para UI
  roles: string[];         // Roles para autorización
  // NO almacenamos: dirección, teléfono, datos sensibles
}
```

**Garantías:**
- ✅ No se almacena historial de conversaciones
- ✅ No se guardan consultas de usuarios
- ✅ No se persiste información médica sensible
- ✅ Solo datos necesarios para autenticación y autorización

#### b) Purpose Limitation

**Uso de Datos:**
| Dato | Propósito | Retención | Base Legal |
|------|-----------|-----------|------------|
| User ID | Autenticación | Sesión (24h) | Legitimate Interest |
| Email | Identificación | Sesión (24h) | Legitimate Interest |
| Logs de acceso | Auditoría de seguridad | 90 días | Legal Obligation |
| Métricas agregadas | Optimización del servicio | Indefinido (anónimas) | Legitimate Interest |

#### c) Storage Limitation

**Políticas de Retención:**

```yaml
# Retention Policy
User Sessions:
  Storage: In-memory (Redis) + JWT cookie
  Retention: 24 hours (auto-expire)
  
Conversation Data:
  Storage: None (ephemeral)
  Retention: Session only (no persistence)
  
Access Logs:
  Storage: Application Insights
  Retention: 90 days
  
Audit Logs:
  Storage: Log Analytics Workspace
  Retention: 2 years (compliance requirement)
  
Documents (SharePoint):
  Storage: Azure Blob Storage
  Retention: Per client policy
```

#### d) Data Security (Integrity & Confidentiality)

**Encryption at Rest:**
```
✅ Azure Storage: AES-256 encryption
✅ Azure SQL/Cosmos DB: TDE (Transparent Data Encryption)
✅ Key Vault secrets: AES-256
✅ Backups: Encrypted
```

**Encryption in Transit:**
```
✅ HTTPS/TLS 1.3 only
✅ Certificate pinning
✅ HSTS enabled
```

**Access Control:**
```
✅ Azure RBAC (Role-Based Access Control)
✅ Entra ID authentication mandatory
✅ MFA required for admin operations
✅ Principle of least privilege
```

#### e) Accountability

**Compliance Monitoring:**
- Application Insights para tracking de acceso
- Azure Monitor alertas en tiempo real
- Log Analytics para auditoría
- Compliance reports mensuales

### 2. Data Subject Rights (DSR)

| Derecho | Implementación |
|---------|----------------|
| **Right to Access** | User puede exportar sus datos de sesión vía API |
| **Right to Erasure** | Logout elimina sesión inmediatamente |
| **Right to Rectification** | Datos vienen de Entra ID (single source of truth) |
| **Right to Portability** | Export de conversación actual (JSON) |
| **Right to Object** | User puede cerrar sesión en cualquier momento |

**Endpoint de Data Export:**

```typescript
// app/api/user/export/route.ts
export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const userData = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    sessionCreated: session.expires,
    // NO incluimos historial (no existe)
  };
  
  return new Response(JSON.stringify(userData), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-data.json"'
    }
  });
}
```

### 3. Privacy by Design

**Decisiones Arquitectónicas:**

1. **No Persistent Chat History**
   - ✅ Conversaciones viven solo en memoria durante sesión
   - ✅ Al cerrar navegador, todo se elimina
   - ✅ No hay base de datos de mensajes

2. **Pseudonymization**
   - ✅ User IDs son GUIDs (no nombres reales en logs)
   - ✅ Logs agregados sin PII

3. **Minimal Data Collection**
   - ✅ Solo datos de Entra ID necesarios
   - ✅ No tracking de comportamiento del usuario

---

## 📝 Evidencia y Trazabilidad

### 1. Audit Trail

**Eventos Registrados:**

| Evento | Datos Capturados | Retención | Propósito |
|--------|------------------|-----------|-----------|
| User Login | User ID, timestamp, IP | 90 días | Seguridad |
| User Logout | User ID, timestamp | 90 días | Seguridad |
| Query Submitted | User ID, timestamp, query hash | 90 días | Auditoría |
| Document Accessed | User ID, doc ID, timestamp | 2 años | Compliance |
| Error Occurred | User ID, error type, timestamp | 90 días | Troubleshooting |

**Ejemplo de Log Entry:**

```json
{
  "timestamp": "2026-01-22T10:30:00Z",
  "event": "document_accessed",
  "userId": "abc-123-def-456",
  "documentId": "doc-789",
  "documentTitle": "Clinical Trial Protocol v2.3",
  "action": "view",
  "ipAddress": "10.0.1.5",
  "sessionId": "session-xyz",
  "result": "success"
}
```

### 2. Query Logging (para Compliance)

**Sin almacenar contenido sensible:**

```typescript
// Backend logging
interface QueryLog {
  queryId: string;           // UUID único
  userId: string;            // User ID (pseudónimo)
  timestamp: Date;
  queryHash: string;         // SHA-256 hash (no texto real)
  documentsRetrieved: number;
  responseTime: number;
  status: 'success' | 'error';
  // NO almacenamos: query text, response text
}
```

### 3. Export de Conversaciones

**Feature: Export Current Conversation**

```typescript
// Componente cliente
function ExportConversationButton() {
  const handleExport = () => {
    const conversation = getCurrentConversation();
    const exportData = {
      exportDate: new Date().toISOString(),
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        sources: msg.sources?.map(s => ({
          title: s.title,
          reference: s.reference
        }))
      }))
    };
    
    downloadJSON(exportData, `conversation-${Date.now()}.json`);
  };
  
  return (
    <button onClick={handleExport}>
      Export Conversation
    </button>
  );
}
```

**Formato de Export:**

```json
{
  "exportDate": "2026-01-22T10:30:00Z",
  "userId": "anonymous",
  "messages": [
    {
      "role": "user",
      "content": "What are the side effects of Drug X?",
      "timestamp": "2026-01-22T10:25:00Z"
    },
    {
      "role": "assistant",
      "content": "Based on the clinical trial data...",
      "timestamp": "2026-01-22T10:25:05Z",
      "sources": [
        {
          "title": "Clinical Trial Report - Drug X",
          "reference": "doc-123, page 45"
        }
      ]
    }
  ]
}
```

### 4. Source Attribution (Evidencia Base)

**Cada respuesta incluye fuentes:**

```typescript
interface AssistantResponse {
  content: string;
  sources: Source[];
  confidence: number;
}

interface Source {
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  excerpt: string;
  relevanceScore: number;
  url?: string;
}
```

**UI de Fuentes:**

```tsx
<div className="response">
  <p>{response.content}</p>
  
  <div className="sources">
    <h4>Sources:</h4>
    {response.sources.map(source => (
      <div key={source.documentId} className="source-card">
        <strong>{source.documentTitle}</strong>
        {source.pageNumber && <span>Page {source.pageNumber}</span>}
        <p className="excerpt">{source.excerpt}</p>
        <span className="score">
          Relevance: {Math.round(source.relevanceScore * 100)}%
        </span>
      </div>
    ))}
  </div>
</div>
```

---

## 🚫 Railroading y Control de Contenido

### 1. Content Filtering

**Prevención de Contenido Inapropiado:**

```typescript
// Backend - Content moderation
async function moderateQuery(query: string): Promise<boolean> {
  // 1. Azure Content Safety API
  const moderationResult = await azureContentSafety.analyze(query);
  
  if (moderationResult.flagged) {
    logSecurityEvent('query_blocked', {
      reason: moderationResult.category,
      severity: moderationResult.severity
    });
    return false;
  }
  
  // 2. Domain-specific rules
  const prohibitedTopics = [
    'off-label use',
    'unauthorized indications',
    'non-approved dosages'
  ];
  
  if (containsProhibitedTopics(query, prohibitedTopics)) {
    return false;
  }
  
  return true;
}
```

### 2. Response Guardrails

**System Prompt para GPT-4:**

```
You are a regulatory documentation assistant for pharmaceutical professionals.

STRICT RULES:
1. Only answer questions based on the provided documents
2. Never speculate or infer beyond the source material
3. Always cite specific sources (document + page number)
4. If information is not in the documents, say "I don't have that information"
5. Never provide medical advice or dosing recommendations
6. Stay within regulatory and compliance boundaries
7. If asked about unapproved uses, decline and explain why

PROHIBITED:
- Off-label use recommendations
- Medical advice to patients
- Speculation about unpublished data
- Comparison with competitor products
- Financial or market predictions

REQUIRED:
- Source attribution for every claim
- Clear indication when information is incomplete
- Professional, regulatory-compliant language
```

### 3. Scope Limitation

**Restricciones de Búsqueda:**

```typescript
// Solo búsqueda en documentos aprobados
const searchParams = {
  filter: `status eq 'approved' and department eq 'RACMC'`,
  top: 10,
  queryType: 'semantic',
  semanticConfiguration: 'racmc-config'
};

// No búsqueda web, solo documentos internos
const searchClient = new SearchClient(
  endpoint,
  'racmc-documents-index',
  credentials
);
```

---

## 🔍 Monitoreo de Cumplimiento

### 1. Compliance Dashboard

**Métricas Monitoreadas:**

| Métrica | Target | Alerta |
|---------|--------|--------|
| % Queries with sources | > 95% | < 90% |
| Avg sources per response | > 2 | < 1.5 |
| Content moderation blocks | Report | > 10/day |
| Failed auth attempts | Report | > 5/user/day |
| Data export requests | Report | All |
| Privacy violations | 0 | Any |

### 2. Alertas Automáticas

```typescript
// Azure Monitor Alert Rules
const alertRules = [
  {
    name: 'High Authentication Failures',
    condition: 'Failed logins > 5 in 5 minutes for same user',
    action: 'Email security team + Block user temporarily'
  },
  {
    name: 'Content Moderation Spike',
    condition: 'Moderated queries > 10 in 1 hour',
    action: 'Email compliance team + Review logs'
  },
  {
    name: 'Unusual Data Export',
    condition: 'Data export request outside business hours',
    action: 'Email security team + Log for audit'
  },
  {
    name: 'Missing Source Attribution',
    condition: 'Response without sources > 5% of queries',
    action: 'Email technical team + Review RAG pipeline'
  }
];
```

### 3. Reporting Periódico

**Informes Generados:**

- **Diario**: Métricas de uso y errores
- **Semanal**: Resumen de compliance, contenido moderado
- **Mensual**: Audit report completo, DSR requests
- **Trimestral**: Compliance assessment, risk review

---

## 📚 Documentación Regulatoria

### 1. Standard Operating Procedures (SOPs)

| SOP | Descripción | Estado |
|-----|-------------|--------|
| SOP-RACMC-001 | User Access Management | ✅ Aprobado |
| SOP-RACMC-002 | Data Backup and Recovery | ✅ Aprobado |
| SOP-RACMC-003 | Incident Response | ✅ Aprobado |
| SOP-RACMC-004 | Audit Logging | ✅ Aprobado |
| SOP-RACMC-005 | Data Export Requests | ✅ Aprobado |

### 2. Validation Documentation

**IQ/OQ/PQ (Installation/Operational/Performance Qualification):**

- [ ] IQ: Verificar instalación correcta de infraestructura
- [ ] OQ: Validar operación según especificaciones
- [ ] PQ: Demostrar performance en condiciones reales

### 3. Change Control

**Proceso para cambios en producción:**

1. Change Request (CR) submission
2. Impact assessment (security, compliance, performance)
3. Approval by technical + compliance teams
4. Deployment en staging → validation
5. Deployment en producción (con rollback plan)
6. Post-deployment validation

---

## 🛠️ Herramientas de Compliance

### 1. Logging y Auditoría

```bash
# Query logs desde Azure Monitor
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "
    AppTraces
    | where TimeGenerated > ago(24h)
    | where Properties.event in ('user_login', 'query_submitted', 'document_accessed')
    | project TimeGenerated, UserId=Properties.userId, Event=Properties.event
    | order by TimeGenerated desc
  "
```

### 2. Data Export para Auditorías

```bash
# Export audit logs
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "
    AppTraces
    | where TimeGenerated between (datetime(2026-01-01) .. datetime(2026-01-31))
    | project TimeGenerated, Event, UserId, Details
  " \
  --output csv > audit-log-january-2026.csv
```

---

## ✅ Checklist de Cumplimiento

### Pre-Producción

- [x] GDPR compliance review
- [x] Security assessment
- [x] Penetration testing
- [x] Data flow mapping
- [x] Privacy impact assessment (PIA)
- [x] SOPs documentation
- [ ] Validation (IQ/OQ/PQ)
- [ ] User training materials
- [ ] Incident response plan
- [ ] Business continuity plan

### Post-Producción

- [ ] Monthly compliance reports
- [ ] Quarterly security audits
- [ ] Annual GDPR assessment
- [ ] Continuous monitoring
- [ ] Regular penetration testing
- [ ] SOPs review and update

---

## 📞 Contactos de Compliance

| Rol | Contacto | Responsabilidad |
|-----|----------|-----------------|
| **Data Protection Officer** | dpo@daiichi-sankyo.eu | GDPR compliance |
| **Security Lead** | security@syntonize.com | Security issues |
| **Compliance Manager** | compliance@daiichi-sankyo.eu | Regulatory compliance |
| **Technical Lead** | avalle@syntonize.com | Technical implementation |

---

## 📚 Referencias

- [GDPR Official Text](https://gdpr-info.eu/)
- [Azure Compliance Offerings](https://docs.microsoft.com/en-us/azure/compliance/)
- [FDA 21 CFR Part 11](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [ISO 27001 Standard](https://www.iso.org/isoiec-27001-information-security.html)

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Estado**: Activo  
**Próxima revisión**: Abril 2026
