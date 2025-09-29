# ProxyChecker Pro 🚀

A beautiful, fast, and efficient web-based proxy checker that supports multiple proxy formats and types with real-time multi-threaded checking.

## ✨ Features

- **Beautiful Modern UI**: Responsive design with gradient backgrounds and smooth animations
- **Multi-Format Support**: Handles various proxy formats automatically:
  - `IP:PORT`
  - `IP:PORT:USERNAME:PASSWORD`
  - `USERNAME:PASSWORD@IP:PORT`
  - `protocol://IP:PORT` (http, https, socks4, socks5)
- **Multi-Threaded Checking**: Configurable thread count (10-200 threads) for fast parallel checking
- **Real-Time Updates**: Live status updates with progress tracking
- **Proxy Type Detection**: Automatically detects HTTP, HTTPS, SOCKS4, and SOCKS5 proxies
- **Country Detection**: Shows country information for working proxies
- **Export Functionality**: Export working proxies to a new .txt file
- **Drag & Drop Upload**: Easy file upload with drag and drop support
- **Responsive Design**: Works perfectly on desktop and mobile devices

## 🚀 Quick Start

### Local Development
1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Server**:
   ```bash
   python server.py
   ```

3. **Open in Browser**:
   - Local: http://localhost:12001

### Deploy to Render.com
1. **Fork this repository** to your GitHub account
2. **Connect to Render.com**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - The `render.yaml` file will automatically configure deployment
3. **Your app will be live** at your Render URL!

### Using the Application
1. **Upload Proxy List**:
   - Drag and drop a .txt file with proxies
   - Or click "Browse Files" to select a file

2. **Configure Settings**:
   - Select proxy type (Auto Detect, HTTP, HTTPS, SOCKS4, SOCKS5)
   - Choose thread count (10-200)
   - Set timeout (5-30 seconds)

3. **Start Checking**:
   - Click "Start Checking" to begin
   - Watch real-time progress and results
   - Export working proxies when done

## 📁 Supported Proxy Formats

The application automatically parses these formats:

```
# Basic IP:PORT
192.168.1.1:8080
203.0.113.1:3128

# With authentication
192.168.1.1:8080:username:password
user:pass@192.168.1.1:8080

# With protocol specification
http://192.168.1.1:8080
https://192.168.1.1:8080
socks4://192.168.1.1:1080
socks5://192.168.1.1:1080
```

## 🔧 Configuration Options

- **Proxy Type**: Auto Detect, HTTP, HTTPS, SOCKS4, or SOCKS5 (force specific type or auto-detect from format)
- **Threads**: 10, 25, 50, 100, or 200 concurrent connections
- **Timeout**: 5, 10, 15, or 30 seconds per proxy test
- **Export**: Download working proxies in the same format as uploaded

## 🎨 UI Features

- **Live Statistics**: Real-time counters for total, working, failed, and checking proxies
- **Progress Bar**: Visual progress indicator with percentage
- **Status Badges**: Color-coded status indicators (Working, Failed, Checking, Pending)
- **Responsive Table**: Sortable results with proxy details
- **Modern Design**: Glass-morphism effects and smooth animations

## 🛠️ Technical Details

- **Backend**: Python HTTP server with concurrent proxy checking
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: Pure CSS with CSS Grid and Flexbox
- **Icons**: Font Awesome for beautiful icons
- **Performance**: Multi-threaded checking with configurable concurrency

## 📊 Sample Data

A sample proxy list (`sample_proxies.txt`) is included for testing purposes.

## 🔒 Security Features

- CORS enabled for cross-origin requests
- Input validation and sanitization
- Error handling for malformed proxy data
- Timeout protection against hanging connections

## 🌐 Browser Compatibility

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📱 Mobile Support

Fully responsive design that works perfectly on:
- Smartphones (iOS/Android)
- Tablets
- Desktop computers

---

**ProxyChecker Pro** - The ultimate proxy testing solution! 🎯