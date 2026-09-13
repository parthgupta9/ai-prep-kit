const API_BASE_URL = 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('trao_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function registerUser(email: string, password: string, name?: string) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user profile');
  return data.user;
}

export async function createKit(params: { jd: string; company_url: string; days: number; batch?: any[] }) {
  const res = await fetch(`${API_BASE_URL}/kits`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kit generation failed');
  return data;
}

export async function getUserKits() {
  const res = await fetch(`${API_BASE_URL}/kits`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch kits');
  return data.kits;
}

export async function getKitById(id: string) {
  const res = await fetch(`${API_BASE_URL}/kits/${id}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kit not found');
  return data;
}

export async function updateKit(id: string, kitData: any, practiceState?: any) {
  const res = await fetch(`${API_BASE_URL}/kits/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ kitData, practiceState })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save kit');
  return data;
}

export async function regenerateKitSection(id: string, section: string, categoryName?: string) {
  const res = await fetch(`${API_BASE_URL}/kits/${id}/regenerate-section`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ section, categoryName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to regenerate section');
  return data;
}

export async function runMockInterview(id: string, questionId: string, userAnswer: string) {
  const res = await fetch(`${API_BASE_URL}/kits/${id}/mock-interview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ questionId, userAnswer })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to evaluate interview response');
  return data;
}
