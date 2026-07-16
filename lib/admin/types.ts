export type AdminProfileListItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean | null;
  admin_role: string | null;
  admin_permissions: string[] | null;
  current_plan_id: string | null;
  current_plan_name: string | null;
  current_plan_source: 'assigned' | 'default' | 'none' | string | null;
  assigned_plan_id: string | null;
  assigned_plan_name: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
};

export type AdminTourListItem = {
  id: string;
  user_id: string | null;
  owner_full_name: string | null;
  owner_email: string | null;
  title: string | null;
  location: string | null;
  scenes: number | null;
  nodes: unknown;
  created_at: string | null;
};

export type AdminPlanBillingInterval =
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one_time'
  | 'custom';

export type AdminSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type AdminPlanListItem = {
  id: string;
  name: string | null;
  description: string | null;
  price_amount: number | null;
  currency_code: string | null;
  billing_interval: AdminPlanBillingInterval | string | null;
  feature_list: string[] | null;
  tour_limit: number | null;
  scene_limit: number | null;
  storage_limit_mb: number | null;
  share_link_limit: number | null;
  embed_limit: number | null;
  is_active: boolean | null;
  is_visible: boolean | null;
  is_recommended: boolean | null;
  is_archived: boolean | null;
  sort_order: number | null;
  member_count: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalTours: number;
};
