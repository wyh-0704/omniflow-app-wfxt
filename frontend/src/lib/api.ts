import axios from 'axios';
import { API_BASE_URL } from '@/config/constants';
import type { ApiResponse, ScheduleRequest, ScheduleResponse } from '@shared/types/api';

export async function requestAiSchedule(payload: ScheduleRequest): Promise<ScheduleResponse> {
  const res = await axios.post<ApiResponse<ScheduleResponse>>(
    `${API_BASE_URL}/api/ai/schedule`,
    payload,
    { timeout: 45000 }
  );
  if (!res.data.success) throw new Error('AI schedule failed');
  return res.data.data;
}
