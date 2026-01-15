---

## Status Update - 2026-01-12

### ✅ Decisions Received from Client

**1. Technology Stack Change**
- **Status:** ✅ APPROVED
- **Decision:** "Please go ahead with the tech stack changes proposed for dsGPT which will also be used for RA CMC-GPT"
- **Impact:** Confirmed - using unified stack (React + Vite, FastAPI, Azure services)

**2. Infrastructure Strategy**  
- **Status:** ✅ APPROVED  
- **Decision:** "Option A: Fully separated Resource Groups"  
- **Impact:** RACMC-GPT and DS-BOT will have completely separate Azure Resource Groups (no shared resources)  
- **Implementation:**  
  - Resource Group RACMC: `rg-racmc-{environment}`  
  - Resource Group DS-BOT: `rg-dsbot-{environment}`  
  - Independent scaling, cost tracking, and lifecycle management  

**3. Enterprise Application (Entra ID)**
- **Status:** ⏳ PENDING - Service Request Required  
- **Process:** Client must submit Service Request to Azure Service Provider  
- **Timeline:**   
  - Jan 20, 2026: Send complete specifications (after Static Web App deployment)  
  - Target approval: End of January / Early February 2026  
  - Deadline needed: February 10, 2026 (Week 6 - SharePoint integration)  
- **Impact on Roadmap:**   
  - If approved by end of January: Follow original roadmap  
  - If delayed: Reorder tasks to prioritize document parsers, RAG pipeline, frontend (with mocked auth)  
- **Dependencies:**   
  - Waiting for provider's template/format requirements  
  - Waiting for typical processing timeframe confirmation  

**4. SharePoint Access**
- **Status:** ⏳ PENDING - Coordination with Tobias  
- **Contact:** Tobias (technical lead for SharePoint)  
- **Needed:** SharePoint structure confirmation, sample documents, webhook support  

**5. DS-BOT Storage Account Access**
- **Status:** ⏳ PENDING - Clarification sent  
- **Purpose:** Review document volumes for RACMC cost estimation  
- **Alternative:** Client may provide metrics directly instead of granting access  

**6. Production Domain**
- **Status:** ⏳ PENDING DECISION  
- **Options:**   
  - Define now (e.g., racmc-gpt.daiichi-sankyo.eu) → Include in initial Enterprise App request  
  - Define later (Week 8-9) → Requires second Service Request to add production URLs  
- **Recommendation:** Define early to minimize Service Requests

---

## ⚠️ Updated Assumptions Based on Client Feedback

### Infrastructure - Resource Isolation
**Previous assumption:** Possible shared resources between projects  
**Updated:** Fully separated Resource Groups confirmed - no shared infrastructure

### Enterprise Application Timeline
**Previous assumption:** Could create Enterprise Apps directly  
**Updated:** Requires Service Request to external Azure provider (2-4 weeks processing time)

### Development Approach
**Previous assumption:** Real authentication from Week 2  
**Updated:** May need to use mocked authentication in Weeks 2-5 if Enterprise App is delayed

---

## 🔄 Postponed Questions (Functional Requirements)

The following questions will be asked in Week 5-6 after infrastructure is stable:
- User workflow details and preferences
- Business logic edge cases and error handling
- Query complexity requirements and expectations
- Export format preferences (PDF vs Word templates)
- Specific regulatory compliance requirements beyond GDPR
- Document retention and archival policies
- User roles and permissions (if needed beyond basic access)

**Rationale:** Focus on technical/architectural questions first (Weeks 1-5). Ask functional questions later when we have working prototypes and can demonstrate features for more informed discussions.

---

## 📅 Next Actions

### Immediate (Week 1):
- [ ] Complete Terraform infrastructure setup (Issue #3)
- [ ] Provision Azure Static Web Apps (Issue #4)
- [ ] Obtain staging URL for Enterprise App request

### Week 2 (Jan 20):
- [ ] Send complete Enterprise App specifications to client
- [ ] Include provider template/format if provided

### Pending from Client:
- [ ] Enterprise App Service Request submission and timeline
- [ ] Introduction to Tobias for SharePoint coordination
- [ ] Production domain decision (now or later)
- [ ] Provider's template/format for Service Request
- [ ] DS-GPT deployment decision (DOCX/PPTX feature)

---

**Last Updated:** 2026-01-12  
**Next Review:** 2026-01-20 (after Static Web App deployment)