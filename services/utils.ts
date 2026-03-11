
/**
 * Normalizes Arabic text for comparison
 * Removes diacritics, normalizes Alef forms, etc.
 */
export const normalizeArabic = (text: string): string => {
    if (!text) return '';
    let normalized = text.trim();
    
    // Remove diacritics (Tashkeel)
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
    
    // Normalize Alef
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    
    // Normalize Yeh/Alef Maqsura
    normalized = normalized.replace(/[ى]/g, 'ي');
    
    // Normalize Teh Marbuta (often confused with Heh)
    normalized = normalized.replace(/ة/g, 'ه');
    
    // Remove Tatweel
    normalized = normalized.replace(/ـ/g, '');
    
    return normalized.toLowerCase(); // For English names if mixed
};

/**
 * Calculates Levenshtein distance between two strings
 */
export const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Calculates similarity percentage (0 to 1)
 */
export const calculateSimilarity = (s1: string, s2: string): number => {
    const norm1 = normalizeArabic(s1);
    const norm2 = normalizeArabic(s2);
    
    if (norm1 === norm2) return 1;
    
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(norm1, norm2);
    return (longer.length - distance) / longer.length;
};
