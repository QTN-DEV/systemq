import { config as appConfig } from "@/lib/config";
import { GlobalErrorHandler } from "@/utils/errorHandler";
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

// Extend Axios config to include metadata
declare module "axios" {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private axios: AxiosInstance;
  private retries: number;
  private retryDelay: number;

  constructor(config: ApiConfig) {
    this.retries = config.retries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 10000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add timestamp for request tracking
        config.metadata = { startTime: Date.now() };

        if (appConfig.isDev) {
          console.log(
            `🚀 ${config.method?.toUpperCase()} ${config.url}`,
            config.data ? { data: config.data } : ""
          );
        }

        return config;
      },
      (error) => {
        return Promise.reject(GlobalErrorHandler.handleApiError(error));
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        const duration =
          Date.now() - (response.config.metadata?.startTime || 0);

        if (appConfig.isDev) {
          console.log(
            `✅ ${response.config.method?.toUpperCase()} ${
              response.config.url
            } (${duration}ms)`,
            { status: response.status, data: response.data }
          );
        }

        return response;
      },
      async (error) => {
        const appError = GlobalErrorHandler.handleApiError(error);

        // Implement retry logic for network errors and 5xx errors
        if (
          this.shouldRetry(error) &&
          error.config &&
          !error.config.__retryCount
        ) {
          return this.retryRequest(error.config);
        }

        return Promise.reject(appError);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    return (
      !error.response || // Network error
      (error.response.status >= 500 && error.response.status <= 599) // Server error
    );
  }

  private async retryRequest(config: any): Promise<AxiosResponse> {
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= this.retries) {
      throw config;
    }

    config.__retryCount += 1;

    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, config.__retryCount - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));

    return this.axios(config);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.get<T>(url, config);

    return response.data;
  }

  async getRaw<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return await this.axios.get<T>(url, config);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.post<T>(url, data, config);

    return response.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.put<T>(url, data, config);

    return response.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.patch<T>(url, data, config);

    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.delete<T>(url, config);

    return response.data;
  }

  // File upload method
  async uploadFile<T>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const formData = new FormData();

    formData.append("file", file);

    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    if (onUploadProgress) {
      config.onUploadProgress = onUploadProgress;
    }

    const response = await this.axios.post<T>(url, formData, config);

    return response.data;
  }

  // Add authorization header
  setAuthHeader(token: string) {
    this.axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  // Remove authorization header
  removeAuthHeader() {
    delete this.axios.defaults.headers.common["Authorization"];
  }

  // Set custom header
  setCustomHeader(key: string, value: string) {
    this.axios.defaults.headers.common[key] = value;
  }

  // Remove custom header
  removeCustomHeader(key: string) {
    delete this.axios.defaults.headers.common[key];
  }
}

// Default API client instance
const apiClient = new ApiClient({
  baseURL: appConfig.apiBaseUrl,
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});

export default apiClient;
