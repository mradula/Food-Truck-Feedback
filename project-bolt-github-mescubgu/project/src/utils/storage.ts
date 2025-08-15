// Session storage utilities
export const SESSION_KEY = 'foodtruck_feedback_session';

export const saveSession = (data: any) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
};

export const loadSession = () => {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
};

export const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

// Check available storage
export const checkStorageSpace = (): { available: boolean; spaceLeft: number } => {
  try {
    // Estimate storage usage (simplified)
    const used = JSON.stringify(sessionStorage).length;
    const available = used < (5 * 1024 * 1024); // 5MB limit for session storage
    return { available, spaceLeft: (5 * 1024 * 1024) - used };
  } catch (error) {
    return { available: false, spaceLeft: 0 };
  }
};