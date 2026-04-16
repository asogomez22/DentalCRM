export type StaffMember = {
  id: number;
  name: string;
  email?: string | null;
  role: string;
};

export type StaffSchedule = {
  id: number;
  user_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  location?: string | null;
  is_available: boolean;
  user?: StaffMember;
};

export type StaffScheduleCreatePayload = {
  user_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  location?: string | null;
  is_available: boolean;
};
