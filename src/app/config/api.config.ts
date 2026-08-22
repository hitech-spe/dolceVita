/**
 * Configuration for the API endpoints.
 * This class automatically detects if the application is running locally
 * or in production (e.g. Netlify, Firebase) and switches the base URL accordingly,
 * allowing developers to override it manually if needed via localStorage.
 */
export const API_CONFIG = {
  localUrl: 'http://localhost:8080',
  productionUrl: 'https://dolcevita-core.onrender.com',

  /**
   * Retrieves the active API base URL.
   * By default, it automatically resolves:
   * - Localhost / 127.0.0.1 / local IPs -> localUrl
   * - Online domains -> productionUrl
   *
   * You can override this value in your browser console by running:
   * localStorage.setItem('API_BASE_URL', 'your-custom-url')
   * and delete it to restore auto-mode:
   * localStorage.removeItem('API_BASE_URL')
   */
  get baseUrl(): string {
    const override = typeof window !== 'undefined' ? localStorage.getItem('API_BASE_URL') : null;
    if (override) {
      return override;
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
      return isLocal ? this.localUrl : this.productionUrl;
    }

    return this.productionUrl;
  }
};
