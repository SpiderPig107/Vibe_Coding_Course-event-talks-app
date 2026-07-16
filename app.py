import re
import os
import xml.etree.ElementTree as ET
import requests
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Cache variables to avoid hammering Google's servers
_cached_notes = None
_last_fetched = 0

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        xml_data = response.text
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return []

    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

    # Namespace map for Atom
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ''
        
        updated_elem = entry.find('atom:updated', ns)
        updated = updated_elem.text if updated_elem is not None else ''
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ''
        
        # Split content HTML into individual updates based on <h3> tags
        updates = []
        if content_html:
            # Match <h3>Category</h3> followed by body text up to the next <h3> or end of string
            pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL)
            matches = pattern.findall(content_html)
            
            for idx, (category, body) in enumerate(matches):
                body_clean = body.strip()
                # Extract clean text for Twitter by stripping HTML tags
                plain_text = re.sub(r'<[^>]+>', '', body_clean)
                plain_text = re.sub(r'\s+', ' ', plain_text).strip()
                
                updates.append({
                    'id': f"{date_str.replace(' ', '_').replace(',', '')}_{idx}",
                    'category': category.strip(),
                    'body': body_clean,
                    'plain_text': plain_text
                })
        
        entries.append({
            'date': date_str,
            'updated': updated,
            'link': link,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    global _cached_notes
    # Force refetch when hitting endpoint (frontend will trigger this on refresh)
    try:
        notes = fetch_and_parse_feed()
        if notes:
            _cached_notes = notes
            return jsonify({'success': True, 'data': notes})
    except Exception as e:
        print(f"Fetch failed: {e}")
        
    # If fetch failed, return cached notes if available
    if _cached_notes:
        return jsonify({'success': True, 'data': _cached_notes, 'cached': True})
        
    return jsonify({'success': False, 'message': 'Failed to fetch release notes and no cache available.'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
