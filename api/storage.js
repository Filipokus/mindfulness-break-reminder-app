// In-memory storage for calendar credentials
// In production, use a proper database (Firestore, PostgreSQL, etc.)
const storage = new Map(); // userId -> { provider -> { email, password, connectedAt } }

export const credentialsStorage = {
  setCredentials(userId, provider, credentials) {
    if (!storage.has(userId)) {
      storage.set(userId, {});
    }
    storage.get(userId)[provider] = credentials;
  },

  getCredentials(userId, providers = null) {
    if (!storage.has(userId)) {
      return {};
    }

    const userCreds = storage.get(userId);
    
    if (providers && Array.isArray(providers)) {
      const filtered = {};
      providers.forEach(p => {
        if (userCreds[p]) {
          filtered[p] = userCreds[p];
        }
      });
      return filtered;
    }

    return userCreds;
  },

  getConnectedCalendars(userId) {
    if (!storage.has(userId)) {
      return [];
    }

    const userCreds = storage.get(userId);
    return Object.entries(userCreds).map(([provider, creds]) => ({
      provider,
      email: creds.email,
      connectedAt: creds.connectedAt,
    }));
  },

  removeCredentials(userId, provider) {
    if (storage.has(userId)) {
      delete storage.get(userId)[provider];
    }
  },

  clearUserData(userId) {
    storage.delete(userId);
  },
};
