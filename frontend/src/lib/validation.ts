// Validation utility functions for Prompt Builder

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Count words in a string
 */
export function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate business name (at least 2 characters)
 */
export function isValidBusinessName(name: string): boolean {
    return name.trim().length >= 2;
}

/**
 * Validate description has minimum word count
 */
export function isValidDescription(description: string, minWords = 150): boolean {
    return countWords(description) <= minWords;
}

/**
 * Get validation errors for Step 1 (Business)
 */
export interface Step1ValidationErrors {
    businessName?: string;
    industry?: string;
    description?: string;
    email?: string;
}

export function validateStep1(data: {
    businessName: string;
    industry: string;
    description: string;
    email: string;
}): Step1ValidationErrors {
    const errors: Step1ValidationErrors = {};

    if (!data.businessName.trim()) {
        errors.businessName = 'Business name is required';
    } else if (!isValidBusinessName(data.businessName)) {
        errors.businessName = 'Business name must be at least 2 characters';
    }

    if (!data.industry) {
        errors.industry = 'Please select an industry';
    }

    const wordCount = countWords(data.description);
    if (!data.description.trim()) {
        errors.description = 'Description is required';
    } else if (wordCount > 150) {
        errors.description = `Description must be at least 150 words (currently ${wordCount} words)`;
    }

    if (!data.email.trim()) {
        errors.email = 'Email is required';
    } else if (!isValidEmail(data.email)) {
        errors.email = 'Please enter a valid email address';
    }

    return errors;
}
