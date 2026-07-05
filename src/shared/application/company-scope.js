import { getStoredAuthUser } from '../../iam/infrastructure/iam-session.js';

/**
 * Default company identifier used by the seeded Buildline demonstration dataset.
 *
 * @type {number}
 * @description Backend operational records created before tenant scoping do not carry a
 * companyId column. The frontend treats those legacy rows as belonging to Buildline only,
 * so new companies do not inherit admin@buildline.com demo operations.
 */
export const DEFAULT_COMPANY_ID = 1;

/**
 * Reads the active company identifier from the persisted IAM session.
 *
 * @returns {number|null} Current user's company id, or null when unauthenticated.
 */
export const getActiveCompanyId = () => {
    const value = getStoredAuthUser()?.companyId;
    if (value === undefined || value === null) return null;

    const companyId = Number(value);
    return Number.isFinite(companyId) ? companyId : null;
};

/**
 * Resolves the authenticated company identifier required by tenant-scoped APIs.
 *
 * @returns {number} Current user's company id.
 * @throws {Error} When a protected endpoint is requested before IAM session hydration.
 */
export const requireActiveCompanyId = () => {
    const companyId = getActiveCompanyId();
    if (companyId === null) {
        throw new Error('Authenticated company context is required before calling company-scoped endpoints.');
    }
    return companyId;
};

/**
 * Indicates whether the authenticated session belongs to the seeded Buildline company.
 *
 * @returns {boolean} True for the default company or for anonymous pre-authentication screens.
 */
export const isDefaultCompanySession = () => {
    const companyId = getActiveCompanyId();
    return companyId === null || companyId === DEFAULT_COMPANY_ID;
};

/**
 * Filters resources by the current company while protecting new tenants from legacy demo rows.
 *
 * @template T
 * @param {T[]} resources - Backend resources returned by an API endpoint.
 * @returns {T[]} Resources visible to the active company.
 */
export const scopedResources = (resources) => {
    const companyId = getActiveCompanyId();
    if (companyId === null) return resources;
    return resources.filter(resource => {
        if (resource.companyId === undefined || resource.companyId === null) {
            return companyId === DEFAULT_COMPANY_ID;
        }
        return Number(resource.companyId) === companyId;
    });
};

/**
 * Adds the active company id to write payloads sent to backend endpoints.
 *
 * @template T
 * @param {T} resource - Create or update payload produced by a presentation form.
 * @returns {T & {companyId?: number}} Payload enriched with companyId when a company session exists.
 */
export const withCompanyScope = (resource) => {
    const companyId = getActiveCompanyId();
    return companyId === null ? resource : { ...resource, companyId };
};
