import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveStaffLogin,
  type StaffCheckPayload,
  type StaffLoginPayload,
} from './session';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly extra?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Tempo esgotado. Verifique sua conexão e tente novamente.';
  }
  return 'Não foi possível conectar ao servidor. Tente novamente.';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  token?: string;
  timeoutMs?: number;
}

const RETRY_DELAYS_MS = [250, 800];

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await requestOnce<T>(path, opts);
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return await requestOnce<T>(path, opts);
}

async function requestOnce<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? API_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    let body: BodyInit | undefined;

    if (opts.formData !== undefined) {
      body = opts.formData;
    } else if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    }

    if (opts.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? (body !== undefined ? 'POST' : 'GET'),
      headers,
      body,
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => null)) as {
      detail?: string;
      code?: string;
      extra?: Record<string, unknown>;
    } | null;

    if (!res.ok) {
      throw new ApiError(
        data?.detail ?? `Erro ${res.status}`,
        res.status,
        data?.code,
        data?.extra,
      );
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

let refreshPromise: Promise<StaffLoginPayload> | null = null;

async function refreshAuthTokens(): Promise<StaffLoginPayload> {
  if (!refreshPromise) {
    const refresh = getRefreshToken();
    if (!refresh) {
      clearSession();
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }

    refreshPromise = request<StaffLoginPayload>('/api/v1/staff/auth/refresh', {
      method: 'POST',
      json: { refresh_token: refresh },
    })
      .then((tokens) => {
        saveStaffLogin(tokens);
        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function requestAuth<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError('Não autenticado. Faça login para continuar.', 401);

  try {
    return await request<T>(path, { ...opts, token });
  } catch (error: unknown) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try {
      const refreshed = await refreshAuthTokens();
      return await request<T>(path, { ...opts, token: refreshed.access_token });
    } catch {
      clearSession();
      throw new ApiError('Sessão expirada. Faça login novamente.', 401);
    }
  }
}

/* =========================================================================
 * 1. AUTENTICAÇÃO STAFF (/api/v1/staff/auth)
 * ========================================================================= */

export function checkStaff(payload: {
  cpf?: string;
  phone?: string;
  external_id?: string;
  preferred_channel?: string;
}): Promise<StaffCheckPayload> {
  return request<StaffCheckPayload>('/api/v1/staff/auth/check', {
    method: 'POST',
    json: payload,
  });
}

export function loginStaff(payload: {
  external_id: string;
  otp: string;
}): Promise<StaffLoginPayload> {
  return request<StaffLoginPayload>('/api/v1/staff/auth/login', {
    method: 'POST',
    json: payload,
  });
}

export function loginStaffPassword(payload: {
  identifier: string;
  password: string;
}): Promise<StaffLoginPayload> {
  return request<StaffLoginPayload>('/api/v1/staff/auth/login-password', {
    method: 'POST',
    json: payload,
  });
}

/* =========================================================================
 * 2. SISTEMA, STATUS & LOGS (/api/v1/staff/system, logs)
 * ========================================================================= */

export interface SystemStatusOut {
  server_time: string;
  database: string;
  version?: string;
  cache_connected?: boolean;
  services?: Record<string, string>;
}

export function getSystemStatus(): Promise<SystemStatusOut> {
  return requestAuth<SystemStatusOut>('/api/v1/staff/system');
}

export interface IntegrationStatusOut {
  name: string;
  is_healthy: boolean;
  last_checked_at?: string;
  details?: Record<string, unknown>;
}

export function getIntegrations(): Promise<IntegrationStatusOut[]> {
  return requestAuth<IntegrationStatusOut[]>('/api/v1/staff/integrations');
}

/* =========================================================================
 * 3. POLOS & COORDENADORES (/api/v1/staff/hubs, coordinators, promoters, network)
 * ========================================================================= */

export interface HubAddressOut {
  cep?: string | null;
  zipcode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface HubOut {
  external_id: string;
  brand: string;
  coordinator_external_id: string | null;
  coordinator_name: string | null;
  is_default: boolean;
  address: HubAddressOut | null;
}

export interface HubCreateIn {
  brand: string;
  coordinator_external_id: string;
  address_id?: number | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  is_default?: boolean;
}

export interface PromoterOut {
  external_id: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
}

export interface CoordinatorHubOut {
  external_id: string;
  brand: string;
  is_default: boolean;
  zipcode?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  promoters_count: number;
  students_count: number;
}

export interface CoordinatorOut {
  external_id: string;
  name: string | null;
  cpf: string | null;
  phone: string | null;
  hubs: CoordinatorHubOut[];
  hubs_count: number;
  promoters_count: number;
  students_count: number;
  total_commission: string;
  pending_commission: string;
}

export interface NetworkTreeCoordinatorOut {
  user_external_id?: string | null;
  name: string;
  phone?: string | null;
}

export interface NetworkTreeMetricsOut {
  total_promoters: number;
  total_leads: number;
  total_paid: number;
  conversion_rate: number;
}

export interface NetworkTreePromoterOut {
  external_id: string;
  user_external_id?: string | null;
  name: string;
  phone?: string | null;
  status: string;
  leads_count: number;
  paid_count: number;
  students_count: number;
  conversion_rate: number;
}

export interface NetworkTreeHubOut {
  hub_external_id: string;
  brand: string;
  is_default: boolean;
  coordinator: NetworkTreeCoordinatorOut;
  metrics: NetworkTreeMetricsOut;
  promoters: NetworkTreePromoterOut[];
}

export function listHubs(): Promise<HubOut[]> {
  return requestAuth<HubOut[]>('/api/v1/staff/hubs');
}

export function createHub(payload: HubCreateIn): Promise<HubOut> {
  return requestAuth<HubOut>('/api/v1/staff/hubs', {
    method: 'POST',
    json: payload,
  });
}

export function listPromoters(): Promise<PromoterOut[]> {
  return requestAuth<PromoterOut[]>('/api/v1/staff/promoters');
}

export function setCoordinator(hubExternalId: string, coordinatorExternalId: string): Promise<HubOut> {
  return requestAuth<HubOut>(`/api/v1/staff/hubs/${encodeURIComponent(hubExternalId)}/coordinator`, {
    method: 'PUT',
    json: { coordinator_external_id: coordinatorExternalId },
  });
}

export function setDefaultHub(hubExternalId: string): Promise<HubOut> {
  return requestAuth<HubOut>(`/api/v1/staff/hubs/${encodeURIComponent(hubExternalId)}/default`, {
    method: 'PUT',
  });
}

export function setHubAddress(
  hubExternalId: string,
  payload: {
    cep: string;
    number?: string | null;
    complement?: string | null;
    street?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  },
): Promise<HubOut> {
  return requestAuth<HubOut>(`/api/v1/staff/hubs/${encodeURIComponent(hubExternalId)}/address`, {
    method: 'PATCH',
    json: payload,
  });
}

export function listCoordinators(): Promise<CoordinatorOut[]> {
  return requestAuth<CoordinatorOut[]>('/api/v1/staff/coordinators');
}

export function getNetworkTree(hubExternalId?: string): Promise<NetworkTreeHubOut[]> {
  const query = hubExternalId ? `?hub=${encodeURIComponent(hubExternalId)}` : '';
  return requestAuth<NetworkTreeHubOut[]>(`/api/v1/staff/network/tree${query}`);
}

/* =========================================================================
 * 4. DOCUMENTOS & DOSSIÊS (/api/v1/staff/documents)
 * ========================================================================= */

export interface DocumentReviewOut {
  external_id: string;
  user_external_id: string;
  user_name: string;
  cpf: string;
  doc_type: string;
  uploaded_at: string;
  ai_verdict?: string;
  validation_status: 'pending' | 'review' | 'approved' | 'rejected';
}

export function listDocumentReviews(): Promise<DocumentReviewOut[]> {
  return requestAuth<DocumentReviewOut[]>('/api/v1/staff/documents/reviews');
}

/* =========================================================================
 * 5. GESTÃO FINANCEIRA (/api/v1/staff/finance)
 * ========================================================================= */

export interface FinanceBalanceOut {
  balance: number;
  available_balance?: number;
  blocked_balance?: number;
}

export function getFinanceBalance(): Promise<FinanceBalanceOut> {
  return requestAuth<FinanceBalanceOut>('/api/v1/staff/finance/balance');
}

export interface FinanceSummaryOut {
  pending_commissions_cents: number;
  paid_commissions_cents: number;
  payout_queue_cents: number;
  total_payouts_cents: number;
}

export function getFinanceSummary(): Promise<FinanceSummaryOut> {
  return requestAuth<FinanceSummaryOut>('/api/v1/staff/finance/summary');
}

export interface StaffCommissionOut {
  external_id: string;
  beneficiary_name: string;
  amount_cents: number;
  status: string;
  created_at: string;
  hub_name?: string;
}

export function listCommissions(status?: string): Promise<StaffCommissionOut[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return requestAuth<StaffCommissionOut[]>(`/api/v1/staff/finance/commissions${query}`);
}

/* =========================================================================
 * 6. USUÁRIOS & ROLES (/api/v1/staff/users, leads, students)
 * ========================================================================= */

export interface StaffUserOut {
  external_id: string;
  name: string | null;
  cpf: string | null;
  phone: string | null;
  is_superuser: boolean;
  roles: string[];
}

export function listUsers(role?: string, limit: number = 200): Promise<StaffUserOut[]> {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (limit) params.set('limit', String(limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return requestAuth<StaffUserOut[]>(`/api/v1/staff/users${query}`);
}

export function changeUserPhone(external_id: string, phone: string): Promise<{ external_id: string; phone: string }> {
  return requestAuth<{ external_id: string; phone: string }>(`/api/v1/staff/users/${encodeURIComponent(external_id)}/phone`, {
    method: 'PUT',
    json: { phone },
  });
}

export interface StaffLeadOut {
  external_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: string;
  created_at: string;
  amount?: string;
}

export function listLeads(): Promise<StaffLeadOut[]> {
  return requestAuth<StaffLeadOut[]>('/api/v1/staff/leads');
}

export interface StaffStudentOut {
  external_id: string;
  name: string | null;
  cpf: string | null;
  phone: string;
  status: string;
  hub_name?: string | null;
  platform_assigned?: boolean;
}

export function listStudents(): Promise<StaffStudentOut[]> {
  return requestAuth<StaffStudentOut[]>('/api/v1/staff/students');
}

/* =========================================================================
 * 7. TREINAMENTO, MATERIAIS & SUBMISSÕES (/api/v1/staff/training, materials)
 * ========================================================================= */

export interface StaffMaterialOut {
  external_id: string;
  title: string;
  text_content: string;
  content_blocks: Array<Record<string, unknown>>;
  question: string;
  expected_answer?: string | null;
  video?: string | null;
  photo?: string | null;
  kind: 'fixed' | 'transitory';
  blocking: boolean;
  ephemeral: boolean;
  order: number;
  active: boolean;
}

export interface MaterialIn {
  title: string;
  question: string;
  expected_answer: string;
  text_content?: string;
  content_blocks?: Array<Record<string, unknown>>;
  order?: number;
  kind?: 'fixed' | 'transitory';
  blocking?: boolean;
  ephemeral?: boolean;
  video?: string | null;
  photo?: string | null;
}

export interface TrainingSubmissionOut {
  external_id: string;
  user_external_id: string;
  user_name: string;
  user_phone?: string | null;
  material_title: string;
  material_question: string;
  material_expected: string;
  answer: string;
  audio_url?: string | null;
  grade?: string | null;
  justification?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function listMaterials(): Promise<StaffMaterialOut[]> {
  return requestAuth<StaffMaterialOut[]>('/api/v1/staff/training/materials');
}

export function createMaterial(payload: MaterialIn): Promise<StaffMaterialOut> {
  return requestAuth<StaffMaterialOut>('/api/v1/staff/training/materials', {
    method: 'POST',
    json: payload,
  });
}

export function updateMaterial(
  externalId: string,
  payload: Partial<MaterialIn> & { active?: boolean },
): Promise<StaffMaterialOut> {
  return requestAuth<StaffMaterialOut>(`/api/v1/staff/training/materials/${encodeURIComponent(externalId)}`, {
    method: 'PUT',
    json: payload,
  });
}

export function publishMaterial(externalId: string): Promise<{ external_id: string; assigned: number }> {
  return requestAuth<{ external_id: string; assigned: number }>(
    `/api/v1/staff/training/materials/${encodeURIComponent(externalId)}/publish`,
    {
      method: 'POST',
    },
  );
}

export function deleteMaterial(externalId: string): Promise<{ deleted: string }> {
  return requestAuth<{ deleted: string }>(`/api/v1/staff/training/materials/${encodeURIComponent(externalId)}`, {
    method: 'DELETE',
  });
}

export function uploadMaterialVideo(externalId: string, file: File): Promise<StaffMaterialOut> {
  const formData = new FormData();
  formData.append('file', file);
  return requestAuth<StaffMaterialOut>(`/api/v1/staff/training/materials/${encodeURIComponent(externalId)}/video`, {
    method: 'POST',
    formData,
  });
}

export function listTrainingSubmissions(status?: string, materialId?: string): Promise<TrainingSubmissionOut[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (materialId) params.set('material_id', materialId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return requestAuth<TrainingSubmissionOut[]>(`/api/v1/staff/training/submissions${query}`);
}

export function overrideTrainingSubmission(
  submissionId: string,
  payload: { grade: string; approve: boolean; justification?: string },
): Promise<{ detail: string; status: string }> {
  return requestAuth<{ detail: string; status: string }>(
    `/api/v1/staff/training/submissions/${encodeURIComponent(submissionId)}/override`,
    {
      method: 'POST',
      json: payload,
    },
  );
}

export function unlockPromoterTraining(promoterExternalId: string): Promise<{ detail: string }> {
  return requestAuth<{ detail: string }>(
    `/api/v1/staff/training/promoters/${encodeURIComponent(promoterExternalId)}/unlock`,
    {
      method: 'POST',
    },
  );
}
