// Global variables
let cryptocurrencies = [];
let comparisonList = [];
let userPreferences = {
    darkMode: false,
    showChanges: true,
    sortOption: 'market_cap_desc'
};

// DOM elements
const cryptoContainer = document.getElementById('crypto-container');
const comparisonContainer = document.getElementById('comparison-container');
const comparisonCount = document.getElementById('comparison-count');
const clearComparisonBtn = document.getElementById('clear-comparison');
const loadingElement = document.getElementById('loading');
const lastUpdatedElement = document.getElementById('last-updated');
const sortSelect = document.getElementById('sort');
const showChangesCheckbox = document.getElementById('showChanges');
const darkModeCheckbox = document.getElementById('darkMode');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadUserPreferences();
    setupEventListeners();
    fetchCryptocurrencies();
    startDataRefreshInterval();
});

// Load user preferences from local storage
function loadUserPreferences() {
    const savedPreferences = localStorage.getItem('cryptoComparePreferences');
    const savedComparison = localStorage.getItem('cryptoCompareComparison');
    
    if (savedPreferences) {
        userPreferences = JSON.parse(savedPreferences);
        applyPreferences();
    }
    
    if (savedComparison) {
        comparisonList = JSON.parse(savedComparison);
        updateComparisonUI();
    }
}

// Save user preferences to local storage
function saveUserPreferences() {
    localStorage.setItem('cryptoComparePreferences', JSON.stringify(userPreferences));
    localStorage.setItem('cryptoCompareComparison', JSON.stringify(comparisonList));
}

// Apply user preferences to UI
function applyPreferences() {
    // Dark mode
    if (userPreferences.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Show changes
    showChangesCheckbox.checked = userPreferences.showChanges;
    
    // Sort option
    sortSelect.value = userPreferences.sortOption;
}

// Set up event listeners
function setupEventListeners() {
    // Sort option change
    sortSelect.addEventListener('change', (e) => {
        userPreferences.sortOption = e.target.value;
        saveUserPreferences();
        sortAndDisplayCryptocurrencies();
    });
    
    // Show changes toggle
    showChangesCheckbox.addEventListener('change', (e) => {
        userPreferences.showChanges = e.target.checked;
        saveUserPreferences();
        updateCryptoCardsUI();
    });
    
    // Dark mode toggle
    darkModeCheckbox.addEventListener('change', (e) => {
        userPreferences.darkMode = e.target.checked;
        saveUserPreferences();
        applyPreferences();
    });
    
    // Clear comparison button
    clearComparisonBtn.addEventListener('click', () => {
        comparisonList = [];
        updateComparisonUI();
        updateCryptoCardsUI();
        saveUserPreferences();
    });
}

// Fetch cryptocurrency data from CoinGecko API
async function fetchCryptocurrencies() {
    try {
        loadingElement.classList.remove('hidden');
        cryptoContainer.innerHTML = '';
        
        // Get the current sort option
        const sortBy = userPreferences.sortOption.split('_');
        const sortField = sortBy[0];
        const sortOrder = sortBy[2];
        
        // Fetch data from CoinGecko API
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=${sortField}_${sortOrder}&per_page=100&page=1&sparkline=false&x_cg_demo_api_key=CG-mL1yxtSYTdorKBRTUp32o3tw`
          );
        
        if (!response.ok) {
            throw new Error('Failed to fetch data from CoinGecko API');
        }
        
        cryptocurrencies = await response.json();
        
        // Update last updated time
        const now = new Date();
        lastUpdatedElement.textContent = now.toLocaleString();
        
        // Display the cryptocurrencies
        displayCryptocurrencies();
        loadingElement.classList.add('hidden');
    } catch (error) {
        console.error('Error fetching cryptocurrency data:', error);
        loadingElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error loading data. Please try again later.`;
    }
}

// Display cryptocurrencies in the UI
function displayCryptocurrencies() {
    cryptoContainer.innerHTML = '';
    
    cryptocurrencies.forEach(crypto => {
        const isInComparison = comparisonList.some(item => item.id === crypto.id);
        
        const cryptoCard = document.createElement('div');
        cryptoCard.className = `crypto-card ${isInComparison ? 'selected' : ''}`;
        cryptoCard.dataset.id = crypto.id;
        
        const priceChange24h = crypto.price_change_percentage_24h;
        const changeClass = priceChange24h >= 0 ? 'positive' : 'negative';
        const changeIcon = priceChange24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        cryptoCard.innerHTML = `
            <div class="crypto-card-header">
                <img src="${crypto.image}" alt="${crypto.name}">
                <div>
                    <div class="crypto-name">${crypto.name}</div>
                    <div class="crypto-symbol">${crypto.symbol}</div>
                </div>
            </div>
            <div class="crypto-price">$${crypto.current_price.toLocaleString()}</div>
            ${userPreferences.showChanges ? `
                <div class="crypto-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i> ${Math.abs(priceChange24h).toFixed(2)}% (24h)
                </div>
            ` : ''}
            <div class="crypto-details">
                <div class="crypto-market-cap">MCap: $${abbreviateNumber(crypto.market_cap)}</div>
                <div class="crypto-volume">Vol: $${abbreviateNumber(crypto.total_volume)}</div>
            </div>
            <button class="add-to-comparison ${isInComparison ? 'selected' : ''}">
                ${isInComparison ? 'Remove from Comparison' : 'Add to Comparison'}
            </button>
        `;
        
        // Add click event to the card
        cryptoCard.addEventListener('click', (e) => {
            // Don't trigger if clicking on the button (the button has its own handler)
            if (!e.target.classList.contains('add-to-comparison')) {
                toggleCryptocurrencyComparison(crypto);
            }
        });
        
        // Add click event to the button
        const button = cryptoCard.querySelector('.add-to-comparison');
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from firing
            toggleCryptocurrencyComparison(crypto);
        });
        
        cryptoContainer.appendChild(cryptoCard);
    });
}

// Sort and display cryptocurrencies based on current sort option
function sortAndDisplayCryptocurrencies() {
    const sortBy = userPreferences.sortOption.split('_');
    const sortField = sortBy[0];
    const sortOrder = sortBy[2];
    
    cryptocurrencies.sort((a, b) => {
        // Special case for sorting by name (id)
        if (sortField === 'id') {
            return sortOrder === 'asc' 
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        }
        
        return sortOrder === 'desc' 
            ? b[sortField] - a[sortField]
            : a[sortField] - b[sortField];
    });
    
    displayCryptocurrencies();
}

// Toggle cryptocurrency in comparison list
function toggleCryptocurrencyComparison(crypto) {
    const index = comparisonList.findIndex(item => item.id === crypto.id);
    
    if (index === -1) {
        // Add to comparison if not already there and there's room
        if (comparisonList.length < 5) {
            comparisonList.push({
                id: crypto.id,
                name: crypto.name,
                symbol: crypto.symbol,
                image: crypto.image,
                price: crypto.current_price,
                change: crypto.price_change_percentage_24h
            });
        } else {
            alert('You can compare up to 5 cryptocurrencies at a time. Remove one to add another.');
            return;
        }
    } else {
        // Remove from comparison
        comparisonList.splice(index, 1);
    }
    
    updateComparisonUI();
    updateCryptoCardsUI();
    saveUserPreferences();
}

// Update the comparison section UI
function updateComparisonUI() {
    comparisonContainer.innerHTML = '';
    
    if (comparisonList.length === 0) {
        comparisonContainer.classList.add('empty');
        comparisonContainer.innerHTML = '<p>Select up to 5 cryptocurrencies to compare</p>';
        clearComparisonBtn.classList.remove('visible');
    } else {
        comparisonContainer.classList.remove('empty');
        
        comparisonList.forEach((crypto, index) => {
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            const changeIcon = crypto.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            const comparisonItem = document.createElement('div');
            comparisonItem.className = 'comparison-item';
            comparisonItem.innerHTML = `
                <button class="remove-comparison" data-index="${index}">&times;</button>
                <img src="${crypto.image}" alt="${crypto.name}">
                <h3>${crypto.name}</h3>
                <div class="price">$${crypto.price.toLocaleString()}</div>
                ${userPreferences.showChanges ? `
                    <div class="change ${changeClass}">
                        <i class="fas ${changeIcon}"></i> ${Math.abs(crypto.change).toFixed(2)}%
                    </div>
                ` : ''}
            `;
            
            // Add click event to remove button
            const removeBtn = comparisonItem.querySelector('.remove-comparison');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                comparisonList.splice(index, 1);
                updateComparisonUI();
                updateCryptoCardsUI();
                saveUserPreferences();
            });
            
            comparisonContainer.appendChild(comparisonItem);
        });
        
        clearComparisonBtn.classList.add('visible');
    }
    
    comparisonCount.textContent = `(${comparisonList.length}/5)`;
}

// Update crypto cards to reflect comparison status
function updateCryptoCardsUI() {
    const cryptoCards = document.querySelectorAll('.crypto-card');
    
    cryptoCards.forEach(card => {
        const cryptoId = card.dataset.id;
        const isInComparison = comparisonList.some(item => item.id === cryptoId);
        
        // Update card selection state
        if (isInComparison) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        
        // Update button text
        const button = card.querySelector('.add-to-comparison');
        if (button) {
            if (isInComparison) {
                button.textContent = 'Remove from Comparison';
                button.classList.add('selected');
            } else {
                button.textContent = 'Add to Comparison';
                button.classList.remove('selected');
            }
        }
    });
}

// Start interval to refresh data every minute
function startDataRefreshInterval() {
    setInterval(() => {
        fetchCryptocurrencies();
    }, 60000); // 60 seconds
}

// Helper function to abbreviate large numbers
function abbreviateNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toString();
}