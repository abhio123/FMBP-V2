// expo-secure-store is native (Keychain / Keystore). Tests use this in-memory stand-in with the same calls, so the
// login is kept between calls as on a phone (src/lib/secureSessionStorage.ts).
const data = new Map();
module.exports = {
  AFTER_FIRST_UNLOCK: 0,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key) => (data.has(key) ? data.get(key) : null),
  setItemAsync: async (key, value) => { data.set(key, value); },
  deleteItemAsync: async (key) => { data.delete(key); },
  isAvailableAsync: async () => true,
};
