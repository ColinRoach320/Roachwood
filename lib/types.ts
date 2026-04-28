/**
 * Database types. Replace this hand-rolled shape with generated types
 * from `supabase gen types typescript --project-id ...` once the schema
 * stabilizes.
 */

export type Role = "admin" | "client";

export type JobStatus =
  | "lead"
  | "active"
  | "quoted"
  | "approved"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  profile_id: string | null;
  company_name: string | null;
  contact_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  start_date: string | null;
  end_date: string | null;
  estimated_value: number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobUpdate {
  id: string;
  job_id: string;
  author_id: string | null;
  body: string;
  visible_to_client: boolean;
  created_at: string;
}

export interface Approval {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  job_id: string | null;
  name: string;
  storage_path: string;
  visible_to_client: boolean;
  uploaded_by: string | null;
  kind: "document" | "photo";
  created_at: string;
}

// ── Phase 1 admin: estimates / invoices / expenses ───────────────────────────

export type EstimateStatus =
  | "draft"
  | "sent"
  | "won"
  | "lost"
  | "no_response";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type ExpenseCategory =
  | "materials"
  | "labor"
  | "subcontractor"
  | "equipment"
  | "other";

/**
 * A single billable line on an estimate or invoice. Stored as a row inside
 * the `line_items` jsonb array on the parent table.
 */
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Estimate {
  id: string;
  job_id: string;
  title: string;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  status: EstimateStatus;
  created_at: string;
}

export interface Invoice {
  id: string;
  job_id: string;
  estimate_id: string | null;
  title: string;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  stripe_payment_link: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  job_id: string;
  category: ExpenseCategory | null;
  vendor: string | null;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

// ── Phase 2 content management ───────────────────────────────────────────────

export type ServiceType = "kitchen" | "cabinetry" | "deck" | "interior" | "other";
export type SocialPlatform = "instagram" | "facebook" | "houzz" | "other";
export type SocialPostStatus = "draft" | "posted";

export interface Testimonial {
  id: string;
  client_name: string;
  location: string | null;
  quote: string;
  star_rating: number;
  project_type: string | null;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  service_type: ServiceType | null;
  storage_path: string;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

export interface SocialPost {
  id: string;
  job_id: string | null;
  platform: SocialPlatform;
  caption: string;
  hashtags: string | null;
  storage_path: string | null;
  status: SocialPostStatus;
  posted_at: string | null;
  created_at: string;
}

export interface SiteSettings {
  id: number;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  tagline: string | null;
  updated_at: string;
}

export interface DesignIdea {
  id: string;
  job_id: string;
  uploaded_by: string | null;
  title: string | null;
  notes: string | null;
  image_url: string | null;
  storage_path: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type ChangeOrderStatus = "draft" | "sent" | "approved" | "declined";

export interface ChangeOrder {
  id: string;
  job_id: string;
  co_number: number;
  title: string;
  description: string | null;
  status: ChangeOrderStatus;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubcontractorTrade =
  | "electrical"
  | "plumbing"
  | "hvac"
  | "framing"
  | "drywall"
  | "painting"
  | "flooring"
  | "roofing"
  | "concrete"
  | "landscaping"
  | "cleaning"
  | "other";

export type SubcontractorRateType = "hourly" | "daily" | "project";

export interface Subcontractor {
  id: string;
  company_name: string | null;
  contact_name: string;
  email: string | null;
  phone: string | null;
  trade: SubcontractorTrade;
  rate_type: SubcontractorRateType | null;
  rate: number | null;
  tax_id: string | null;
  w9_on_file: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorPayment {
  id: string;
  subcontractor_id: string;
  job_id: string | null;
  amount: number;
  date: string;
  description: string | null;
  created_at: string;
}

/**
 * Minimal `Database` type for typed Supabase clients. Tables are typed as
 * `Row`/`Insert`/`Update` of the same shape; tighten when generating types.
 */
export type Database = {
  public: {
    Tables: {
      profiles:      { Row: Profile;     Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      clients:       { Row: Client;      Insert: Partial<Client>  & { contact_name: string }; Update: Partial<Client> };
      jobs:          { Row: Job;         Insert: Partial<Job>     & { client_id: string; title: string }; Update: Partial<Job> };
      job_updates:   { Row: JobUpdate;   Insert: Partial<JobUpdate> & { job_id: string; body: string }; Update: Partial<JobUpdate> };
      approvals:     { Row: Approval;    Insert: Partial<Approval>  & { job_id: string; title: string }; Update: Partial<Approval> };
      documents:     { Row: DocumentRow; Insert: Partial<DocumentRow> & { name: string; storage_path: string }; Update: Partial<DocumentRow> };
      estimates:     { Row: Estimate;    Insert: Partial<Estimate>  & { job_id: string; title: string }; Update: Partial<Estimate> };
      invoices:      { Row: Invoice;     Insert: Partial<Invoice>   & { job_id: string; title: string }; Update: Partial<Invoice> };
      expenses:      { Row: Expense;     Insert: Partial<Expense>   & { job_id: string; amount: number }; Update: Partial<Expense> };
      testimonials:  { Row: Testimonial; Insert: Partial<Testimonial> & { client_name: string; quote: string }; Update: Partial<Testimonial> };
      gallery_photos: { Row: GalleryItem; Insert: Partial<GalleryItem> & { title: string; storage_path: string }; Update: Partial<GalleryItem> };
      design_ideas:   { Row: DesignIdea; Insert: Partial<DesignIdea> & { job_id: string }; Update: Partial<DesignIdea> };
      messages:       { Row: Message;    Insert: Partial<Message>    & { job_id: string; sender_id: string; body: string }; Update: Partial<Message> };
      social_posts:  { Row: SocialPost;  Insert: Partial<SocialPost>  & { platform: SocialPlatform; caption: string }; Update: Partial<SocialPost> };
      site_settings: { Row: SiteSettings; Insert: Partial<SiteSettings>; Update: Partial<SiteSettings> };
      change_orders: { Row: ChangeOrder; Insert: Partial<ChangeOrder> & { job_id: string; title: string }; Update: Partial<ChangeOrder> };
      subcontractors: { Row: Subcontractor; Insert: Partial<Subcontractor> & { contact_name: string; trade: SubcontractorTrade }; Update: Partial<Subcontractor> };
      subcontractor_payments: { Row: SubcontractorPayment; Insert: Partial<SubcontractorPayment> & { subcontractor_id: string; amount: number }; Update: Partial<SubcontractorPayment> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
