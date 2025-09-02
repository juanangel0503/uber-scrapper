// BrightData Scraper API Dashboard JavaScript

const API_BASE_URL = window.location.origin;

// Utility function to format JSON for display
function formatJSON(data) {
    return JSON.stringify(data, null, 2);
}

// Utility function to show loading state
function showLoading(elementId) {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.classList.add('active');
    }
}

// Utility function to hide loading state
function hideLoading(elementId) {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.classList.remove('active');
    }
}

// Utility function to display results
function displayResult(elementId, data) {
    const resultElement = document.getElementById(elementId);
    if (resultElement) {
        resultElement.textContent = formatJSON(data);
    }
}

// Utility function to display error
function displayError(elementId, error) {
    const resultElement = document.getElementById(elementId);
    if (resultElement) {
        resultElement.textContent = formatJSON({
            error: true,
            message: error.message || 'An error occurred',
            timestamp: new Date().toISOString()
        });
    }
}

// API call wrapper with error handling
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Health Check Functions
async function checkHealth() {
    try {
        const response = await apiCall(`${API_BASE_URL}/health`);
        
        // Update health status indicator
        const healthStatus = document.getElementById('health-status');
        const uptimeInfo = document.getElementById('uptime-info');
        
        if (healthStatus) {
            healthStatus.innerHTML = `
                <span class="status-indicator status-online"></span>
                <span>Online - ${response.status}</span>
            `;
        }
        
        if (uptimeInfo) {
            const uptime = Math.round(response.uptime);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            uptimeInfo.textContent = `Uptime: ${hours}h ${minutes}m ${seconds}s`;
        }
        
        return response;
    } catch (error) {
        const healthStatus = document.getElementById('health-status');
        if (healthStatus) {
            healthStatus.innerHTML = `
                <span class="status-indicator status-offline"></span>
                <span>Offline - ${error.message}</span>
            `;
        }
        throw error;
    }
}


// Menu Functions
async function getMenu() {
    const scraper = document.getElementById('menu-scraper').value;
    showLoading('menu-loading');
    
    try {
        const data = await apiCall(`${API_BASE_URL}/api/v1/scrapers/${scraper}/menu`);
        displayResult('menu-result', data);
    } catch (error) {
        displayError('menu-result', error);
    } finally {
        hideLoading('menu-loading');
    }
}

// Scraper Execution Functions
async function runScraper() {
    const scraper = document.getElementById("scraper-select").value;
    const url = document.getElementById("scraper-url").value.trim();
    showLoading("scraper-loading");
    
    try {
        const requestBody = url ? { url } : {};
        const data = await apiCall(`${API_BASE_URL}/api/v1/scrapers/${scraper}/scrape`, {
            method: "POST",
            body: JSON.stringify(requestBody)
        });
        displayResult("scraper-result", data);
    } catch (error) {
        displayError("scraper-result", error);
    } finally {
        hideLoading("scraper-loading");
    }
}

// Copy JSON function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (element && element.textContent) {
        navigator.clipboard.writeText(element.textContent).then(() => {
            // Show temporary success message
            const originalText = element.textContent;
            element.textContent = 'Copied to clipboard!';
            setTimeout(() => {
                element.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }
}

// Auto-refresh health status
function startHealthMonitoring() {
    checkHealth(); // Initial check
    setInterval(checkHealth, 30000); // Check every 30 seconds
}

// Setup event listeners for all buttons
function setupEventListeners() {
    // Health check button
    const checkHealthBtn = document.getElementById('check-health-btn');
    if (checkHealthBtn) {
        checkHealthBtn.addEventListener('click', checkHealth);
    }
    
    
    // Menu buttons
    const getMenuBtn = document.getElementById('get-menu-btn');
    if (getMenuBtn) {
        getMenuBtn.addEventListener('click', getMenu);
    }
    
    // Run scraper button
    const runScraperBtn = document.getElementById('run-scraper-btn');
    if (runScraperBtn) {
        runScraperBtn.addEventListener('click', runScraper);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 BrightData Scraper API Dashboard loaded');
    
    // Add event listeners for buttons
    setupEventListeners();
    
    // Start health monitoring
    startHealthMonitoring();
    
    // Add click-to-copy functionality to JSON displays
    document.querySelectorAll('.json-display').forEach(element => {
        element.addEventListener('click', function() {
            if (this.textContent && !this.textContent.includes('Click a button')) {
                copyToClipboard(this.id);
            }
        });
        
        // Add hover effect
        element.style.cursor = 'pointer';
        element.title = 'Click to copy JSON to clipboard';
    });
});

// Export functions for global access
window.checkHealth = checkHealth;

window.getMenu = getMenu;
window.runScraper = runScraper;
window.copyToClipboard = copyToClipboard;
