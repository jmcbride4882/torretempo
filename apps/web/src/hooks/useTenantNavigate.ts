import { useNavigate, useParams, NavigateOptions } from "react-router-dom";

/**
 * Custom hook that wraps useNavigate to automatically prefix paths with tenant slug.
 * Extracts tenantSlug from URL params and prepends it to all navigation calls.
 *
 * @example
 * const tenantNavigate = useTenantNavigate();
 * tenantNavigate('/dashboard');  // → navigates to /t/demo/dashboard
 * tenantNavigate('/employees', { state: { from: 'dashboard' } });
 * tenantNavigate(-1);  // Go back
 */
export function useTenantNavigate() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  return (to: string | number, options?: NavigateOptions) => {
    // Handle numeric navigation (back/forward)
    if (typeof to === "number") {
      return navigate(to);
    }

    // If tenantSlug exists and path doesn't already include /t/
    if (tenantSlug && !to.startsWith("/t/")) {
      // Absolute path: /dashboard → /t/demo/dashboard
      if (to.startsWith("/")) {
        return navigate(`/t/${tenantSlug}${to}`, options);
      }
      // Relative path: dashboard → /t/demo/dashboard
      return navigate(`/t/${tenantSlug}/${to}`, options);
    }

    // Fallback to regular navigation (no tenantSlug or path already prefixed)
    return navigate(to, options);
  };
}

export default useTenantNavigate;
