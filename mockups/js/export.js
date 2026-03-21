/**
 * Export conversation functionality
 */

function handleExport() {
    if (appState.conversationHistory.length === 0) {
        alert('No conversation to export');
        return;
    }
    
    const exportText = generateExportText();
    downloadTextFile(exportText, generateFileName());
}

function generateExportText() {
    let text = '';
    
    // Header
    text += '================================================\n';
    text += 'RACMC-GPT CONVERSATION EXPORT\n';
    text += '================================================\n\n';
    
    text += `User: ${appState.userName}\n`;
    text += `Project: ${getProjectDisplayName(appState.selectedProject)}\n`;
    text += `Export Date: ${new Date().toLocaleString()}\n`;
    text += `Total Messages: ${appState.conversationHistory.length}\n\n`;
    
    text += '================================================\n';
    text += 'CONVERSATION\n';
    text += '================================================\n\n';
    
    // Messages
    appState.conversationHistory.forEach((message, index) => {
        const speaker = message.type === 'user' ? 'USER' : 'RACMC-GPT';
        const timestamp = message.timestamp.toLocaleString();
        
        text += `[${index + 1}] ${speaker} - ${timestamp}\n`;
        text += `${'-'.repeat(50)}\n`;
        text += `${message.text}\n`;
        
        // Add citations if present
        if (message.citations && message.citations.length > 0) {
            text += `\nReferences:\n`;
            message.citations.forEach(citation => {
                text += `  - [${citation.doc}, page ${citation.page}]\n`;
            });
        }
        
        text += '\n\n';
    });
    
    // Footer
    text += '================================================\n';
    text += 'END OF CONVERSATION\n';
    text += '================================================\n\n';
    
    text += 'IMPORTANT NOTICE:\n';
    text += 'This conversation export is for record-keeping purposes only.\n';
    text += 'Conversations are not stored in the system for privacy reasons.\n';
    text += 'Always verify information with original source documents.\n';
    
    return text;
}

function generateFileName() {
    const date = new Date().toISOString().split('T')[0];
    const project = appState.selectedProject || 'unknown';
    return `RACMC-GPT_${project}_${date}.txt`;
}

function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showExportSuccessMessage(filename);
}

function showExportSuccessMessage(filename) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'export-success-toast';
    messageDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>Conversation exported:  ${filename}</span>
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add toast styles dynamically
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    .export-success-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform:  translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        background-color: #28A745;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 1000;
        animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform:  translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
`;
document.head.appendChild(toastStyle);

// ============================================
// References Panel
// ============================================

function updateReferencesPanel() {
    if (appState.references.length === 0) {
        referencesContent.innerHTML = '<p class="references-empty">No references available. </p>';
        return;
    }
    
    referencesContent.innerHTML = '';
    
    appState.references. forEach(ref => {
        const card = createReferenceCard(ref);
        referencesContent.appendChild(card);
    });
}

function createReferenceCard(ref) {
    const card = document. createElement('div');
    card.className = 'reference-card';
    card.dataset.refId = ref.id;
    
    const iconSrc = getDocumentIcon(ref.type);
    
    card.innerHTML = `
        <div class="reference-header">
            <img src="${iconSrc}" alt="${ref.type}" class="doc-icon">
            <div class="reference-title">
                <div class="doc-name">${ref.name}</div>
                <div class="doc-meta">
                    <span class="doc-page">📄 Page ${ref.page}</span>
                    <span class="doc-date">📅 ${formatDate(ref.date)}</span>
                </div>
            </div>
        </div>
        <div class="reference-actions">
            <button class="btn-sharepoint" onclick="openInSharePoint('${ref.url}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Open in SharePoint
            </button>
        </div>
    `;
    
    return card;
}

function getDocumentIcon(type) {
    const icons = {
        'pdf': 'images/icon-pdf.svg',
        'excel': 'images/icon-excel.svg',
        'pptx': 'images/icon-pptx.svg'
    };
    return icons[type] || 'images/icon-pdf.svg';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showReference(refId) {
    openReferencesPanel();
    
    // Highlight the reference card
    const card = document.querySelector(`[data-ref-id="${refId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.animation = 'highlightCard 1s ease';
    }
}

function openReferencesPanel() {
    referencesPanel.classList.add('open');
    document.querySelector('.main-container').classList.add('with-references');
    appState.isPanelOpen = true;
}

function closeReferencesPanel() {
    referencesPanel. classList.remove('open');
    document.querySelector('.main-container').classList.remove('with-references');
    appState.isPanelOpen = false;
}

function openInSharePoint(url) {
    window.open(url, '_blank');
}

// Add highlight animation
const highlightStyle = document.createElement('style');
highlightStyle.textContent = `
    @keyframes highlightCard {
        0%, 100% {
            transform: scale(1);
            background-color: var(--color-bg-light);
        }
        50% {
            transform: scale(1.02);
            background-color: #E3F2FD;
        }
    }
`;
document.head.appendChild(highlightStyle);