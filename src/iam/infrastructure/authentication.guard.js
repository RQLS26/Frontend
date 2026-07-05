import { useIamStore } from '../application/iam.store.js';

/**
 * Builds the visible tenant context used by protected SPA routes.
 *
 * @param {Object|null} user - Authenticated user projection stored by IAM.
 * @returns {Record<string, string>} Query parameters that identify the active company and user.
 */
const routeContextQueryFromUser = (user) => {
    const query = {};
    if (user?.companyId !== undefined && user.companyId !== null) query.companyId = String(user.companyId);
    if (user?.id !== undefined && user.id !== null) query.userId = String(user.id);
    return query;
};

/**
 * Determines whether the target route already exposes the active tenant context.
 *
 * @param {import('vue-router').RouteLocationNormalized} to - Target route.
 * @param {Record<string, string>} expectedQuery - Query values required for the active session.
 * @returns {boolean} True when every expected context query is already present and current.
 */
const hasCurrentRouteContext = (to, expectedQuery) =>
    Object.entries(expectedQuery).every(([key, value]) => String(to.query[key] ?? '') === value);

/**
 * Returns a navigation redirect that preserves the target route while adding tenant context.
 *
 * @param {import('vue-router').RouteLocationNormalized} to - Target route.
 * @param {Record<string, string>} expectedQuery - Query values required for the active session.
 * @returns {Object} Vue Router navigation target.
 */
const withRouteContext = (to, expectedQuery) => ({
    name: to.name,
    params: to.params,
    query: { ...to.query, ...expectedQuery },
    hash: to.hash,
    replace: true
});

/**
 * IAM route-access guard used by the root Vue Router.
 *
 * @description
 * Keeps authentication and authorization decisions inside the IAM infrastructure boundary
 * instead of embedding session rules directly in `router.js`. The guard distinguishes
 * public IAM routes from authenticated application routes and checks admin-only metadata.
 *
 * @param {import('vue-router').RouteLocationNormalized} to - Target route.
 * @returns {true|Object} `true` when navigation is allowed; otherwise a named-route redirect.
 *
 * @example
 * router.beforeEach((to) => authenticationGuard(to));
 */
export const authenticationGuard = (to) => {
    const store = useIamStore();
    const isPublicRoute = to.path.startsWith('/iam');

    if (!isPublicRoute && !store.isAuthenticated) {
        return { name: 'sign-in' };
    }

    if (isPublicRoute && store.isAuthenticated) {
        return store.hasActiveMembership ? { name: 'home' } : { name: 'invitation-status' };
    }

    if (store.isAuthenticated && !store.hasActiveMembership && to.name !== 'invitation-status') {
        return { name: 'invitation-status' };
    }

    if (store.isAuthenticated && store.hasActiveMembership && to.name === 'invitation-status') {
        return { name: 'home' };
    }

    if (to.meta.requiresAdmin && !store.isAdmin) {
        return { name: 'access-denied' };
    }

    if (!isPublicRoute && store.isAuthenticated) {
        const expectedQuery = routeContextQueryFromUser(store.currentUser);
        if (Object.keys(expectedQuery).length > 0 && !hasCurrentRouteContext(to, expectedQuery)) {
            return withRouteContext(to, expectedQuery);
        }
    }

    return true;
};
