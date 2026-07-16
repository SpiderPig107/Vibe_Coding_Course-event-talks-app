// State management
let allNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedUpdateId = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const filterTabs = document.getElementById('filter-tabs');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const notesContainer = document.getElementById('notes-container');
const lastUpdatedText = document.getElementById('last-updated-text');
const retryBtn = document.getElementById('retry-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Drawer DOM Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const tweetTextarea = document.getElementById('tweet-text');
const charCounter = document.getElementById('char-counter');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const sendTweetBtn = document.getElementById('send-tweet-btn');
const themeCheckbox = document.getElementById('theme-checkbox');
const clearSearchBtn = document.getElementById('clear-search-btn');
const offlineBanner = document.getElementById('offline-banner');

// Event Listeners
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Initialize Theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeCheckbox.checked = true;
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeCheckbox.checked = false;
    }

    // Fetch data on load
    fetchNotes();

    // Event registrations
    refreshBtn.addEventListener('click', fetchNotes);
    retryBtn.addEventListener('click', fetchNotes);
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Theme Toggle Event Listener
    themeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Esc Key listener to close Drawer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetDrawer.classList.contains('open')) {
            closeDrawer();
        }
    });

    // Clear Search button click logic
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        activeFilter = 'all';
        
        // Reset filter tabs UI
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.filter-tab[data-filter="all"]').classList.add('active');
        
        renderFeed();
    });
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderFeed();
    });

    filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        
        // Update active class
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        activeFilter = tab.dataset.filter;
        renderFeed();
    });

    // Drawer closures
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    
    // Live update preview in composer
    tweetTextarea.addEventListener('input', updateTweetComposerStatus);
    
    // Send/Post Tweet Event
    sendTweetBtn.addEventListener('click', postTweet);
}

// Fetch Notes from API
async function fetchNotes() {
    showLoading();
    
    try {
        const response = await fetch('/api/notes');
        const result = await response.json();
        
        if (result.success) {
            allNotes = result.data;
            exportCsvBtn.disabled = false;
            
            // Show/Hide offline warning banner
            if (result.cached) {
                offlineBanner.classList.remove('hidden');
                lastUpdatedText.textContent = `Viewing Cache`;
            } else {
                offlineBanner.classList.add('hidden');
                const now = new Date();
                lastUpdatedText.textContent = `Updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            }
            
            renderFeed();
        } else {
            offlineBanner.classList.add('hidden');
            showError(result.message || 'Failed to retrieve release notes.');
        }
    } catch (err) {
        console.error(err);
        showError('Network error connecting to Flask backend. Make sure the server is running.');
    }
}

// Render feed of notes with groups by date
function renderFeed() {
    hideAllStates();
    notesContainer.innerHTML = '';
    
    let hasVisibleContent = false;

    allNotes.forEach(entry => {
        // Filter the updates inside this date entry
        const filteredUpdates = entry.updates.filter(update => {
            // Category Filter Check
            let matchesCategory = false;
            const categoryLower = update.category.toLowerCase();
            
            if (activeFilter === 'all') {
                matchesCategory = true;
            } else if (activeFilter === 'change') {
                // Combine Change & Issue
                matchesCategory = categoryLower.includes('change') || categoryLower.includes('issue');
            } else {
                matchesCategory = categoryLower.includes(activeFilter);
            }
            
            // Search Query Check
            const matchesSearch = searchQuery === '' || 
                update.plain_text.toLowerCase().includes(searchQuery) ||
                update.category.toLowerCase().includes(searchQuery);
                
            return matchesCategory && matchesSearch;
        });

        if (filteredUpdates.length > 0) {
            hasVisibleContent = true;
            
            // Create Date Section
            const dateSection = document.createElement('section');
            dateSection.className = 'date-section';
            
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `
                <h2 class="date-title">${entry.date}</h2>
                <div class="date-line"></div>
            `;
            dateSection.appendChild(dateHeader);
            
            const grid = document.createElement('div');
            grid.className = 'updates-grid';
            
            filteredUpdates.forEach(update => {
                const card = document.createElement('div');
                card.className = `update-card ${selectedUpdateId === update.id ? 'selected' : ''}`;
                card.id = `card-${update.id}`;
                
                // Determine Badge Class
                let badgeClass = 'badge-feature';
                const catLower = update.category.toLowerCase();
                if (catLower.includes('announcement')) badgeClass = 'badge-announcement';
                if (catLower.includes('security')) badgeClass = 'badge-security';
                if (catLower.includes('change') || catLower.includes('issue')) badgeClass = 'badge-change';
                
                card.innerHTML = `
                    <div class="card-header">
                        <span class="badge ${badgeClass}">${update.category}</span>
                        <div class="card-actions">
                            <button class="card-action-btn copy-btn" title="Copy to Clipboard">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                            <span class="select-checkbox" aria-label="Select update to Tweet">
                                <i class="fa-solid fa-check"></i>
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        ${update.body}
                    </div>
                `;
                
                // Copy to Clipboard logic
                const copyBtn = card.querySelector('.copy-btn');
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card selection click event
                    copyToClipboard(update.plain_text, copyBtn);
                });

                // Clicking Card selects it and opens composer
                card.addEventListener('click', (e) => {
                    // Prevent trigger if clicking on an actual link in body
                    if (e.target.tagName === 'A') return;
                    
                    selectUpdate(update, entry.date);
                });
                
                grid.appendChild(card);
            });
            
            dateSection.appendChild(grid);
            notesContainer.appendChild(dateSection);
        }
    });

    if (!hasVisibleContent) {
        if (allNotes.length === 0) {
            showError('No release notes found.');
        } else {
            showEmpty();
        }
    }
}

// Select an update to compose tweet
function selectUpdate(update, dateStr) {
    const cardElement = document.getElementById(`card-${update.id}`);
    
    // If clicking already selected, toggle off
    if (selectedUpdateId === update.id) {
        selectedUpdateId = null;
        cardElement.classList.remove('selected');
        closeDrawer();
        return;
    }
    
    // Clear other selections
    document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    
    selectedUpdateId = update.id;
    cardElement.classList.add('selected');
    
    // Pre-populate tweet contents
    const text = update.plain_text;
    const category = update.category.toUpperCase();
    
    // Draft a neat post structure
    let tweetDraft = `📢 BigQuery Update (${dateStr}):\n\n`;
    tweetDraft += `[${category}] ${text}\n\n`;
    tweetDraft += `#BigQuery #GoogleCloud`;
    
    // Truncate to make sure it fits X's 280-char limit
    if (tweetDraft.length > 280) {
        const overhead = tweetDraft.length - text.length;
        const availableTextSpace = 280 - overhead - 4; // 4 for '...'
        const truncatedText = text.substring(0, availableTextSpace) + '...';
        
        tweetDraft = `📢 BigQuery Update (${dateStr}):\n\n`;
        tweetDraft += `[${category}] ${truncatedText}\n\n`;
        tweetDraft += `#BigQuery #GoogleCloud`;
    }
    
    openDrawer(tweetDraft);
}

// Drawer Controls
function openDrawer(initialText) {
    tweetTextarea.value = initialText;
    updateTweetComposerStatus();
    
    tweetDrawer.classList.add('open');
    tweetDrawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
    tweetDrawer.classList.remove('open');
    tweetDrawer.setAttribute('aria-hidden', 'true');
    // Clear selection state in UI
    selectedUpdateId = null;
    document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
}

function updateTweetComposerStatus() {
    const text = tweetTextarea.value;
    const length = text.length;
    
    charCounter.textContent = `${length} / 280`;
    tweetPreviewText.textContent = text || 'Start typing in the composer above...';
    
    if (length > 280) {
        charCounter.classList.add('error');
        sendTweetBtn.disabled = true;
    } else {
        charCounter.classList.remove('error');
        sendTweetBtn.disabled = false;
    }
}

// Redirect to Twitter/X Web Intent Share
function postTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) return;
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank');
    
    showToast('Redirected to Twitter to complete your post!');
    closeDrawer();
}

// Utility States
function showLoading() {
    hideAllStates();
    loadingState.classList.remove('hidden');
    refreshIcon.classList.add('spinning');
    refreshBtn.disabled = true;
    exportCsvBtn.disabled = true;
    offlineBanner.classList.add('hidden');
}

function showError(msg) {
    hideAllStates();
    errorState.classList.remove('hidden');
    errorMessage.textContent = msg;
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
    exportCsvBtn.disabled = true;
    offlineBanner.classList.add('hidden');
}

function showEmpty() {
    hideAllStates();
    emptyState.classList.remove('hidden');
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
    exportCsvBtn.disabled = true;
}

function hideAllStates() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// Copy to Clipboard logic
async function copyToClipboard(text, btnElement) {
    try {
        await navigator.clipboard.writeText(text);
        
        btnElement.classList.add('copied');
        const icon = btnElement.querySelector('i');
        icon.className = 'fa-solid fa-check';
        
        showToast('Copied update to clipboard!');
        
        setTimeout(() => {
            btnElement.classList.remove('copied');
            icon.className = 'fa-regular fa-copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy to clipboard.');
    }
}

// Export Filtered/Searched Notes to CSV
function exportToCSV() {
    if (!allNotes || allNotes.length === 0) {
        showToast('No notes available to export.');
        return;
    }
    
    const csvRows = [];
    csvRows.push(['Date', 'Category', 'Update Content', 'Link'].map(escapeCSVField).join(','));
    
    let noteCount = 0;
    
    allNotes.forEach(entry => {
        entry.updates.forEach(update => {
            let matchesCategory = false;
            const categoryLower = update.category.toLowerCase();
            
            if (activeFilter === 'all') {
                matchesCategory = true;
            } else if (activeFilter === 'change') {
                matchesCategory = categoryLower.includes('change') || categoryLower.includes('issue');
            } else {
                matchesCategory = categoryLower.includes(activeFilter);
            }
            
            const matchesSearch = searchQuery === '' || 
                update.plain_text.toLowerCase().includes(searchQuery) ||
                update.category.toLowerCase().includes(searchQuery);
                
            if (matchesCategory && matchesSearch) {
                const row = [
                    entry.date,
                    update.category,
                    update.plain_text,
                    entry.link
                ];
                csvRows.push(row.map(escapeCSVField).join(','));
                noteCount++;
            }
        });
    });
    
    if (noteCount === 0) {
        showToast('No matching notes to export.');
        return;
    }
    
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${activeFilter}_filter.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported ${noteCount} notes to CSV!`);
}

function escapeCSVField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    let stringField = String(field);
    stringField = stringField.replace(/"/g, '""');
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r') || stringField.includes('"')) {
        stringField = `"${stringField}"`;
    }
    return stringField;
}
