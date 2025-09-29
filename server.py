from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import socket
import socks
import threading
import time
import re
from datetime import datetime

app = Flask(__name__)
CORS(app)

class ProxyChecker:
    def __init__(self):
        self.checking = False
        self.stop_checking = False
        
    def get_ip_info(self, ip):
        """Get IP geolocation info with better error handling"""
        try:
            # Use a simple, reliable API
            response = requests.get(f'http://ip-api.com/json/{ip}', timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success':
                    return {
                        'country': data.get('country', 'Unknown'),
                        'country_code': data.get('countryCode', 'Unknown'),
                        'region': data.get('regionName', 'Unknown'),
                        'city': data.get('city', 'Unknown'),
                        'zip': data.get('zip', 'Unknown'),
                        'lat': str(data.get('lat', 'Unknown')),
                        'lon': str(data.get('lon', 'Unknown')),
                        'timezone': data.get('timezone', 'Unknown'),
                        'isp': data.get('isp', 'Unknown'),
                        'org': data.get('org', 'Unknown'),
                        'as': data.get('as', 'Unknown'),
                        'as_name': data.get('asname', 'Unknown'),
                        'mobile': str(data.get('mobile', False)),
                        'proxy': str(data.get('proxy', False)),
                        'hosting': str(data.get('hosting', False))
                    }
        except Exception as e:
            print(f"IP info error for {ip}: {e}")
        
        return {
            'country': 'Unknown', 'country_code': 'Unknown', 'region': 'Unknown',
            'city': 'Unknown', 'zip': 'Unknown', 'lat': 'Unknown', 'lon': 'Unknown',
            'timezone': 'Unknown', 'isp': 'Unknown', 'org': 'Unknown', 'as': 'Unknown',
            'as_name': 'Unknown', 'mobile': 'Unknown', 'proxy': 'Unknown', 'hosting': 'Unknown'
        }

    def test_http_proxy(self, ip, port, timeout=10):
        """Test HTTP/HTTPS proxy"""
        try:
            proxies = {
                'http': f'http://{ip}:{port}',
                'https': f'http://{ip}:{port}'
            }
            
            start_time = time.time()
            response = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=timeout)
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                real_ip = data.get('origin', '').split(',')[0].strip()
                ip_info = self.get_ip_info(real_ip)
                
                return {
                    'working': True,
                    'responseTime': response_time,
                    'real_ip': real_ip,
                    'country': ip_info.get('country', 'Unknown'),
                    'ip_info': ip_info
                }
        except Exception as e:
            print(f"HTTP proxy test failed for {ip}:{port} - {e}")
        
        return {'working': False, 'responseTime': 0, 'real_ip': None, 'country': 'Unknown', 'ip_info': None}

    def test_socks_proxy(self, ip, port, socks_version=5, timeout=10):
        """Test SOCKS4/5 proxy"""
        try:
            socks_type = socks.SOCKS5 if socks_version == 5 else socks.SOCKS4
            
            # Create socket with SOCKS proxy
            sock = socks.socksocket()
            sock.set_proxy(socks_type, ip, port)
            sock.settimeout(timeout)
            
            start_time = time.time()
            sock.connect(('httpbin.org', 80))
            
            # Send HTTP request
            request = b"GET /ip HTTP/1.1\r\nHost: httpbin.org\r\n\r\n"
            sock.send(request)
            
            response = sock.recv(4096).decode()
            sock.close()
            
            response_time = int((time.time() - start_time) * 1000)
            
            # Extract IP from response
            import json
            if '{"origin":' in response:
                json_part = response.split('\r\n\r\n')[1]
                data = json.loads(json_part)
                real_ip = data.get('origin', '').split(',')[0].strip()
                ip_info = self.get_ip_info(real_ip)
                
                return {
                    'working': True,
                    'responseTime': response_time,
                    'real_ip': real_ip,
                    'country': ip_info.get('country', 'Unknown'),
                    'ip_info': ip_info
                }
        except Exception as e:
            print(f"SOCKS{socks_version} proxy test failed for {ip}:{port} - {e}")
        
        return {'working': False, 'responseTime': 0, 'real_ip': None, 'country': 'Unknown', 'ip_info': None}

proxy_checker = ProxyChecker()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/check-proxy', methods=['POST'])
def check_proxy():
    try:
        data = request.json
        print(f"Received data: {data}")
        
        if not data:
            print("No JSON data received")
            return jsonify({'error': 'No JSON data provided'}), 400
            
        proxy_data = data.get('proxy')
        proxy_type = data.get('type', 'http').lower()
        
        print(f"Proxy data: {proxy_data}, Type: {proxy_type}")
        
        if not proxy_data:
            print("No proxy provided")
            return jsonify({'error': 'No proxy provided'}), 400
        
        # Handle both string format "ip:port" and object format {"ip": "...", "port": ...}
        if isinstance(proxy_data, dict):
            ip = proxy_data.get('ip')
            port = proxy_data.get('port')
            proxy_type = proxy_data.get('type', proxy_type).lower()
            
            if not ip or not port:
                print(f"Missing ip or port in proxy object: {proxy_data}")
                return jsonify({'error': 'Missing ip or port in proxy object'}), 400
                
            try:
                port = int(port)
            except ValueError:
                print(f"Invalid port number: {port}")
                return jsonify({'error': 'Invalid port number'}), 400
        else:
            # String format "ip:port"
            if ':' not in str(proxy_data):
                print(f"Invalid proxy format: {proxy_data}")
                return jsonify({'error': 'Invalid proxy format'}), 400
            
            ip, port = str(proxy_data).split(':', 1)
            try:
                port = int(port)
            except ValueError:
                print(f"Invalid port number: {port}")
                return jsonify({'error': 'Invalid port number'}), 400
    except Exception as e:
        print(f"Error parsing request: {e}")
        return jsonify({'error': f'Request parsing error: {str(e)}'}), 400
    
    print(f"Testing {proxy_type.upper()} proxy: {ip}:{port}")
    
    # Test based on type
    if proxy_type in ['http', 'https']:
        result = proxy_checker.test_http_proxy(ip, port)
    elif proxy_type == 'socks4':
        result = proxy_checker.test_socks_proxy(ip, port, socks_version=4)
    elif proxy_type == 'socks5':
        result = proxy_checker.test_socks_proxy(ip, port, socks_version=5)
    else:
        return jsonify({'error': 'Unsupported proxy type'}), 400
    
    return jsonify(result)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 12001))
    print(f"Starting server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)