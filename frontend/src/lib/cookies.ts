// Cookie utility functions for Prompt Builder data persistence

const COOKIE_NAME = 'weblo_prompt_builder_data';
const EXPIRY_HOURS = 1;

export interface ColorScheme {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
}

export interface CookieData {
    businessName: string;
    industry: string;
    description: string;
    email: string;
    pages: string[];
    theme: 'light' | 'dark' | 'auto';
    brandFeel: string;
    colors?: ColorScheme;           // NEW: Custom colors
    useCustomColors?: boolean;      // NEW: Whether to use custom colors
    features: string[];
    selectedPlan: 'starter' | 'business' | 'enterprise';
    paymentDetails?: {
        cardNumber: string;
        expirationDate: string;
        securityCode: string;
        fullName: string;
        country: string;
        addressLine1: string;
        addressLine2: string;
        city: string;
        state: string;
        zipcode: string;
    };
    savedAt: number;
}

/**
 * Save prompt builder data to cookie with 1 hour expiry
 */
export function savePromptBuilderData(data: Partial<CookieData>): void {
    try {
        const cookieData: CookieData = {
            ...data,
            savedAt: Date.now(),
        } as CookieData;

        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(cookieData))}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    } catch (error) {
        console.error('Failed to save prompt builder data:', error);
    }
}

/**
 * Load prompt builder data from cookie
 * Returns null if cookie doesn't exist or is expired
 */
export function loadPromptBuilderData(): CookieData | null {
    try {
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`));

        if (!cookie) return null;

        const value = cookie.split('=')[1];
        const data: CookieData = JSON.parse(decodeURIComponent(value));

        // Check if expired (1 hour = 3600000ms)
        if (Date.now() - data.savedAt > EXPIRY_HOURS * 60 * 60 * 1000) {
            clearPromptBuilderData();
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to load prompt builder data:', error);
        return null;
    }
}

/**
 * Clear prompt builder data from cookie
 */
export function clearPromptBuilderData(): void {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
