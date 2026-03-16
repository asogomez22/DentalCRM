export type ReportsSummary = {
  executive: {
    mrr_cents: number;
    arr_cents: number;
    patients_retained_last_180_days: number;
    ltv_cents: number;
    occupancy_percent: number;
    collection_rate_percent: number;
    nps: number;
    no_show_rate_percent: number;
  };
  operational: {
    appointments_today: number;
    pending_confirmations: number;
    production_by_dentist: Array<{
      dentist_name: string;
      appointments_count: number;
      revenue_cents: number;
    }>;
    monthly_new_patients_by_source: Array<{
      source: string;
      total: number;
    }>;
    treatments: Array<{
      treatment_name: string;
      appointments_count: number;
      revenue_cents: number;
    }>;
    communications: {
      sent: number;
      received: number;
      opened: number;
      failed: number;
    };
    low_stock_items: number;
  };
  financial: {
    payments_this_month_cents: number;
    overdue_invoices: Array<{
      id: number;
      number: string;
      due_at?: string | null;
      total_cents: number;
      paid_cents: number;
    }>;
    quarter_projection_cents: number;
  };
  benchmarks: {
    no_show_sector_avg_percent: number;
    retention_top_decile_percent: number;
    avg_treatment_price_percentile: number;
  };
};
