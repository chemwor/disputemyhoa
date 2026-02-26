# Case Workspace Page - Datatype Mapping

## Class Properties (CaseWorkspace)

### **Core State Properties:**
```typescript
interface CaseWorkspace {
  caseToken: string | null          // URL parameter "case"
  caseData: CaseData | null         // Form submission data from user
  isUnlocked: boolean               // Whether case is paid/unlocked
  outputs: OutputsData | null       // AI-generated case analysis
  messages: Message[]               // Chat messages with AI assistant
  documents: Document[]             // User-uploaded documents
  UI_COPY: UICopyMap               // Dynamic UI text based on outcome
}
```

## **Primary Data Structures:**

### **1. CaseData (from form submission):**
```typescript
interface CaseData {
  token: string                     // Generated case token
  createdAt: string                // ISO timestamp
  propertyType: string             // "condo" | "townhome" | "single-family" | "other"
  role: string                     // "homeowner" | "tenant" | "landlord" | "seller"
  state: string                    // US state code (e.g., "GA")
  deadline: string | null          // User-provided deadline
  noticeType: string              // "violation" | "fine" | "hearing" | etc.
  issueText: string               // User description of issue
  outcome: string                 // "clarification" | "extension" | "comply" | "dispute"
  pastedText: string | null       // Pasted HOA notice text
  email: string                   // User email
  extract_status: string          // Document processing status
  additional_docs: AdditionalDoc[] // Additional uploaded files
}
```

### **2. OutputsData (AI-generated analysis):**
```typescript
interface OutputsData {
  // Core content
  letter_summary: string           // Plain text summary
  summary_html: string            // HTML formatted summary
  
  // Draft letters
  drafts: {
    clarification: string         // Clarification request letter
    extension: string            // Extension request letter  
    compliance: string           // Compliance confirmation letter
  }
  
  // Draft titles (dynamic based on case)
  draft_titles: {
    clarification: string        // Title for clarification draft
    extension: string           // Title for extension draft
    compliance: string          // Title for compliance draft
  }
  
  // Action planning
  action_plan: string[]          // Array of actionable steps
  lowest_cost_path: string[]     // Recommended approach steps
  
  // Risk assessment
  risks_and_deadlines: {
    risks: string[]              // Array of potential risks
    deadlines: string[]          // Array of important dates
  }
  
  // Questions and guidance
  questions_to_ask: string[]     // Questions to ask HOA
  
  // Metadata
  generated_at: string          // ISO timestamp
  generation_source: string     // "post_payment_analysis"
  doc_fingerprint: DocFingerprint // Document processing info
  payment_info: PaymentInfo     // Stripe payment details
}
```

### **3. Message (Chat system):**
```typescript
interface Message {
  role: "user" | "assistant"      // Message sender
  text: string                    // Message content
  ts: number                      // Timestamp (milliseconds)
}
```

### **4. Document (File management):**
```typescript
interface Document {
  id: string                      // Unique document ID
  name: string                    // Original filename
  type: string                    // MIME type
  size: number                    // File size in bytes
  url?: string                    // Download URL (if available)
}
```

### **5. API Response Types:**

#### **Case API Response:**
```typescript
interface CaseAPIResponse {
  id: string                      // Database ID
  token: string                   // Case token
  unlocked: boolean              // Payment status
  status: "paid" | "pending"     // Alternative payment status
  payload: CaseData              // Form data
  outputs?: OutputsData          // Embedded outputs (if ready)
  outputs_status?: "ready" | "processing" // Outputs processing status
  created_at: string             // ISO timestamp
  updated_at: string             // ISO timestamp
}
```

#### **Outputs API Response:**
```typescript
interface OutputsAPIResponse {
  status: "ready" | "processing" | "waiting"
  result?: OutputsData           // Generated content
  outputs?: OutputsData          // Alternative field name
  fine_per_day?: number | string // Daily fine amount (from dmhoa_case_outputs)
  fine_start_date?: string       // Fine start date YYYY-MM-DD (from dmhoa_case_outputs)
  created_at?: string           // ISO timestamp
  updated_at?: string           // ISO timestamp
}
```

**Note:** The `fine_per_day` and `fine_start_date` fields are stored as columns in the
`dmhoa_case_outputs` table and MUST be returned by the `/api/read-outputs` endpoint
for the Fine Accrual Calculator widget to display.

#### **Messages API Response:**
```typescript
interface MessagesAPIResponse {
  messages: Array<{
    role: "user" | "assistant"
    content: string              // Message text
    created_at: string          // ISO timestamp
  }>
}
```

### **6. UI Copy Structure:**
```typescript
interface UICopyMap {
  outcome: {
    [outcome: string]: {
      pageTitle: string          // Dynamic page title
      pageSubtitle: string       // Dynamic page subtitle
      draftTitles: {
        clarification: string    // Dynamic draft title
        extension: string       // Dynamic draft title
        compliance: string      // Dynamic draft title
      }
    }
  }
}
```

### **7. Supporting Types:**

```typescript
interface AdditionalDoc {
  filename: string               // Original filename
  storage_path: string          // Cloud storage path
  mime_type: string            // File MIME type
  uploaded_at: string          // ISO timestamp
}

interface DocFingerprint {
  ids: string[]                // Document IDs
  count: number               // Number of documents
  statuses: (string | null)[] // Processing statuses
  charCounts: number[]        // Character counts per doc
  usableCount: number         // Successfully processed count
  newestUpdatedAt: string     // Latest update timestamp
}

interface PaymentInfo {
  case_url: string             // Case access URL
  currency: string             // "usd"
  session_id: string          // Stripe session ID
  customer_email: string      // Customer email
  payment_amount: number      // Amount in cents
  payment_completed_at: string // ISO timestamp
}
```

## **API Endpoints Used:**

1. **`GET /api/case-data?token={token}`** → `CaseAPIResponse`
2. **`GET /api/read-outputs?token={token}`** → `OutputsAPIResponse` 
3. **`POST /api/case-analysis`** → Trigger outputs generation
4. **`GET /api/read-messages?token={token}&limit={n}`** → `MessagesAPIResponse`
5. **`POST /api/store-message`** → Store chat message
6. **`POST /api/send-message`** → Send chat message to AI

## **State Management Flow:**

1. **Page Load** → Extract `caseToken` from URL
2. **Case Loading** → Fetch `CaseData` from `/api/case-data`
3. **Unlock Check** → Determine `isUnlocked` status
4. **Processing Gate** → If unlocked but no ready outputs, show processing screen
5. **Outputs Loading** → Wait for `OutputsData` to be fully ready (status: "ready")
6. **UI Population** → Render content only after outputs are complete
7. **Chat System** → Load existing messages, enable real-time chat
8. **Document Management** → Handle file uploads and display

## **New Processing Flow (Updated):**

### **For Unlocked Cases:**
```
loadCaseFromURL()
  ↓
if (isUnlocked && !outputs)
  ↓ 
showProcessingOutputs() ← **Shows processing screen**
  ↓
loadOrGenerateOutputs() ← **Waits for status: "ready"**  
  ↓
hideProcessingOutputs() ← **Reveals workspace only when ready**
  ↓
populateWorkspace() ← **Full content displayed**
```

### **Key Processing States:**
- **`status: "pending"`** → Keep showing processing screen
- **`status: "processing"`** → Keep showing processing screen  
- **`status: "ready"`** → Hide processing screen, show workspace
- **No outputs found** → Trigger generation, then wait

### **User Experience:**
- Users see professional loading screen while AI generates content
- Workspace only appears when drafts, action plans, and analysis are complete
- No partial or incomplete content is ever shown
- Smooth transition from processing to full workspace

This ensures users never see an incomplete case workspace and always get the full generated content before the page becomes interactive.
