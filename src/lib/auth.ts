
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  roles: string[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  user: T;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || "Unable to communicate with the server.",
      response.status
    );
  }

  return data as T;
}

export async function loginApi(
  email: string,
  password: string
): Promise<AuthenticatedUser> {
  const result = await apiRequest<ApiResponse<AuthenticatedUser>>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password })
    }
  );

  return result.user;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const result = await apiRequest<ApiResponse<AuthenticatedUser>>(
      "/auth/me"
    );

    return result.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function logoutApi(): Promise<void> {
  await apiRequest("/auth/logout", {
    method: "POST"
  });
}
