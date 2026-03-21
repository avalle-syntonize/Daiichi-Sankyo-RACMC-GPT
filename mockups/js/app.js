/**
 * RACMC-GPT Application
 * Main application logic
 */

// Application State
const appState = {
    selectedProject: null,
    userName: 'Tobias Schmidt', // Can be dynamic from auth
    conversationHistory: [],
    references: [],
    isPanelOpen: false
};

// DOM Elements
let projectSelect, projectInfo, chatInput, sendBtn, exportBtn;
let chatMessages, referencesPanel, referencesContent;
let logoutBtn, inputInfo;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    attachEventListeners();
    initializeUserInfo();
});

function initializeElements() {
    // Sidebar Elements
    projectSelect = document. getElementById('projectSelect');
    projectInfo = document.getElementById('projectInfo');
    exportBtn = document.getElementById('exportBtn');
    
    // Chat Elements
    chatInput = document.getElementById('chatInput');
    sendBtn = document.getElementById('sendBtn');
    chatMessages = document. getElementById('chatMessages');
    inputInfo = document.getElementById('inputInfo');
    
    // References Panel
    referencesPanel = document.getElementById('referencesPanel');
    referencesContent = document.getElementById('referencesContent');
    
    // Header Elements
    logoutBtn = document.getElementById('logoutBtn');
}

function attachEventListeners() {
    // Project Selection
    projectSelect.addEventListener('change', handleProjectChange);
    
    // Chat Input
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', handleInputKeydown);
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Export
    exportBtn.addEventListener('click', handleExport);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Close References Panel
    document.getElementById('closePanelBtn').addEventListener('click', closeReferencesPanel);
}

function initializeUserInfo() {
    document.getElementById('userName').textContent = appState.userName;
}

// ============================================
// Project Selection
// ============================================

function handleProjectChange(event) {
    const selectedValue = event.target.value;
    
    if (selectedValue) {
        appState.selectedProject = selectedValue;
        
        // Update UI
        projectInfo.innerHTML = `
            <p>✅ Project selected: <strong>${getProjectDisplayName(selectedValue)}</strong></p>
        `;
        projectInfo.classList.add('selected');
        
        // Enable chat input
        chatInput.disabled = false;
        sendBtn.disabled = false;
        inputInfo.textContent = `Querying documents from: ${getProjectDisplayName(selectedValue)}`;
        chatInput.placeholder = `Ask about ${getProjectDisplayName(selectedValue)} documents... `;
        chatInput.focus();
        
        // Add system message
        addSystemMessage(`Project "${getProjectDisplayName(selectedValue)}" selected.  You can now query documents.`);
        
    } else {
        appState.selectedProject = null;
        
        // Reset UI
        projectInfo.innerHTML = '<p>⚠️ Please select a project to start querying</p>';
        projectInfo.classList.remove('selected');
        
        // Disable chat input
        chatInput.disabled = true;
        sendBtn.disabled = true;
        inputInfo.textContent = 'Select a project to start querying';
        chatInput.placeholder = 'Ask a question about your regulatory documents...';
    }
}

function getProjectDisplayName(value) {
    const projectNames = {
        'impd-guidelines': 'IMPD Guidelines',
        'project-alpha': 'Project Alpha',
        'project-beta': 'Project Beta',
        'cmc-dossier': 'CMC Dossier',
        'all-projects': 'All Projects'
    };
    return projectNames[value] || value;
}

// ============================================
// Logout
// ============================================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // In a real application, this would clear session/tokens
        alert('Logout successful.  Redirecting to login page...');
        // window.location.href = '/login';
    }
}