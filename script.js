class ProxyChecker {
    constructor() {
        this.proxies = [];
        this.isChecking = false;
        this.workers = [];
        this.checkedCount = 0;
        this.workingCount = 0;
        this.failedCount = 0;
        this.checkingCount = 0;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.checkBtn = document.getElementById('check-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.exportFormat = document.getElementById('export-format');
        this.proxyType = document.getElementById('proxy-type');
        this.threadCount = document.getElementById('thread-count');
        this.timeout = document.getElementById('timeout');
        this.resultsTable = document.getElementById('results-table');
        this.resultsTbody = document.getElementById('results-tbody');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.loadingOverlay = document.getElementById('loading-overlay');
        
        // Stats elements
        this.totalCount = document.getElementById('total-count');
        this.workingCountEl = document.getElementById('working-count');
        this.failedCountEl = document.getElementById('failed-count');
        this.checkingCountEl = document.getElementById('checking-count');
    }

    setupEventListeners() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Control buttons
        this.checkBtn.addEventListener('click', this.startChecking.bind(this));
        this.stopBtn.addEventListener('click', this.stopChecking.bind(this));
        this.exportBtn.addEventListener('click', this.exportWorkingProxies.bind(this));
        
        // Proxy type change
        this.proxyType.addEventListener('change', this.handleProxyTypeChange.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleProxyTypeChange() {
        // Update all existing proxies to the new type
        const newType = this.proxyType.value;
        this.proxies.forEach(proxy => {
            proxy.type = newType;
        });
        
        // Update the display
        this.displayProxies();
    }

    async processFile(file) {
        if (!file.name.endsWith('.txt')) {
            alert('Please select a .txt file');
            return;
        }

        this.showLoading(true);
        
        try {
            const text = await this.readFile(file);
            this.parseProxies(text);
            this.displayProxies();
            this.updateStats();
            this.checkBtn.disabled = false;
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error reading file. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseProxies(text) {
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')); // Filter out empty lines and comments
        
        this.proxies = [];
        const selectedType = this.proxyType.value;

        lines.forEach((line, index) => {
            const proxy = this.parseProxyLine(line, selectedType);
            if (proxy) {
                proxy.id = index;
                proxy.status = 'pending';
                proxy.responseTime = null;
                proxy.country = 'Unknown';
                proxy.lastChecked = null;
                this.proxies.push(proxy);
            }
        });
    }

    parseProxyLine(line, selectedType = 'auto') {
        // Remove any protocol prefix for parsing
        const cleanLine = line.replace(/^(https?|socks[45]?):\/\//, '');
        
        // Try different formats
        const formats = [
            // IP:PORT:USER:PASS
            /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5}):([^:]+):(.+)$/,
            // IP:PORT
            /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})$/,
            // USER:PASS@IP:PORT
            /^([^:@]+):([^@]+)@(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})$/
        ];

        for (const format of formats) {
            const match = cleanLine.match(format);
            if (match) {
                let proxyType;
                if (selectedType === 'auto') {
                    proxyType = this.detectProxyType(line);
                } else {
                    proxyType = selectedType;
                }

                if (format === formats[0]) {
                    // IP:PORT:USER:PASS
                    return {
                        ip: match[1],
                        port: parseInt(match[2]),
                        username: match[3],
                        password: match[4],
                        original: line,
                        type: proxyType
                    };
                } else if (format === formats[1]) {
                    // IP:PORT
                    return {
                        ip: match[1],
                        port: parseInt(match[2]),
                        username: null,
                        password: null,
                        original: line,
                        type: proxyType
                    };
                } else if (format === formats[2]) {
                    // USER:PASS@IP:PORT
                    return {
                        ip: match[3],
                        port: parseInt(match[4]),
                        username: match[1],
                        password: match[2],
                        original: line,
                        type: proxyType
                    };
                }
            }
        }

        return null;
    }

    detectProxyType(line) {
        const lower = line.toLowerCase();
        if (lower.startsWith('https://')) return 'HTTPS';
        if (lower.startsWith('http://')) return 'HTTP';
        if (lower.startsWith('socks5://')) return 'SOCKS5';
        if (lower.startsWith('socks4://')) return 'SOCKS4';
        if (lower.startsWith('socks://')) return 'SOCKS5';
        return 'HTTP'; // Default assumption
    }

    displayProxies() {
        this.resultsTbody.innerHTML = '';
        
        this.proxies.forEach(proxy => {
            const row = this.createProxyRow(proxy);
            this.resultsTbody.appendChild(row);
        });
    }

    createProxyRow(proxy) {
        const row = document.createElement('tr');
        row.id = `proxy-${proxy.id}`;
        
        row.innerHTML = `
            <td><span class="status-badge status-${proxy.status}">${proxy.status}</span></td>
            <td class="proxy-text">${proxy.original}</td>
            <td><span class="type-badge type-${proxy.type.toLowerCase()}">${proxy.type}</span></td>
            <td>${proxy.country}</td>
            <td>${proxy.responseTime ? proxy.responseTime + 'ms' : '-'}</td>
            <td>${proxy.lastChecked ? new Date(proxy.lastChecked).toLocaleTimeString() : '-'}</td>
        `;
        
        return row;
    }

    updateProxyRow(proxy) {
        const row = document.getElementById(`proxy-${proxy.id}`);
        if (row) {
            row.innerHTML = `
                <td><span class="status-badge status-${proxy.status}">${proxy.status}</span></td>
                <td class="proxy-text">${proxy.original}</td>
                <td><span class="type-badge type-${proxy.type.toLowerCase()}">${proxy.type}</span></td>
                <td>${proxy.country}</td>
                <td>${proxy.responseTime ? proxy.responseTime + 'ms' : '-'}</td>
                <td>${proxy.lastChecked ? new Date(proxy.lastChecked).toLocaleTimeString() : '-'}</td>
            `;
        }
    }

    async startChecking() {
        if (this.proxies.length === 0) {
            alert('Please upload a proxy list first');
            return;
        }

        this.isChecking = true;
        this.checkedCount = 0;
        this.workingCount = 0;
        this.failedCount = 0;
        this.checkingCount = 0;

        this.checkBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.exportBtn.disabled = true;

        const maxThreads = parseInt(this.threadCount.value);
        const timeoutMs = parseInt(this.timeout.value) * 1000;

        // Reset all proxies to pending and update their type
        const selectedType = this.proxyType.value;
        this.proxies.forEach(proxy => {
            proxy.status = 'pending';
            proxy.responseTime = null;
            proxy.lastChecked = null;
            proxy.type = selectedType; // Update proxy type based on current selection
            this.updateProxyRow(proxy);
        });

        this.updateStats();
        this.updateProgress();

        // Create worker pool
        this.workers = [];
        const proxyQueue = [...this.proxies];
        
        for (let i = 0; i < maxThreads && proxyQueue.length > 0; i++) {
            this.createWorker(proxyQueue, timeoutMs);
        }
    }

    async createWorker(proxyQueue, timeoutMs) {
        while (proxyQueue.length > 0 && this.isChecking) {
            const proxy = proxyQueue.shift();
            if (!proxy) break;

            proxy.status = 'checking';
            this.checkingCount++;
            this.updateProxyRow(proxy);
            this.updateStats();

            try {
                const result = await this.checkProxy(proxy, timeoutMs);
                
                if (this.isChecking) {
                    proxy.status = result.working ? 'working' : 'failed';
                    proxy.responseTime = result.responseTime;
                    proxy.lastChecked = Date.now();
                    proxy.country = result.country || 'Unknown';
                    proxy.ip_info = result.ip_info || {};
                    
                    if (result.working) {
                        this.workingCount++;
                    } else {
                        this.failedCount++;
                    }
                    
                    this.checkingCount--;
                    this.checkedCount++;
                    
                    this.updateProxyRow(proxy);
                    this.updateStats();
                    this.updateProgress();
                }
            } catch (error) {
                if (this.isChecking) {
                    proxy.status = 'failed';
                    proxy.lastChecked = Date.now();
                    this.failedCount++;
                    this.checkingCount--;
                    this.checkedCount++;
                    
                    this.updateProxyRow(proxy);
                    this.updateStats();
                    this.updateProgress();
                }
            }
        }

        // Check if all workers are done
        if (this.checkedCount >= this.proxies.length) {
            this.finishChecking();
        }
    }

    async checkProxy(proxy, timeoutMs) {
        try {
            const response = await fetch('/api/check-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    proxy: {
                        ip: proxy.ip,
                        port: proxy.port,
                        username: proxy.username,
                        password: proxy.password,
                        type: proxy.type
                    },
                    timeout: timeoutMs / 1000
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            return {
                working: result.working,
                responseTime: result.responseTime,
                country: result.country || 'Unknown',
                ip_info: result.ip_info || {}
            };
        } catch (error) {
            console.error('Proxy check error:', error);
            return {
                working: false,
                responseTime: timeoutMs,
                country: 'Unknown'
            };
        }
    }

    stopChecking() {
        this.isChecking = false;
        this.finishChecking();
    }

    finishChecking() {
        this.isChecking = false;
        this.checkBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.exportBtn.disabled = this.workingCount === 0;
        
        // Update any remaining checking proxies to failed
        this.proxies.forEach(proxy => {
            if (proxy.status === 'checking') {
                proxy.status = 'failed';
                this.updateProxyRow(proxy);
            }
        });
        
        this.checkingCount = 0;
        this.updateStats();
        this.updateProgress();
    }

    exportWorkingProxies() {
        const workingProxies = this.proxies.filter(proxy => proxy.status === 'working');
        
        if (workingProxies.length === 0) {
            alert('No working proxies to export');
            return;
        }

        const format = this.exportFormat.value;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        let content, filename, fileType = 'text/plain';

        switch (format) {
            case 'enhanced':
                content = this.generateEnhancedExport(workingProxies);
                filename = `working_proxies_enhanced_${timestamp}.txt`;
                break;
                
            case 'detailed':
                content = this.generateDetailedExport(workingProxies);
                filename = `working_proxies_detailed_${timestamp}.txt`;
                break;
            
            case 'simple':
                content = this.generateSimpleExport(workingProxies);
                filename = `working_proxies_simple_${timestamp}.txt`;
                break;
            
            case 'original':
                content = this.generateOriginalExport(workingProxies);
                filename = `working_proxies_original_${timestamp}.txt`;
                break;
            
            case 'csv':
                content = this.generateCSVExport(workingProxies);
                filename = `working_proxies_${timestamp}.csv`;
                fileType = 'text/csv';
                break;
            
            default:
                content = this.generateEnhancedExport(workingProxies);
                filename = `working_proxies_enhanced_${timestamp}.txt`;
        }

        const blob = new Blob([content], { type: fileType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        const formatNames = {
            'enhanced': 'Enhanced Info (with IP details)',
            'detailed': 'Detailed Information',
            'simple': 'IP:PORT Only',
            'original': 'Original Format',
            'csv': 'CSV Format'
        };
        
        alert(`✅ Exported ${workingProxies.length} working proxies in ${formatNames[format]} format!`);
    }

    generateEnhancedExport(proxies) {
        const header = '# Working Proxies Export - Enhanced Format with IP Details\n' +
                      '# Generated: ' + new Date().toLocaleString() + '\n' +
                      '# Format: Each proxy includes detailed geolocation and ISP information\n\n';
        
        const content = proxies.map(proxy => {
            const ipPort = `${proxy.ip}:${proxy.port}`;
            const type = proxy.type || 'Unknown';
            const responseTime = proxy.responseTime ? `${proxy.responseTime}ms` : 'N/A';
            const lastChecked = proxy.lastChecked ? new Date(proxy.lastChecked).toLocaleString() : 'N/A';
            
            let authInfo = '';
            if (proxy.username && proxy.password) {
                authInfo = `\n  Authentication: ${proxy.username}:${proxy.password}`;
            }
            
            const ipInfo = proxy.ip_info || {};
            
            return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 PROXY: ${ipPort}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📍 Location: ${ipInfo.city || 'Unknown'}, ${ipInfo.region || 'Unknown'}, ${ipInfo.country || 'Unknown'} (${ipInfo.country_code || 'Unknown'})
  🏢 ISP/Organization: ${ipInfo.isp || 'Unknown'}
  🏗️  AS Number: ${ipInfo.as || 'Unknown'}
  🌍 Coordinates: ${ipInfo.lat || 'Unknown'}, ${ipInfo.lon || 'Unknown'}
  🕐 Timezone: ${ipInfo.timezone || 'Unknown'}
  📮 Postal Code: ${ipInfo.zip || 'Unknown'}
  🔧 Proxy Type: ${type}
  ⚡ Response Time: ${responseTime}
  📱 Mobile: ${ipInfo.mobile ? 'Yes' : 'No'}
  🛡️  Hosting/VPN: ${ipInfo.hosting ? 'Yes' : 'No'}
  🔍 Proxy Detection: ${ipInfo.proxy ? 'Detected' : 'Not Detected'}
  🕒 Last Checked: ${lastChecked}${authInfo}
  📝 Original Format: ${proxy.original}

`;
        }).join('');
        
        return header + content;
    }

    generateDetailedExport(proxies) {
        const header = '# Working Proxies Export - Detailed Format\n' +
                      '# Format: IP:PORT | Type | Country | Response Time | Last Checked | Auth (if available)\n' +
                      '# Generated: ' + new Date().toLocaleString() + '\n\n';
        
        const content = proxies.map(proxy => {
            const ipPort = `${proxy.ip}:${proxy.port}`;
            const type = proxy.type || 'Unknown';
            const country = proxy.country || 'Unknown';
            const responseTime = proxy.responseTime ? `${proxy.responseTime}ms` : 'N/A';
            const lastChecked = proxy.lastChecked ? new Date(proxy.lastChecked).toLocaleString() : 'N/A';
            
            let authInfo = '';
            if (proxy.username && proxy.password) {
                authInfo = ` | Auth: ${proxy.username}:${proxy.password}`;
            }
            
            return `${ipPort} | ${type} | ${country} | ${responseTime} | ${lastChecked}${authInfo}`;
        }).join('\n');
        
        return header + content;
    }

    generateSimpleExport(proxies) {
        const header = '# Working Proxies Export - Simple Format (IP:PORT)\n' +
                      '# Generated: ' + new Date().toLocaleString() + '\n\n';
        
        const content = proxies.map(proxy => `${proxy.ip}:${proxy.port}`).join('\n');
        return header + content;
    }

    generateOriginalExport(proxies) {
        const header = '# Working Proxies Export - Original Format\n' +
                      '# Generated: ' + new Date().toLocaleString() + '\n\n';
        
        const content = proxies.map(proxy => proxy.original).join('\n');
        return header + content;
    }

    generateCSVExport(proxies) {
        const header = 'IP,Port,Type,Country,Country_Code,Region,City,Postal_Code,Latitude,Longitude,Timezone,ISP,Organization,AS_Number,AS_Name,Mobile,Hosting,Proxy_Detected,Response_Time_ms,Last_Checked,Username,Password,Original_Format\n';
        
        const content = proxies.map(proxy => {
            const ip = proxy.ip || '';
            const port = proxy.port || '';
            const type = proxy.type || 'Unknown';
            const ipInfo = proxy.ip_info || {};
            
            // Clean data for CSV (replace commas and quotes)
            const cleanData = (str) => String(str || '').replace(/[",]/g, ';');
            
            const country = cleanData(ipInfo.country || proxy.country || 'Unknown');
            const countryCode = cleanData(ipInfo.country_code || 'Unknown');
            const region = cleanData(ipInfo.region || 'Unknown');
            const city = cleanData(ipInfo.city || 'Unknown');
            const postalCode = cleanData(ipInfo.zip || 'Unknown');
            const latitude = cleanData(ipInfo.lat || 'Unknown');
            const longitude = cleanData(ipInfo.lon || 'Unknown');
            const timezone = cleanData(ipInfo.timezone || 'Unknown');
            const isp = cleanData(ipInfo.isp || 'Unknown');
            const org = cleanData(ipInfo.org || 'Unknown');
            const asNumber = cleanData(ipInfo.as || 'Unknown');
            const asName = cleanData(ipInfo.asname || 'Unknown');
            const mobile = ipInfo.mobile ? 'Yes' : 'No';
            const hosting = ipInfo.hosting ? 'Yes' : 'No';
            const proxyDetected = ipInfo.proxy ? 'Yes' : 'No';
            const responseTime = proxy.responseTime || '';
            const lastChecked = proxy.lastChecked ? new Date(proxy.lastChecked).toISOString() : '';
            const username = cleanData(proxy.username || '');
            const password = cleanData(proxy.password || '');
            const original = cleanData(proxy.original || '');
            
            return `${ip},${port},${type},${country},${countryCode},${region},${city},${postalCode},${latitude},${longitude},${timezone},${isp},${org},${asNumber},${asName},${mobile},${hosting},${proxyDetected},${responseTime},${lastChecked},${username},${password},${original}`;
        }).join('\n');
        
        return header + content;
    }

    updateStats() {
        this.totalCount.textContent = this.proxies.length;
        this.workingCountEl.textContent = this.workingCount;
        this.failedCountEl.textContent = this.failedCount;
        this.checkingCountEl.textContent = this.checkingCount;
    }

    updateProgress() {
        const progress = this.proxies.length > 0 ? (this.checkedCount / this.proxies.length) * 100 : 0;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${Math.round(progress)}%`;
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ProxyChecker();
});

// Add some utility functions for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'o':
                    e.preventDefault();
                    document.getElementById('file-input').click();
                    break;
                case 'Enter':
                    e.preventDefault();
                    const checkBtn = document.getElementById('check-btn');
                    if (!checkBtn.disabled) {
                        checkBtn.click();
                    }
                    break;
            }
        }
    });
});