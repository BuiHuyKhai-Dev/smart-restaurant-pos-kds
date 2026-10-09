const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
}

export interface RequestOptions extends RequestInit {
  tableToken?: string;
  token?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Chuẩn bị headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // 1. Nếu có token nhân viên truyền vào hoặc lưu trong localStorage
  let staffToken = options.token;
  if (!staffToken && typeof window !== 'undefined') {
    try {
      staffToken = localStorage.getItem('pos_kds_access_token') || undefined;
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }
  if (staffToken && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${staffToken}`;
  }

  // 2. Nếu có token bàn của khách
  if (options.tableToken) {
    headers['x-table-token'] = options.tableToken;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage =
        json.message ||
        json.error ||
        `Lỗi yêu cầu máy chủ (Mã: ${res.status})`;
      const error = new Error(
        Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
      ) as any;
      error.status = res.status;
      error.data = json;
      throw error;
    }

    return json;
  } catch (err: any) {
    // Nếu là network error không tới được server
    if (!err.status && err.message === 'Failed to fetch') {
      err.message = 'Không thể kết nối tới máy chủ Backend (http://localhost:4000). Vui lòng kiểm tra lại dịch vụ!';
    }
    throw err;
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

