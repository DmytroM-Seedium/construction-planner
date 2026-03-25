const TOKEN_KEY = "cp_token";
const USER_ID_KEY = "cp_user_id";

export const sessionStorageApi = {
  setSession(token: string, userId: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_ID_KEY, userId);
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUserId() {
    return localStorage.getItem(USER_ID_KEY);
  }
};
