/**
 * Chat functionality
 */

// ============================================
// Send Message
// ============================================

function handleSendMessage() {
    const message = chatInput.value. trim();
    
    if (!message) return;
    if (!appState.selectedProject) {
        alert('Please select a project first');
        return;
    }
    
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    chatInput.value = '';
    autoResizeTextarea();
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Simulate bot response (in real app, this would be an API call)
    setTimeout(() => {
        hideLoadingIndicator();
        generateBotResponse(message);
    }, 2000);
    
    // Enable export button
    exportBtn.disabled = false;
}

function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
}

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
}

// ============================================
// Add Messages to Chat
// ============================================

function addUserMessage(text) {
    const messageData = {
        type: 'user',
        text: text,
        timestamp: new Date()
    };
    
    appState.conversationHistory.push(messageData);
    
    const messageElement = createMessageElement(messageData);
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function addBotMessage(text, citations = []) {
    const messageData = {
        type: 'bot',
        text: text,
        citations: citations,
        timestamp: new Date()
    };
    
    appState.conversationHistory. push(messageData);
    
    const messageElement = createMessageElement(messageData);
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function addSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message-system';
    messageElement.innerHTML = `
        <div class="system-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            ${text}
        </div>
    `;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${data.type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = data.type === 'user' ? 'U' : 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = data.text;
    
    contentDiv.appendChild(textDiv);
    
    // Add citations for bot messages
    if (data.type === 'bot' && data.citations && data.citations.length > 0) {
        const citationsDiv = document. createElement('div');
        citationsDiv.className = 'message-citations';
        
        data. citations.forEach(citation => {
            const citationSpan = document.createElement('span');
            citationSpan.className = 'citation';
            citationSpan.textContent = `[${citation. doc}, p. ${citation.page}]`;
            citationSpan.onclick = () => showReference(citation.id);
            citationsDiv.appendChild(citationSpan);
        });
        
        contentDiv. appendChild(citationsDiv);
    }
    
    // Add timestamp
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'message-timestamp';
    timestampDiv.textContent = formatTimestamp(data.timestamp);
    contentDiv.appendChild(timestampDiv);
    
    if (data.type === 'user') {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatar);
    } else {
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
    }
    
    return messageDiv;
}

// ============================================
// Loading Indicator
// ============================================

function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message message-bot';
    loadingDiv.id = 'loading-indicator';
    
    loadingDiv.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="message-loading">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// ============================================
// Generate Bot Response (Simulated)
// ============================================

function generateBotResponse(userMessage) {
    // This is a mock response - in production, this would call your backend API
    const responses = [
        {
            text: "According to the CMC Quality Overall Summary document, the drug substance manufacturing process involves three critical steps: API synthesis, purification, and final crystallization. The process control strategy ensures consistent quality attributes.",
            citations: [
                { id: 1, doc: "CMC_QOS_2023.pdf", page: 15 },
                { id:  2, doc: "API_Synthesis_Protocol.pdf", page: 8 }
            ],
            references: [
                {
                    id: 1,
                    name: "CMC_QOS_2023.pdf",
                    type: "pdf",
                    page: 15,
                    date: "2023-11-15",
                    url: "https://sharepoint.example.com/docs/CMC_QOS_2023.pdf"
                },
                {
                    id: 2,
                    name: "API_Synthesis_Protocol.pdf",
                    type: "pdf",
                    page: 8,
                    date: "2023-09-20",
                    url: "https://sharepoint.example.com/docs/API_Synthesis_Protocol.pdf"
                }
            ]
        },
        {
            text: "The stability data shows that the drug product maintains its potency and purity for 24 months when stored at controlled room temperature (15-25°C). Accelerated stability studies confirm no significant degradation products.",
            citations: [
                { id: 3, doc: "Stability_Study_Report.xlsx", page: 1 },
                { id: 4, doc: "Degradation_Analysis.pdf", page: 22 }
            ],
            references: [
                {
                    id: 3,
                    name: "Stability_Study_Report.xlsx",
                    type: "excel",
                    page: 1,
                    date: "2024-01-05",
                    url: "https://sharepoint.example.com/docs/Stability_Study_Report.xlsx"
                },
                {
                    id: 4,
                    name: "Degradation_Analysis.pdf",
                    type: "pdf",
                    page: 22,
                    date: "2023-12-10",
                    url: "https://sharepoint.example.com/docs/Degradation_Analysis. pdf"
                }
            ]
        }
    ];
    
    // Select a random response
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Add bot message
    addBotMessage(response.text, response.citations);
    
    // Update references
    appState.references = response.references;
    updateReferencesPanel();
    
    // Open references panel
    openReferencesPanel();
}

// ============================================
// Utility Functions
// ============================================

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}