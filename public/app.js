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

// Scrapers Functions
async function getScrapers() {
    showLoading('scrapers-loading');
    try {
        const data = await apiCall(`${API_BASE_URL}/api/v1/scrapers`);
        displayResult('scrapers-result', data);
    } catch (error) {
        displayError('scrapers-result', error);
    } finally {
        hideLoading('scrapers-loading');
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

async function getCategories() {
    const scraper = document.getElementById('menu-scraper').value;
    showLoading('menu-loading');
    
    try {
        const data = await apiCall(`${API_BASE_URL}/api/v1/categories/${scraper}`);
        displayResult('menu-result', data);
    } catch (error) {
        displayError('menu-result', error);
    } finally {
        hideLoading('menu-loading');
    }
}

// Search Functions
async function searchMenu() {
    const query = document.getElementById('search-query').value;
    const scraper = document.getElementById('search-scraper').value;
    const category = document.getElementById('search-category').value;
    const maxPrice = document.getElementById('search-price').value;
    const dietary = document.getElementById('search-dietary').value;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (scraper) params.append('scraper', scraper);
    if (category) params.append('category', category);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (dietary) params.append('dietary', dietary);
    
    showLoading('search-loading');
    
    try {
        const data = await apiCall(`${API_BASE_URL}/api/v1/search?${params.toString()}`);
        displayResult('search-result', data);
    } catch (error) {
        displayError('search-result', error);
    } finally {
        hideLoading('search-loading');
    }
}

function clearSearch() {
    document.getElementById('search-query').value = '';
    document.getElementById('search-scraper').value = '';
    document.getElementById('search-category').value = '';
    document.getElementById('search-price').value = '';
    document.getElementById('search-dietary').value = '';
    document.getElementById('search-result').textContent = '';
}

// Scraper Execution Functions
async function runScraper() {
    const scraper = document.getElementById('scraper-select').value;
    showLoading('scraper-loading');
    
    try {
        const data = await apiCall(`${API_BASE_URL}/api/v1/scrapers/${scraper}/scrape`, {
            method: 'POST'
        });
        displayResult('scraper-result', data);
    } catch (error) {
        displayError('scraper-result', error);
    } finally {
        hideLoading('scraper-loading');
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
    
    // Scrapers button
    const getScrapersBtn = document.getElementById('get-scrapers-btn');
    if (getScrapersBtn) {
        getScrapersBtn.addEventListener('click', getScrapers);
    }
    
    // Menu buttons
    const getMenuBtn = document.getElementById('get-menu-btn');
    if (getMenuBtn) {
        getMenuBtn.addEventListener('click', getMenu);
    }
    
    const getCategoriesBtn = document.getElementById('get-categories-btn');
    if (getCategoriesBtn) {
        getCategoriesBtn.addEventListener('click', getCategories);
    }
    
    // Search buttons
    const searchMenuBtn = document.getElementById('search-menu-btn');
    if (searchMenuBtn) {
        searchMenuBtn.addEventListener('click', searchMenu);
    }
    
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    // Run scraper button
    const runScraperBtn = document.getElementById('run-scraper-btn');
    if (runScraperBtn) {
        runScraperBtn.addEventListener('click', runScraper);
    }
    
    // Add Enter key support for search inputs
    const searchInputs = [
        'search-query', 'search-scraper', 'search-category', 
        'search-price', 'search-dietary'
    ];
    
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchMenu();
                }
            });
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 BrightData Scraper API Dashboard loaded');
    
    // Add event listeners for buttons
    setupEventListeners();
    
    // Start health monitoring
    startHealthMonitoring();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to search
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.closest('.api-section')) {
                const section = activeElement.closest('.api-section');
                if (section.querySelector('#search-query')) {
                    searchMenu();
                }
            }
        }
    });
    
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
    
    // Add auto-complete suggestions for search
    const searchInput = document.getElementById('search-query');
    if (searchInput) {
        const suggestions = [
            'pizza', 'pasta', 'burger', 'salad', 'chicken', 'beef', 
            'vegetarian', 'vegan', 'gluten free', 'dessert', 'appetizer'
        ];
        
        searchInput.addEventListener('input', function() {
            // Simple autocomplete could be added here
        });
    }
});

// Export functions for global access
window.checkHealth = checkHealth;
window.getScrapers = getScrapers;
window.getMenu = getMenu;
window.getCategories = getCategories;
window.searchMenu = searchMenu;
window.clearSearch = clearSearch;
window.runScraper = runScraper;
window.copyToClipboard = copyToClipboard;
