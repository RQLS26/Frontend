/**
 * Backend endpoint catalog used by Buildline frontend infrastructure adapters.
 *
 * @module api-endpoints
 * @description
 * Centralizes backend route fragments so endpoint strings are not duplicated across
 * Pinia stores or Vue views. Company-owned operational endpoints are functions because
 * they must resolve the authenticated company at request time.
 *
 * When a backend route changes, update this catalog and the corresponding context adapter.
 * Application stores should continue calling semantic adapter methods such as
 * `getInventoryItems()` or `createQuotation()`.
 *
 * @author RQLS TEAM
 */

import { requireActiveCompanyId } from '../application/company-scope.js';

const productionApiBaseUrl = 'https://buildline-platform.up.railway.app/';
const legacyMockApiHosts = ['buildline-json-server.onrender.com'];

/**
 * Resolves the API host root while protecting production builds from stale mock-server
 * environment variables left over from the frontend sprint.
 *
 * @param {string|undefined} rawBaseUrl - Raw base URL injected by Vite.
 * @returns {string} Production backend URL when the environment value is empty or points to a legacy mock host.
 */
const resolveApiBaseUrl = (rawBaseUrl) => {
    const configuredBaseUrl = rawBaseUrl || productionApiBaseUrl;
    return legacyMockApiHosts.some(host => configuredBaseUrl.includes(host))
        ? productionApiBaseUrl
        : configuredBaseUrl;
};

/**
 * Normalizes API host roots so Axios can safely compose relative endpoint paths.
 *
 * @param {string|undefined} rawBaseUrl - Raw base URL from Vite environment variables.
 * @returns {string} Base URL ending with exactly one slash.
 * @example
 * normalizeApiBaseUrl('https://api.example.com') // 'https://api.example.com/'
 */
export const normalizeApiBaseUrl = (rawBaseUrl) => {
    const baseUrl = resolveApiBaseUrl(rawBaseUrl);
    return `${baseUrl.replace(/\/+$/, '')}/`;
};

/**
 * Runtime backend API host root resolved from Vite environment variables.
 *
 * @type {string}
 * @description Falls back to the Railway production API so production previews remain
 * usable even when the hosting provider does not inject a custom environment value.
 */
export const platformApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

/**
 * Builds a company-scoped operational backend route.
 *
 * @param {string} resource - Company-owned backend resource segment.
 * @returns {string} Versioned route scoped to the active company.
 * @description
 * The backend owns tenancy through `/api/v1/companies/{companyId}/...`. The company id
 * must come from the authenticated IAM session so protected adapters never invent a
 * fallback tenant before session hydration finishes.
 */
const companyEndpoint = (resource) => {
    const companyId = requireActiveCompanyId();
    return `api/v1/companies/${companyId}/${resource}`;
};

/**
 * Backend REST endpoint paths grouped by bounded context.
 *
 * @type {Readonly<Record<string, string|(() => string)>>}
 * @description These values are consumed only by infrastructure adapters. They should
 * not be imported directly by stores or presentation views.
 */
export const apiEndpoints = Object.freeze({
    analyticsBudgets: () => companyEndpoint('budgets'),
    auth: 'api/v1/auth',
    categories: 'api/v1/categories',
    deliveries: () => companyEndpoint('deliveries'),
    incidents: () => companyEndpoint('incidents'),
    inventory: () => companyEndpoint('inventory'),
    materials: () => companyEndpoint('materials'),
    messages: () => companyEndpoint('messages'),
    profiles: 'api/v1/profiles',
    projects: () => companyEndpoint('projects'),
    purchaseOrders: () => companyEndpoint('purchase-orders'),
    quotations: () => companyEndpoint('quotations'),
    requisitions: () => companyEndpoint('requisitions'),
    suppliers: () => companyEndpoint('suppliers'),
    currentUser: 'api/v1/users/me',
    userPassword: 'api/v1/users',
    users: () => companyEndpoint('users'),
});
