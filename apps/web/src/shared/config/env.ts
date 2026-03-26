type PublicEnv = {
  VITE_API_BASE_URL?: string;
};

const rawEnv = __APP_ENV__ as PublicEnv;
const apiBaseUrl = rawEnv.VITE_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  throw new Error("Missing required env: VITE_API_BASE_URL");
}

export const env = Object.freeze({
  apiBaseUrl
});
