// PSGC API Web UI - Main JavaScript
const API_BASE = window.location.origin;

// Debug helper
function debug(message, data = null) {
    console.log(`[PSGC UI] ${message}`, data || '');
}

// Format JSON with syntax highlighting and pretty printing
function formatJSON(obj, indent = 0, maxDepth = 10) {
    if (maxDepth === 0) {
        return '<span class="json-null">...</span>';
    }

    const indentStr = '  '.repeat(indent);
    const nextIndent = indent + 1;

    if (obj === null) {
        return '<span class="json-null">null</span>';
    }

    if (obj === undefined) {
        return '<span class="json-null">undefined</span>';
    }

    if (typeof obj === 'string') {
        return `<span class="json-string">"${escapeHtml(obj)}"</span>`;
    }

    if (typeof obj === 'number') {
        return `<span class="json-number">${obj}</span>`;
    }

    if (typeof obj === 'boolean') {
        return `<span class="json-boolean">${obj}</span>`;
    }

    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return '<span class="json-bracket">[</span><span class="json-bracket">]</span>';
        }

        let html = '<span class="json-bracket">[</span>\n';
        const items = obj.slice(0, 100); // Limit display to first 100 items
        items.forEach((item, index) => {
            html += `${indentStr}  ${formatJSON(item, nextIndent, maxDepth - 1)}`;
            if (index < items.length - 1 || obj.length > 100) {
                html += '<span class="json-comma">,</span>';
            }
            html += '\n';
        });
        if (obj.length > 100) {
            html += `${indentStr}  <span class="json-null">... ${obj.length - 100} more items</span>\n`;
        }
        html += `${indentStr}<span class="json-bracket">]</span>`;
        return html;
    }

    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return '<span class="json-bracket">{</span><span class="json-bracket">}</span>';
        }

        let html = '<span class="json-bracket">{</span>\n';
        keys.forEach((key, index) => {
            const value = obj[key];
            html += `${indentStr}  <span class="json-key">"${escapeHtml(key)}"</span><span class="json-colon">:</span> `;
            html += formatJSON(value, nextIndent, maxDepth - 1);
            if (index < keys.length - 1) {
                html += '<span class="json-comma">,</span>';
            }
            html += '\n';
        });
        html += `${indentStr}<span class="json-bracket">}</span>`;
        return html;
    }

    return escapeHtml(String(obj));
}

// Escape HTML characters
function escapeHtml(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format response with summary information
function formatResponse(data, responseId, includeSummary = true) {
    let html = '';
    
    // Add summary if data has count or data array (unless explicitly disabled)
    if (includeSummary && (data.count !== undefined || (data.data && Array.isArray(data.data)))) {
        const count = data.count !== undefined ? data.count : (data.data ? data.data.length : 0);
        html += `<div style="margin-bottom: 15px; padding: 12px; background: linear-gradient(135deg, rgba(0, 56, 168, 0.1) 0%, rgba(206, 17, 38, 0.1) 100%); border-radius: 8px; border-left: 4px solid #0038A8;">
            <strong style="color: #0038A8; font-size: 1.05em;">📊 Total Records:</strong> <span class="response-count" style="font-size: 1.1em;">${count}</span>
        </div>`;
    }

    // Format the JSON with syntax highlighting
    html += '<pre style="margin: 0;">';
    html += formatJSON(data);
    html += '</pre>';

    return html;
}

// Load statistics on page load
async function loadStats() {
    debug('Loading statistics...');
    try {
        const [regions, provinces, cities, municipalities, barangays] = await Promise.all([
            fetch(`${API_BASE}/api/v1/regions`).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                return r.json();
            }).catch(e => {
                debug('Error fetching regions:', e);
                return { count: 0 };
            }),
            fetch(`${API_BASE}/api/v1/provinces`).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                return r.json();
            }).catch(e => {
                debug('Error fetching provinces:', e);
                return { count: 0 };
            }),
            fetch(`${API_BASE}/api/v1/cities`).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                return r.json();
            }).catch(e => {
                debug('Error fetching cities:', e);
                return { count: 0 };
            }),
            fetch(`${API_BASE}/api/v1/municipalities`).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                return r.json();
            }).catch(e => {
                debug('Error fetching municipalities:', e);
                return { count: 0 };
            }),
            fetch(`${API_BASE}/api/v1/barangays?limit=10000`).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                return r.json();
            }).catch(e => {
                debug('Error fetching barangays:', e);
                return { count: 0, total: 0 };
            })
        ]);

        document.getElementById('regions-count').textContent = regions.count || 0;
        document.getElementById('provinces-count').textContent = provinces.count || 0;
        document.getElementById('cities-count').textContent = cities.count || 0;
        document.getElementById('municipalities-count').textContent = municipalities.count || 0;
        // Use total count if available, otherwise fall back to count
        document.getElementById('barangays-count').textContent = barangays.total || barangays.count || 0;
        debug('Statistics loaded successfully');
    } catch (error) {
        console.error('Error loading stats:', error);
        // Show error in UI
        document.getElementById('regions-count').textContent = '?';
        document.getElementById('provinces-count').textContent = '?';
        document.getElementById('cities-count').textContent = '?';
        document.getElementById('municipalities-count').textContent = '?';
        document.getElementById('barangays-count').textContent = '?';
    }
}

// Test endpoint - enhanced version
async function testEndpoint(url, responseId, btnElement = null) {
    debug(`Testing endpoint: ${url}`, { responseId, btnElement });
    
    const responseEl = document.getElementById(responseId);
    if (!responseEl) {
        console.error(`Response element not found: ${responseId}`);
        alert(`Error: Could not find response element ${responseId}`);
        return;
    }

    const btn = btnElement;
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Loading...';
    }
    
    // Clear previous response
    responseEl.classList.remove('show');
    responseEl.innerHTML = '<div style="padding: 20px; text-align: center;"><span class="loading"></span> Fetching data...</div>';
    responseEl.classList.add('show');

    const fullUrl = `${API_BASE}${url}`;
    debug(`Fetching from: ${fullUrl}`);

    try {
        const startTime = Date.now();
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        debug(`Response received:`, { 
            status: response.status, 
            statusText: response.statusText,
            time: responseTime + 'ms'
        });
        
        let data;
        let errorMessage = null;
        
        try {
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                const text = await response.text();
                debug('Parsing JSON response...');
                data = JSON.parse(text);
            } else {
                const text = await response.text();
                debug('Non-JSON response received');
                data = { 
                    raw: text.substring(0, 1000), 
                    contentType: contentType,
                    note: 'Response is not JSON. Showing raw text (truncated).'
                };
            }
        } catch (parseError) {
            debug('Error parsing response:', parseError);
            errorMessage = `Failed to parse response: ${parseError.message}`;
            const text = await response.text().catch(() => 'Could not read response body');
            data = { 
                error: errorMessage,
                rawResponse: text.substring(0, 500),
                parseError: parseError.message
            };
        }

        // Format JSON with syntax highlighting
        const formattedJson = formatResponse(data, responseId);

        const statusClass = response.ok ? 'success' : 'error';
        const statusBadge = response.ok 
            ? `<span class="response-code ${statusClass}">${response.status} ${response.statusText}</span>`
            : `<span class="response-code ${statusClass}">${response.status} ${response.statusText}</span>`;

        const responseHtml = `
            <div class="response-header">
                <span class="response-title">Response</span>
                ${statusBadge}
                <span style="color: #666; font-size: 0.85em;">(${responseTime}ms)</span>
                <button class="copy-btn" data-copy-target="${responseId}-data">Copy</button>
            </div>
            <div class="response-body" id="${responseId}-data">${formattedJson}</div>
        `;

                responseEl.innerHTML = responseHtml;
                
                // Attach copy button event listener
                const copyBtn = responseEl.querySelector('.copy-btn[data-copy-target]');
                if (copyBtn) {
                    copyBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('data-copy-target');
                        copyToClipboard(targetId, this);
                    });
                }
        
    } catch (error) {
        debug('Fetch error:', error);
        const errorHtml = `
            <div class="response-header">
                <span class="response-title">Network Error</span>
                <span class="response-code error">Error</span>
            </div>
            <div class="response-body">
Error: ${error.message || 'Unknown error occurred'}

URL: ${fullUrl}

Possible issues:
- Server is not running
- CORS issue
- Network connectivity problem
- Invalid URL

Check the browser console (F12) for more details.
            </div>
        `;
        responseEl.innerHTML = errorHtml;
        responseEl.classList.add('show');
        console.error('API Error Details:', {
            error,
            url: fullUrl,
            message: error.message,
            stack: error.stack
        });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Test';
        }
    }
}

// Test region by code
function testRegionByCode(btnElement = null) {
    const codeInput = document.getElementById('region-code');
    if (!codeInput) {
        console.error('Region code input not found');
        return;
    }
    const code = codeInput.value.trim();
    if (!code) {
        alert('Please enter a region code');
        return;
    }
    const btn = btnElement;
    debug('Testing region by code:', code);
    testEndpoint(`/api/v1/regions/${encodeURIComponent(code)}`, 'region-detail', btn);
}

// Test search - enhanced version
async function testSearch(btnElement = null) {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }
    
    const query = searchInput.value.trim();
    if (!query) {
        alert('Please enter a search query');
        searchInput.focus();
        return;
    }

    debug('Performing search:', query);

    const responseEl = document.getElementById('search-response');
    if (!responseEl) {
        console.error('Search response element not found');
        return;
    }

    const btn = btnElement;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Searching...';
    }

    responseEl.classList.remove('show');
    responseEl.innerHTML = '<div style="padding: 20px; text-align: center;"><span class="loading"></span> Searching...</div>';
    responseEl.classList.add('show');

    const searchUrl = `${API_BASE}/api/v1/search?q=${encodeURIComponent(query)}`;
    debug('Search URL:', searchUrl);

    try {
        const startTime = Date.now();
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        let data;
        try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const text = await response.text();
                data = JSON.parse(text);
            } else {
                const text = await response.text();
                data = { raw: text, error: 'Response is not JSON' };
            }
        } catch (parseError) {
            const text = await response.text().catch(() => 'Could not read response');
            data = {
                error: `Parse error: ${parseError.message}`,
                rawResponse: text.substring(0, 500)
            };
        }

                // Format JSON with syntax highlighting and add search summary
                let formattedJson = '';
                
                // Add search summary first if available
                if (data.counts) {
                    const counts = data.counts;
                    formattedJson += `
                        <div style="margin-bottom: 15px; padding: 15px; background: linear-gradient(135deg, rgba(0, 56, 168, 0.1) 0%, rgba(206, 17, 38, 0.1) 100%); border-radius: 8px; border-left: 4px solid #0038A8;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 10px;">
                                ${counts.regions > 0 ? `<div><strong style="color: #0038A8;">Regions:</strong> <span class="response-count">${counts.regions}</span></div>` : ''}
                                ${counts.provinces > 0 ? `<div><strong style="color: #0038A8;">Provinces:</strong> <span class="response-count">${counts.provinces}</span></div>` : ''}
                                ${counts.cities > 0 ? `<div><strong style="color: #0038A8;">Cities:</strong> <span class="response-count">${counts.cities}</span></div>` : ''}
                                ${counts.municipalities > 0 ? `<div><strong style="color: #0038A8;">Municipalities:</strong> <span class="response-count">${counts.municipalities}</span></div>` : ''}
                                ${counts.barangays > 0 ? `<div><strong style="color: #0038A8;">Barangays:</strong> <span class="response-count">${counts.barangays}</span></div>` : ''}
                            </div>
                            <div><strong style="color: #0038A8;">Total Results:</strong> <span class="response-count" style="font-size: 1.1em;">${counts.total}</span></div>
                        </div>
                    `;
                }

                // Format the JSON data (without summary since we added it above)
                formattedJson += formatResponse(data, 'search-data', false);

                const responseHtml = `
                    <div class="response-header">
                        <span class="response-title">Search Results for "${query}"</span>
                        <span class="response-code ${response.ok ? 'success' : 'error'}">
                            ${response.status} ${response.statusText}
                        </span>
                        <span style="color: #666; font-size: 0.85em;">(${responseTime}ms)</span>
                        <button class="copy-btn" data-copy-target="search-data">Copy</button>
                    </div>
                    <div class="response-body" id="search-data">${formattedJson}</div>
                `;

                responseEl.innerHTML = responseHtml;
                
                // Attach copy button event listener
                const copyBtn = responseEl.querySelector('.copy-btn[data-copy-target]');
                if (copyBtn) {
                    copyBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('data-copy-target');
                        copyToClipboard(targetId, this);
                    });
                }
    } catch (error) {
        debug('Search error:', error);
        const errorHtml = `
            <div class="response-header">
                <span class="response-title">Search Error</span>
                <span class="response-code error">Error</span>
            </div>
            <div class="response-body">
Error: ${error.message || 'Unknown error occurred'}

URL: ${searchUrl}

Check the browser console (F12) for more details.
            </div>
        `;
        responseEl.innerHTML = errorHtml;
        console.error('Search Error Details:', error);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Search';
        }
    }
}

// Copy to clipboard
function copyToClipboard(elementId, buttonElement = null) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element not found: ${elementId}`);
        alert('Error: Could not find element to copy');
        return;
    }
    
    // Get raw JSON text (without HTML formatting)
    let text;
    if (element.querySelector('pre')) {
        // Extract the actual JSON by parsing the formatted HTML
        const pre = element.querySelector('pre');
        text = pre.textContent || pre.innerText;
    } else {
        text = element.textContent || element.innerText;
    }
    
    // Clean up the text (remove extra whitespace from formatting)
    text = text.replace(/\n\s*\n/g, '\n').trim();
    
    if (!text) {
        alert('Nothing to copy');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            // Show temporary success message
            if (buttonElement) {
                const originalText = buttonElement.textContent;
                buttonElement.textContent = 'Copied!';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                }, 2000);
            } else {
                alert('Copied to clipboard!');
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            fallbackCopyToClipboard(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert('Copied to clipboard!');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Failed to copy. Please select and copy manually.');
    }
    document.body.removeChild(textArea);
}

// Check API connection status
async function checkConnection() {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (!indicator || !statusText) return;

    try {
        const response = await fetch(`${API_BASE}/api/health`, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            indicator.className = 'status-indicator online';
            statusText.textContent = 'API Online';
        } else {
            indicator.className = 'status-indicator offline';
            statusText.textContent = 'API Error';
        }
    } catch (error) {
        indicator.className = 'status-indicator offline';
        statusText.textContent = 'API Offline';
        debug('Connection check failed:', error);
    }
}

// Initialize on page load
function initialize() {
    debug('Initializing PSGC UI...');
    
    // Check connection first
    checkConnection();
    
    // Load statistics
    loadStats();
    
    // Check connection every 30 seconds
    setInterval(checkConnection, 30000);
    
    // Attach event listeners to all test buttons
    document.querySelectorAll('.test-btn[data-endpoint]').forEach(btn => {
        const url = btn.getAttribute('data-endpoint');
        const responseId = btn.getAttribute('data-response-id');
        btn.addEventListener('click', () => {
            testEndpoint(url, responseId, btn);
        });
    });
    
    // Attach event listener to region code test button
    const regionCodeBtn = document.getElementById('test-region-code-btn');
    if (regionCodeBtn) {
        regionCodeBtn.addEventListener('click', () => {
            testRegionByCode(regionCodeBtn);
        });
    }
    
    // Attach event listener to search button
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            testSearch(searchBtn);
        });
    }
    
    // Search on Enter key
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                testSearch(searchBtn);
            }
        });
    }
    
    debug('Initialization complete');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM is already loaded
    initialize();
}

