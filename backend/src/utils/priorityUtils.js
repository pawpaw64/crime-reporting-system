/**
 * Priority Detection Utility
 * Analyzes complaint/report content to determine priority level based on keywords
 * 
 * Priority Levels:
 * - critical: Life-threatening situations (murder, kidnap, terrorism, etc.)
 * - high: Serious crimes requiring urgent attention (assault, robbery, etc.)
 * - medium: Standard crimes (theft, fraud, harassment) - default
 * - low: Minor incidents (noise complaints, minor disputes)
 */

const pool = require('../db');

// Default priority keywords (used as fallback if DB lookup fails)
const DEFAULT_KEYWORDS = {
    critical: [
        'murder', 'homicide', 'killing', 'killed', 'kill',
        'kidnap', 'kidnapping', 'kidnapped', 'abduction', 'abducted', 'hostage',
        'terrorism', 'terrorist', 'bomb', 'bombing', 'explosive',
        'mass shooting', 'shooting', 'shot', 'gunfire',
        'child abuse', 'rape', 'sexual assault', 'molestation',
        'human trafficking', 'trafficking',
        'arson', 'stabbing', 'stabbed'
    ],
    high: [
        'assault', 'attacked', 'attack', 'beaten', 'beating',
        'robbery', 'armed robbery', 'burglary', 'home invasion',
        'domestic violence', 'abuse',
        'threatening', 'death threat',
        'weapon', 'gun', 'knife attack', 'armed',
        'extortion', 'blackmail', 'ransom',
        'drug dealer', 'drug dealing', 'narcotics',
        'gang', 'gang violence',
        'stalking', 'stalker'
    ],
    medium: [
        'theft', 'stolen', 'fraud', 'scam',
        'harassment', 'vandalism', 'trespassing', 'break-in',
        'cybercrime', 'hacking', 'identity theft',
        'corruption', 'bribery'
    ],
    low: [
        'noise complaint', 'parking', 'littering',
        'jaywalking', 'loitering', 'minor dispute'
    ]
};

// Priority order for comparison (lower index = higher priority)
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

// Cache for keywords from database (refreshed periodically)
let keywordsCache = null;
let keywordsCacheTime = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load keywords from database into cache
 */
async function loadKeywordsFromDb() {
    try {
        const [rows] = await pool.query(
            `SELECT keyword, priority_level FROM priority_keywords WHERE is_active = 1`
        );
        
        const keywords = {
            critical: [],
            high: [],
            medium: [],
            low: []
        };
        
        for (const row of rows) {
            const level = row.priority_level;
            if (keywords[level]) {
                keywords[level].push(row.keyword.toLowerCase());
            }
        }
        
        keywordsCache = keywords;
        keywordsCacheTime = Date.now();
        
        return keywords;
    } catch (error) {
        console.error('Error loading priority keywords from database:', error);
        return null;
    }
}

/**
 * Get priority keywords (from cache or database)
 */
async function getKeywords() {
    // Check if cache is valid
    if (keywordsCache && keywordsCacheTime && (Date.now() - keywordsCacheTime < CACHE_DURATION_MS)) {
        return keywordsCache;
    }
    
    // Try to load from database
    const dbKeywords = await loadKeywordsFromDb();
    
    // Fall back to defaults if database fails
    return dbKeywords || DEFAULT_KEYWORDS;
}

/**
 * Normalize text for keyword matching
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Replace special chars with spaces
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .trim();
}

/**
 * Check if a keyword exists in the text
 * Handles multi-word keywords and word boundaries
 */
function keywordMatches(normalizedText, keyword) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    // For multi-word keywords, check if they appear in sequence
    if (normalizedKeyword.includes(' ')) {
        return normalizedText.includes(normalizedKeyword);
    }
    
    // For single words, check word boundaries
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`, 'i');
    return wordBoundaryRegex.test(normalizedText);
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect priority level from complaint/report content
 * @param {Object} data - Object containing fields to analyze
 * @param {string} data.description - Main description/content
 * @param {string} data.complaintType - Type/category of complaint
 * @param {string} data.additionalNotes - Any additional notes
 * @returns {Object} - { priority: string, matchedKeywords: string[] }
 */
async function detectPriority(data) {
    const { description = '', complaintType = '', additionalNotes = '', suspectDescription = '' } = data;
    
    // Combine all text fields for analysis
    const combinedText = [description, complaintType, additionalNotes, suspectDescription]
        .filter(Boolean)
        .join(' ');
    
    const normalizedText = normalizeText(combinedText);
    
    if (!normalizedText) {
        return {
            priority: 'medium',
            matchedKeywords: []
        };
    }
    
    // Get keywords (from cache or DB)
    const keywords = await getKeywords();
    
    const matchedKeywords = [];
    let highestPriority = 'medium'; // Default priority
    let highestPriorityIndex = PRIORITY_ORDER.indexOf('medium');
    
    // Check each priority level starting from highest
    for (const level of PRIORITY_ORDER) {
        const levelKeywords = keywords[level] || [];
        
        for (const keyword of levelKeywords) {
            if (keywordMatches(normalizedText, keyword)) {
                matchedKeywords.push({ keyword, level });
                
                const levelIndex = PRIORITY_ORDER.indexOf(level);
                if (levelIndex < highestPriorityIndex) {
                    highestPriority = level;
                    highestPriorityIndex = levelIndex;
                }
            }
        }
    }
    
    // Extract just the matched keyword strings for storage
    const keywordStrings = matchedKeywords.map(m => m.keyword);
    
    return {
        priority: highestPriority,
        matchedKeywords: keywordStrings
    };
}

/**
 * Get priority badge color for frontend display
 */
function getPriorityColor(priority) {
    const colors = {
        critical: '#dc2626', // Red
        high: '#ea580c',     // Orange  
        medium: '#ca8a04',   // Yellow
        low: '#16a34a'       // Green
    };
    return colors[priority] || colors.medium;
}

/**
 * Get priority display text
 */
function getPriorityDisplayText(priority) {
    const displayText = {
        critical: 'CRITICAL',
        high: 'HIGH',
        medium: 'MEDIUM',
        low: 'LOW'
    };
    return displayText[priority] || 'MEDIUM';
}

/**
 * Get priority icon for frontend
 */
function getPriorityIcon(priority) {
    const icons = {
        critical: '🚨',
        high: '⚠️',
        medium: '📋',
        low: 'ℹ️'
    };
    return icons[priority] || icons.medium;
}

/**
 * Compare two priorities
 * @returns negative if a is higher priority, positive if b is higher, 0 if equal
 */
function comparePriority(a, b) {
    const indexA = PRIORITY_ORDER.indexOf(a) === -1 ? 2 : PRIORITY_ORDER.indexOf(a);
    const indexB = PRIORITY_ORDER.indexOf(b) === -1 ? 2 : PRIORITY_ORDER.indexOf(b);
    return indexA - indexB;
}

/**
 * Check if priority is urgent (critical or high)
 */
function isUrgentPriority(priority) {
    return priority === 'critical' || priority === 'high';
}

/**
 * Refresh keywords cache (can be called manually by admin)
 */
async function refreshKeywordsCache() {
    return await loadKeywordsFromDb();
}

/**
 * Add a new keyword to the database
 */
async function addPriorityKeyword(keyword, priorityLevel, category = null) {
    try {
        await pool.query(
            `INSERT INTO priority_keywords (keyword, priority_level, category) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE priority_level = ?, category = ?, is_active = 1`,
            [keyword.toLowerCase(), priorityLevel, category, priorityLevel, category]
        );
        
        // Refresh cache
        await refreshKeywordsCache();
        
        return { success: true };
    } catch (error) {
        console.error('Error adding priority keyword:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove/deactivate a keyword
 */
async function removePriorityKeyword(keyword) {
    try {
        await pool.query(
            `UPDATE priority_keywords SET is_active = 0 WHERE keyword = ?`,
            [keyword.toLowerCase()]
        );
        
        // Refresh cache
        await refreshKeywordsCache();
        
        return { success: true };
    } catch (error) {
        console.error('Error removing priority keyword:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all active keywords (for admin management)
 */
async function getAllKeywords() {
    try {
        const [rows] = await pool.query(
            `SELECT keyword_id, keyword, priority_level, category, is_active 
             FROM priority_keywords 
             ORDER BY 
                FIELD(priority_level, 'critical', 'high', 'medium', 'low'),
                keyword ASC`
        );
        return rows;
    } catch (error) {
        console.error('Error getting all keywords:', error);
        return [];
    }
}

module.exports = {
    detectPriority,
    getPriorityColor,
    getPriorityDisplayText,
    getPriorityIcon,
    comparePriority,
    isUrgentPriority,
    refreshKeywordsCache,
    addPriorityKeyword,
    removePriorityKeyword,
    getAllKeywords,
    PRIORITY_ORDER,
    DEFAULT_KEYWORDS
};
