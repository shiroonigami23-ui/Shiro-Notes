// Advanced Search Module for Shiro Notes
class SearchModule {
  constructor(app) {
    this.app = app;
    this.searchIndex = new Map();
    this.lastSearchQuery = '';
    this.searchFilters = {
      type: 'all',
      dateRange: 'all',
      tags: [],
      encrypted: 'all'
    };
    this.searchHistory = [];
    this.buildSearchIndex();
  }

  // Build search index for fast searching
  buildSearchIndex() {
    this.searchIndex.clear();
    
    // Index books
    this.app.data.books.forEach(book => {
      if (!book.encrypted) {
        this.indexItem(book, 'book');
      }
    });
    
    // Index notes
    this.app.data.notes.forEach(note => {
      if (!note.encrypted) {
        this.indexItem(note, 'note');
      }
    });
    
    // Index events
    this.app.data.events.forEach(event => {
      this.indexItem(event, 'event');
    });
  }

  indexItem(item, type) {
    const words = this.extractWords(item, type);
    
    words.forEach(word => {
      const normalizedWord = word.toLowerCase();
      
      if (!this.searchIndex.has(normalizedWord)) {
        this.searchIndex.set(normalizedWord, []);
      }
      
      this.searchIndex.get(normalizedWord).push({
        id: item.id,
        type: type,
        item: item,
        relevance: this.calculateRelevance(word, item, type)
      });
    });
  }

  extractWords(item, type) {
    let text = '';
    
    switch (type) {
      case 'book':
        text += item.title + ' ' + (item.description || '') + ' ';
        if (item.chapters) {
          item.chapters.forEach(chapter => {
            text += chapter.title + ' ' + this.stripHtml(chapter.content || '') + ' ';
          });
        }
        break;
      case 'note':
        text += item.title + ' ' + this.stripHtml(item.content || '') + ' ';
        break;
      case 'event':
        text += item.title + ' ' + (item.description || '') + ' ' + item.category + ' ';
        break;
    }
    
    // Add tags
    if (item.tags) {
      text += item.tags.join(' ') + ' ';
    }
    
    // Extract words (alphanumeric sequences of 2+ characters)
    const words = text.match(/\b\w{2,}\b/g) || [];
    return [...new Set(words)]; // Remove duplicates
  }

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  calculateRelevance(word, item, type) {
    let relevance = 0;
    const lowerWord = word.toLowerCase();
    const title = item.title ? item.title.toLowerCase() : '';
    
    // Higher relevance for title matches
    if (title.includes(lowerWord)) {
      relevance += 10;
    }
    
    // Higher relevance for exact matches
    if (title === lowerWord) {
      relevance += 20;
    }
    
    // Type-based relevance
    switch (type) {
      case 'book': relevance += 3; break;
      case 'note': relevance += 2; break;
      case 'event': relevance += 1; break;
    }
    
    // Recency boost
    if (item.lastModified) {
      const daysSinceModified = (Date.now() - new Date(item.lastModified)) / (1000 * 60 * 60 * 24);
      relevance += Math.max(0, 5 - daysSinceModified / 30); // Boost for recent items
    }
    
    return relevance;
  }

  // Main search function
  search(query, filters = {}) {
    if (!query.trim()) {
      return { results: [], suggestions: [], stats: { total: 0, books: 0, notes: 0, events: 0 } };
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const searchTerms = normalizedQuery.split(/\s+/);
    
    // Add to search history
    this.addToSearchHistory(query);
    
    let results = new Map();
    
    // Search for each term
    searchTerms.forEach(term => {
      const termResults = this.searchTerm(term);
      
      termResults.forEach(result => {
        const key = `${result.type}-${result.id}`;
        
        if (results.has(key)) {
          // Boost relevance for items matching multiple terms
          results.get(key).relevance += result.relevance * 0.5;
          results.get(key).matchedTerms++;
        } else {
          results.set(key, {
            ...result,
            matchedTerms: 1,
            totalTerms: searchTerms.length
          });
        }
      });
    });
    
    // Convert to array and sort by relevance
    let sortedResults = Array.from(results.values())
      .sort((a, b) => {
        // Prefer results matching more terms
        if (a.matchedTerms !== b.matchedTerms) {
          return b.matchedTerms - a.matchedTerms;
        }
        return b.relevance - a.relevance;
      });
    
    // Apply filters
    sortedResults = this.applyFilters(sortedResults, filters);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(query, sortedResults);
    
    // Calculate stats
    const stats = this.calculateStats(sortedResults);
    
    return {
      results: sortedResults,
      suggestions: suggestions,
      stats: stats
    };
  }

  searchTerm(term) {
    const results = [];
    
    // Exact match
    if (this.searchIndex.has(term)) {
      results.push(...this.searchIndex.get(term));
    }
    
    // Prefix matching
    for (const [word, items] of this.searchIndex.entries()) {
      if (word.startsWith(term) && word !== term) {
        items.forEach(item => {
          results.push({
            ...item,
            relevance: item.relevance * 0.8 // Slightly lower relevance for prefix matches
          });
        });
      }
    }
    
    // Fuzzy matching for typos (Levenshtein distance)
    if (term.length >= 4) {
      for (const [word, items] of this.searchIndex.entries()) {
        const distance = this.levenshteinDistance(term, word);
        if (distance <= 2 && distance > 0) {
          items.forEach(item => {
            results.push({
              ...item,
              relevance: item.relevance * (0.6 - distance * 0.1) // Lower relevance for fuzzy matches
            });
          });
        }
      }
    }
    
    return results;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  applyFilters(results, filters) {
    return results.filter(result => {
      // Type filter
      if (filters.type && filters.type !== 'all' && result.type !== filters.type) {
        return false;
      }
      
      // Date range filter
      if (filters.dateRange && filters.dateRange !== 'all') {
        const itemDate = new Date(result.item.lastModified || result.item.created);
        const now = new Date();
        const daysDiff = (now - itemDate) / (1000 * 60 * 60 * 24);
        
        switch (filters.dateRange) {
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
          case 'year':
            if (daysDiff > 365) return false;
            break;
        }
      }
      
      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const itemTags = result.item.tags || [];
        if (!filters.tags.some(tag => itemTags.includes(tag))) {
          return false;
        }
      }
      
      // Encrypted filter
      if (filters.encrypted && filters.encrypted !== 'all') {
        const isEncrypted = result.item.encrypted || false;
        if (filters.encrypted === 'encrypted' && !isEncrypted) return false;
        if (filters.encrypted === 'unencrypted' && isEncrypted) return false;
      }
      
      return true;
    });
  }

  generateSuggestions(query, results) {
    const suggestions = [];
    
    // Tag suggestions based on results
    const tagCounts = new Map();
    results.forEach(result => {
      if (result.item.tags) {
        result.item.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    // Top tags
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ type: 'tag', text: tag, count }));
    
    suggestions.push(...topTags);
    
    // Similar queries from history
    const similarQueries = this.searchHistory
      .filter(historyQuery => 
        historyQuery !== query && 
        historyQuery.toLowerCase().includes(query.toLowerCase())
      )
      .slice(-3)
      .map(text => ({ type: 'history', text }));
    
    suggestions.push(...similarQueries);
    
    return suggestions;
  }

  calculateStats(results) {
    const stats = { total: results.length, books: 0, notes: 0, events: 0 };
    
    results.forEach(result => {
      switch (result.type) {
        case 'book': stats.books++; break;
        case 'note': stats.notes++; break;
        case 'event': stats.events++; break;
      }
    });
    
    return stats;
  }

  addToSearchHistory(query) {
    const normalizedQuery = query.trim();
    if (normalizedQuery && !this.searchHistory.includes(normalizedQuery)) {
      this.searchHistory.unshift(normalizedQuery);
      
      // Keep only last 20 searches
      if (this.searchHistory.length > 20) {
        this.searchHistory = this.searchHistory.slice(0, 20);
      }
      
      // Save to localStorage
      localStorage.setItem('shiroNotesSearchHistory', JSON.stringify(this.searchHistory));
    }
  }

  loadSearchHistory() {
    try {
      const saved = localStorage.getItem('shiroNotesSearchHistory');
      if (saved) {
        this.searchHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
      this.searchHistory = [];
    }
  }

  // Search by tag
  searchByTag(tagName) {
    const results = [];
    
    // Search books
    this.app.data.books.forEach(book => {
      if (!book.encrypted && book.tags && book.tags.includes(tagName)) {
        results.push({
          id: book.id,
          type: 'book',
          item: book,
          relevance: 10,
          matchedTerms: 1,
          totalTerms: 1
        });
      }
    });
    
    // Search notes
    this.app.data.notes.forEach(note => {
      if (!note.encrypted && note.tags && note.tags.includes(tagName)) {
        results.push({
          id: note.id,
          type: 'note',
          item: note,
          relevance: 10,
          matchedTerms: 1,
          totalTerms: 1
        });
      }
    });
    
    return {
      results: results.sort((a, b) => new Date(b.item.lastModified || b.item.created) - new Date(a.item.lastModified || a.item.created)),
      suggestions: [],
      stats: this.calculateStats(results)
    };
  }

  // Get all tags with counts
  getAllTags() {
    const tagCounts = new Map();
    
    [...this.app.data.books, ...this.app.data.notes].forEach(item => {
      if (!item.encrypted && item.tags) {
        item.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ name: tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Quick search for autocomplete
  quickSearch(query, limit = 5) {
    if (!query.trim() || query.length < 2) return [];
    
    const results = this.search(query).results.slice(0, limit);
    
    return results.map(result => ({
      id: result.id,
      type: result.type,
      title: result.item.title,
      snippet: this.generateSnippet(result.item, query)
    }));
  }

  generateSnippet(item, query) {
    let content = '';
    
    switch (item.type || 'note') {
      case 'book':
        content = item.description || '';
        if (item.chapters && item.chapters.length > 0) {
          content += ' ' + this.stripHtml(item.chapters[0].content || '');
        }
        break;
      case 'note':
        content = this.stripHtml(item.content || '');
        break;
      case 'event':
        content = item.description || '';
        break;
    }
    
    // Find the query in content and create snippet
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + query.length + 50);
      let snippet = content.substring(start, end);
      
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
      
      return snippet;
    }
    
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  }

  // Load search page
  loadSearchPage(page) {
    page.innerHTML = `
      <div class="search-container">
        <div class="search-header">
          <h1>Advanced Search</h1>
          <div class="search-box-container">
            <div class="search-box">
              <input type="text" id="searchInput" placeholder="Search notes, books, events..." autocomplete="off">
              <button class="search-btn" id="searchBtn">
                <i class="fas fa-search"></i>
              </button>
            </div>
            <div class="search-suggestions" id="searchSuggestions"></div>
          </div>
        </div>
        
        <div class="search-filters" id="searchFilters">
          <div class="filter-group">
            <label>Type:</label>
            <select id="typeFilter">
              <option value="all">All Types</option>
              <option value="book">Books</option>
              <option value="note">Notes</option>
              <option value="event">Events</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Date:</label>
            <select id="dateFilter">
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Tags:</label>
            <div class="tag-filter" id="tagFilter">
              <input type="text" id="tagInput" placeholder="Filter by tags...">
              <div class="tag-suggestions" id="tagSuggestions"></div>
            </div>
          </div>
          
          <div class="filter-group">
            <button class="btn btn--secondary btn--sm" id="clearFilters">Clear Filters</button>
          </div>
        </div>
        
        <div class="search-content">
          <div class="search-results-container">
            <div class="search-stats" id="searchStats"></div>
            <div class="search-results" id="searchResults">
              <div class="search-welcome">
                <i class="fas fa-search"></i>
                <h3>Search your content</h3>
                <p>Enter a search term above to find books, notes, and events</p>
                
                ${this.searchHistory.length > 0 ? `
                  <div class="recent-searches">
                    <h4>Recent searches:</h4>
                    <div class="search-history">
                      ${this.searchHistory.slice(0, 5).map(query => `
                        <button class="history-item" onclick="searchModule.performSearch('${this.app.escapeHtml(query)}')">
                          <i class="fas fa-history"></i> ${this.app.escapeHtml(query)}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
                
                <div class="popular-tags">
                  <h4>Popular tags:</h4>
                  <div class="tags-cloud">
                    ${this.getAllTags().slice(0, 10).map(tag => `
                      <button class="tag-bubble" onclick="searchModule.searchByTagName('${tag.name}')">
                        ${this.app.escapeHtml(tag.name)} (${tag.count})
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.setupSearchEventListeners();
  }

  setupSearchEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const typeFilter = document.getElementById('typeFilter');
    const dateFilter = document.getElementById('dateFilter');
    const tagInput = document.getElementById('tagInput');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    // Search input events
    searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.performSearch(e.target.value);
      }
    });
    
    // Search button
    searchBtn.addEventListener('click', () => {
      this.performSearch(searchInput.value);
    });
    
    // Filter changes
    [typeFilter, dateFilter].forEach(filter => {
      filter.addEventListener('change', () => {
        if (searchInput.value.trim()) {
          this.performSearch(searchInput.value);
        }
      });
    });
    
    // Tag input
    tagInput.addEventListener('input', (e) => {
      this.showTagSuggestions(e.target.value);
    });
    
    // Clear filters
    clearFiltersBtn.addEventListener('click', () => {
      this.clearFilters();
    });
  }

  handleSearchInput(query) {
    if (query.length >= 2) {
      this.showSearchSuggestions(query);
    } else {
      this.hideSearchSuggestions();
    }
  }

  showSearchSuggestions(query) {
    const suggestions = this.quickSearch(query, 5);
    const container = document.getElementById('searchSuggestions');
    
    if (suggestions.length === 0) {
      container.classList.add('hidden');
      return;
    }
    
    container.innerHTML = suggestions.map(result => `
      <div class="suggestion-item" onclick="searchModule.openItem('${result.type}', '${result.id}')">
        <div class="suggestion-icon">
          <i class="fas fa-${this.getTypeIcon(result.type)}"></i>
        </div>
        <div class="suggestion-content">
          <div class="suggestion-title">${this.app.escapeHtml(result.title)}</div>
          <div class="suggestion-snippet">${this.app.escapeHtml(result.snippet)}</div>
        </div>
        <div class="suggestion-type">${result.type}</div>
      </div>
    `).join('');
    
    container.classList.remove('hidden');
  }

  hideSearchSuggestions() {
    const container = document.getElementById('searchSuggestions');
    container.classList.add('hidden');
  }

  showTagSuggestions(query) {
    const allTags = this.getAllTags();
    const filteredTags = allTags.filter(tag => 
      tag.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    
    const container = document.getElementById('tagSuggestions');
    
    if (filteredTags.length === 0 || !query.trim()) {
      container.classList.add('hidden');
      return;
    }
    
    container.innerHTML = filteredTags.map(tag => `
      <div class="tag-suggestion" onclick="searchModule.selectTag('${tag.name}')">
        ${this.app.escapeHtml(tag.name)} (${tag.count})
      </div>
    `).join('');
    
    container.classList.remove('hidden');
  }

  selectTag(tagName) {
    const tagInput = document.getElementById('tagInput');
    tagInput.value = tagName;
    document.getElementById('tagSuggestions').classList.add('hidden');
    
    // Perform search
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.trim()) {
      this.performSearch(searchInput.value);
    } else {
      this.searchByTagName(tagName);
    }
  }

  searchByTagName(tagName) {
    const results = this.searchByTag(tagName);
    this.displayResults(results, `Results for tag "${tagName}"`);
  }

  performSearch(query) {
    if (!query.trim()) return;
    
    this.hideSearchSuggestions();
    this.lastSearchQuery = query;
    
    const filters = {
      type: document.getElementById('typeFilter').value,
      dateRange: document.getElementById('dateFilter').value,
      tags: document.getElementById('tagInput').value.trim() ? [document.getElementById('tagInput').value.trim()] : []
    };
    
    const results = this.search(query, filters);
    this.displayResults(results, `Search results for "${query}"`);
  }

  displayResults(searchData, title) {
    const container = document.getElementById('searchResults');
    const statsContainer = document.getElementById('searchStats');
    
    // Update stats
    const stats = searchData.stats;
    statsContainer.innerHTML = `
      <div class="stats-summary">
        <span class="stat-item">Total: <strong>${stats.total}</strong></span>
        ${stats.books > 0 ? `<span class="stat-item">Books: <strong>${stats.books}</strong></span>` : ''}
        ${stats.notes > 0 ? `<span class="stat-item">Notes: <strong>${stats.notes}</strong></span>` : ''}
        ${stats.events > 0 ? `<span class="stat-item">Events: <strong>${stats.events}</strong></span>` : ''}
      </div>
    `;
    
    // Display results
    if (searchData.results.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>No results found</h3>
          <p>Try adjusting your search terms or filters</p>
          ${searchData.suggestions.length > 0 ? `
            <div class="search-suggestions-list">
              <h4>Suggestions:</h4>
              <div class="suggestions">
                ${searchData.suggestions.map(suggestion => `
                  <button class="suggestion-btn" onclick="searchModule.applySuggestion('${suggestion.type}', '${suggestion.text}')">
                    <i class="fas fa-${suggestion.type === 'tag' ? 'tag' : 'history'}"></i>
                    ${this.app.escapeHtml(suggestion.text)}
                    ${suggestion.count ? `(${suggestion.count})` : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="results-header">
        <h3>${title}</h3>
      </div>
      <div class="results-list">
        ${searchData.results.map(result => this.createResultCard(result)).join('')}
      </div>
    `;
  }

  createResultCard(result) {
    const item = result.item;
    const typeIcon = this.getTypeIcon(result.type);
    const snippet = this.generateSnippet(item, this.lastSearchQuery);
    
    return `
      <div class="result-card ${result.type}" onclick="searchModule.openItem('${result.type}', '${item.id}')">
        <div class="result-icon">
          <i class="fas fa-${typeIcon}"></i>
        </div>
        <div class="result-content">
          <div class="result-header">
            <h4 class="result-title">${this.highlightQuery(this.app.escapeHtml(item.title), this.lastSearchQuery)}</h4>
            <div class="result-meta">
              <span class="result-type">${result.type}</span>
              <span class="result-date">${this.app.formatDate(item.lastModified || item.created || item.startTime)}</span>
              ${result.matchedTerms > 1 ? `<span class="match-badge">${result.matchedTerms}/${result.totalTerms} terms</span>` : ''}
            </div>
          </div>
          <div class="result-snippet">
            ${this.highlightQuery(this.app.escapeHtml(snippet), this.lastSearchQuery)}
          </div>
          ${item.tags && item.tags.length > 0 ? `
            <div class="result-tags">
              ${item.tags.slice(0, 3).map(tag => `<span class="tag">${this.app.escapeHtml(tag)}</span>`).join('')}
              ${item.tags.length > 3 ? `<span class="more-tags">+${item.tags.length - 3} more</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="result-actions">
          <button class="action-btn" onclick="event.stopPropagation(); searchModule.openItem('${result.type}', '${item.id}')" title="Open">
            <i class="fas fa-external-link-alt"></i>
          </button>
          ${item.bookmarked ? '<i class="fas fa-bookmark result-bookmark" title="Bookmarked"></i>' : ''}
          ${item.encrypted ? '<i class="fas fa-lock result-encrypted" title="Encrypted"></i>' : ''}
        </div>
      </div>
    `;
  }

  highlightQuery(text, query) {
    if (!query) return text;
    
    const terms = query.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getTypeIcon(type) {
    const icons = {
      book: 'book',
      note: 'sticky-note',
      event: 'calendar-alt'
    };
    return icons[type] || 'file';
  }

  openItem(type, id) {
    switch (type) {
      case 'book':
        this.app.openBook(id);
        break;
      case 'note':
        this.app.openNote(id);
        break;
      case 'event':
        if (window.schedulerModule) {
          schedulerModule.editEvent(id);
        }
        break;
    }
  }

  applySuggestion(type, text) {
    if (type === 'tag') {
      this.searchByTagName(text);
    } else if (type === 'history') {
      document.getElementById('searchInput').value = text;
      this.performSearch(text);
    }
  }

  clearFilters() {
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('tagInput').value = '';
    
    if (document.getElementById('searchInput').value.trim()) {
      this.performSearch(document.getElementById('searchInput').value);
    }
  }

  // Update search index when data changes
  updateIndex() {
    this.buildSearchIndex();
  }
}

// Initialize search module
const searchModule = new SearchModule(app);
window.searchModule = searchModule;

// Load search history
searchModule.loadSearchHistory();

// Override app's loadSearchPage method
app.loadSearchPage = (page) => {
  searchModule.loadSearchPage(page);
};

// Override quick search handler
app.handleQuickSearch = (query) => {
  if (query.length >= 2) {
    const results = searchModule.quickSearch(query, 3);
    // Could show dropdown with quick results
    console.log('Quick search results:', results);
  }
};

// Update search index when data changes
const originalSaveData = app.saveData;
app.saveData = function() {
  originalSaveData.call(this);
  searchModule.updateIndex();
};

// Add search-specific styles
const searchStyles = `
.search-container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-header {
  margin-bottom: var(--space-6);
}

.search-header h1 {
  margin-bottom: var(--space-4);
}

.search-box-container {
  position: relative;
  max-width: 600px;
}

.search-box {
  display: flex;
  position: relative;
}

.search-box input {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.search-btn {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-base);
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.search-btn:hover {
  background-color: var(--color-primary-hover);
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
  margin-top: var(--space-1);
}

.search-suggestions.hidden {
  display: none;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.suggestion-item:hover {
  background-color: var(--color-secondary);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-icon {
  width: 24px;
  text-align: center;
  color: var(--color-primary);
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  margin-bottom: 2px;
}

.suggestion-snippet {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-type {
  background-color: var(--color-secondary);
  color: var(--color-text-secondary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}

.search-filters {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-group label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.filter-group select,
.tag-filter input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.tag-filter {
  position: relative;
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-md);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.tag-suggestions.hidden {
  display: none;
}

.tag-suggestion {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.tag-suggestion:hover {
  background-color: var(--color-secondary);
}

.tag-suggestion:last-child {
  border-bottom: none;
}

.search-content {
  flex: 1;
  overflow: hidden;
}

.search-results-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-stats {
  margin-bottom: var(--space-4);
}

.stats-summary {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-bg-1);
  border-radius: var(--radius-base);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.stat-item {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stat-item strong {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
}

.search-welcome {
  text-align: center;
  padding: var(--space-12);
}

.search-welcome i {
  font-size: var(--font-size-4xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.search-welcome h3 {
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.search-welcome p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.recent-searches,
.popular-tags {
  margin-top: var(--space-6);
  text-align: left;
}

.recent-searches h4,
.popular-tags h4 {
  font-size: var(--font-size-base);
  margin-bottom: var(--space-3);
  color: var(--color-text);
}

.search-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-secondary);
  border: none;
  border-radius: var(--radius-base);
  color: var(--color-text);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.history-item:hover {
  background-color: var(--color-secondary-hover);
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

.tag-bubble {
  background-color: var(--color-primary);
  color: white;
  border: none;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-bubble:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.05);
}

.results-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.results-header h3 {
  margin: 0;
  color: var(--color-text);
}

.results-list {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.result-card {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.result-card:hover {
  background-color: var(--color-secondary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.result-icon {
  width: 40px;
  height: 40px;
  background-color: var(--color-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.result-card.book .result-icon {
  background-color: #3b82f6;
}

.result-card.note .result-icon {
  background-color: #10b981;
}

.result-card.event .result-icon {
  background-color: #f59e0b;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
  gap: var(--space-3);
}

.result-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  line-height: 1.3;
}

.result-title mark {
  background-color: yellow;
  color: #000;
  padding: 1px 2px;
  border-radius: 2px;
}

.result-meta {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}

.result-type {
  background-color: var(--color-secondary);
  color: var(--color-text-secondary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}

.result-date {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.match-badge {
  background-color: var(--color-primary);
  color: white;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.result-snippet {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.4;
  margin-bottom: var(--space-3);
}

.result-snippet mark {
  background-color: yellow;
  color: #000;
  padding: 1px 2px;
  border-radius: 2px;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.result-tags .tag {
  background-color: var(--color-primary);
  color: white;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.more-tags {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-style: italic;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: var(--color-secondary);
  color: var(--color-text);
  border-radius: var(--radius-base);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background-color: var(--color-primary);
  color: white;
}

.result-bookmark {
  color: var(--color-warning);
  font-size: var(--font-size-sm);
}

.result-encrypted {
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.no-results {
  text-align: center;
  padding: var(--space-12);
}

.no-results i {
  font-size: var(--font-size-4xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.no-results h3 {
  margin-bottom: var(--space-2);
  color: var(--color-text);
}

.no-results p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
}

.search-suggestions-list {
  margin-top: var(--space-6);
}

.search-suggestions-list h4 {
  margin-bottom: var(--space-3);
  color: var(--color-text);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

.suggestion-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--color-secondary);
  border: none;
  border-radius: var(--radius-base);
  color: var(--color-text);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.suggestion-btn:hover {
  background-color: var(--color-secondary-hover);
}

/* Responsive Design */
@media (max-width: 768px) {
  .search-filters {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }
  
  .filter-group {
    justify-content: space-between;
  }
  
  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .result-meta {
    gap: var(--space-2);
  }
  
  .result-card {
    padding: var(--space-3);
  }
  
  .result-actions {
    flex-direction: row;
  }
}

@media (max-width: 480px) {
  .search-box input {
    font-size: var(--font-size-base);
  }
  
  .result-icon {
    width: 32px;
    height: 32px;
    font-size: var(--font-size-base);
  }
  
  .tags-cloud {
    gap: var(--space-1);
  }
  
  .tag-bubble {
    font-size: 10px;
    padding: 1px var(--space-2);
  }
}
`;

// Inject search styles
const searchStyleSheet = document.createElement('style');
searchStyleSheet.textContent = searchStyles;
document.head.appendChild(searchStyleSheet);