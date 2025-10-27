import { apiClient } from "@/lib/apiClient";

// Dashboard statistics interface
export interface DashboardStats {
  total_batches: number;
  open_batches: number;
  submitted_batches: number;
  approved_batches: number;
  rejected_batches: number;
  total_records: number;
  today_batches: number;
}

// Recent batch interface
export interface RecentBatch {
  batch_number: string;
  request_type: string;
  total_record: number;
  date_created: string;
  batch_status: string;
}

// Fetch dashboard statistics
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const result = await apiClient<{ data: DashboardStats }>('/dashboard/stats', {
      method: 'GET',
    });
    return result.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Fetch recent batches
export const fetchRecentBatches = async (limit: number = 5): Promise<RecentBatch[]> => {
  try {
    const result = await apiClient<{ data: RecentBatch[] }>(`/dashboard/recent-batches?limit=${limit}`, {
      method: 'GET',
    });
    return result.data;
  } catch (error) {
    console.error('Error fetching recent batches:', error);
    throw error;
  }
};
