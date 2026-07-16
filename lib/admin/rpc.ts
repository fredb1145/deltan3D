export function shouldUseAdminFallback(error: { message?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() || '';

  if (!message) {
    return false;
  }

  return (
    message.includes('could not find the function public.admin_') ||
    message.includes('function public.admin_') ||
    message.includes('structure of query does not match function result type') ||
    (message.includes('column') &&
      (message.includes('admin_role') || message.includes('admin_permissions')) &&
      message.includes('does not exist'))
  );
}
