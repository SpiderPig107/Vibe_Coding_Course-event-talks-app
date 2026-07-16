# BigQuery Release Notes Hub 🚀

A modern, responsive web application that fetches Google Cloud BigQuery release notes and provides an interactive interface to view, filter, search, and share updates directly on X (Twitter).

Built with **Python Flask**, **Vanilla JS**, and **CSS Grid/Flexbox** (incorporating glassmorphism design aesthetics).

---

## Features
- **Live Feed Parser**: Fetches and parses the official BigQuery Atom release feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
- **Interactive Feed UI**: Groups release updates by date with visual badges for categories (Features, Announcements, Security, Changes & Issues).
- **Advanced Filtering & Search**: Instant client-side search and category filtering.
- **Refresh Control**: Manual refresh button with a dynamic loading spinner.
- **One-Click X (Twitter) Share**: Select any specific release note to open a custom-tailored Tweet Composer drawer that automatically formats the update and prepares it for posting on Twitter (using a Twitter Web Intent).

---

## Setup & Installation

### Prerequisites
- Python 3.x
- Git

### Quick Start
1. **Navigate to the project folder:**
   ```bash
   cd ~/agy-cli-projects/bq-releases-notes
   ```

2. **Create a virtual environment (Recommended):**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask application:**
   ```bash
   python3 app.py
   ```

5. **Open your browser:**
   Navigate to `http://127.0.0.1:5000` to view the application.
