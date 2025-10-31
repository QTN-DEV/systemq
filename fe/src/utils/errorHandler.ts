import type { ErrorInfo } from "react";

import { AxiosError } from "axios";
import { config } from "@/lib/config";

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export class GlobalErrorHandler {
  static handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error("Global Error:", error);
    console.error("Error Info:", errorInfo);

    // Here you would typically send to your error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    // For development, log detailed error information
    if (config.isDev) {
      console.group("🔴 Error Details");
      console.error("Error:", error);
      console.error("Stack:", error.stack);
      if (errorInfo) {
        console.error("Component Stack:", errorInfo.componentStack);
      }
      console.groupEnd();
    }
  };

  static handleApiError = (error: AxiosError): AppError => {
    const appError: AppError = new Error();

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      appError.statusCode = status;
      appError.message = this.getErrorMessage(status, data);
      appError.details = data as Record<string, unknown>;

      switch (status) {
        case 400:
          appError.code = "BAD_REQUEST";
          break;
        case 401:
          appError.code = "UNAUTHORIZED";
          break;
        case 403:
          appError.code = "FORBIDDEN";
          break;
        case 404:
          appError.code = "NOT_FOUND";
          break;
        case 409:
          appError.code = "CONFLICT";
          break;
        case 422:
          appError.code = "VALIDATION_ERROR";
          break;
        case 500:
          appError.code = "INTERNAL_SERVER_ERROR";
          break;
        default:
          appError.code = "UNKNOWN_ERROR";
      }
    } else if (error.request) {
      // Request was made but no response received
      appError.code = "NETWORK_ERROR";
      appError.message =
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
    } else {
      // Something else happened
      appError.code = "REQUEST_ERROR";
      appError.message =
        error.message || "Terjadi kesalahan yang tidak diketahui.";
    }

    return appError;
  };

  private static getErrorMessage = (status: number, data: any): string => {
    // Try to extract message from response data
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (data?.error) return data.error;

    // Fallback to status-based messages in Bahasa Indonesia
    switch (status) {
      case 400:
        return "Permintaan tidak valid. Periksa data yang Anda kirim.";
      case 401:
        return "Sesi Anda telah habis. Silakan login kembali.";
      case 403:
        return "Anda tidak memiliki izin untuk mengakses resource ini.";
      case 404:
        return "Data yang diminta tidak ditemukan.";
      case 409:
        return "Konflik data. Resource sudah ada atau sedang digunakan.";
      case 422:
        return "Data yang dikirim tidak valid. Periksa kembali form Anda.";
      case 500:
        return "Terjadi kesalahan di server. Silakan coba lagi nanti.";
      case 503:
        return "Layanan sedang tidak tersedia. Silakan coba lagi nanti.";
      default:
        return "Terjadi kesalahan yang tidak diketahui.";
    }
  };

  static isNetworkError = (error: AppError): boolean => {
    return error.code === "NETWORK_ERROR";
  };

  static isValidationError = (error: AppError): boolean => {
    return error.code === "VALIDATION_ERROR" || error.statusCode === 422;
  };

  static isAuthError = (error: AppError): boolean => {
    return error.code === "UNAUTHORIZED" || error.statusCode === 401;
  };
}