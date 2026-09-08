export interface House {
  id: string
  name: string
  invite_code: string
  max_members: number
  created_by: string
  created_at: string
}

export interface HouseMember {
  id: string
  house_id: string
  user_id: string
  display_name: string
  joined_at: string
}

export interface Bill {
  id: string
  house_id: string
  name: string
  month: string
  total_amount: number
  created_by: string
  created_at: string
}

export interface BillPayment {
  id: string
  bill_id: string
  user_id: string
  amount: number
  paid: boolean
  paid_at: string | null
}

export interface HouseRule {
  id: string
  house_id: string
  text: string
  proposed_by: string
  status: 'pending' | 'approved' | 'rejected'
  votes_approve: string[]
  votes_reject: string[]
  created_at: string
}

export interface Chore {
  id: string
  house_id: string
  name: string
  duration_minutes: number
  chore_type: 'individual' | 'group' | 'recurring'
  week_start: string          // used as the specific chore date (YYYY-MM-DD)
  frequency_days: number      // 0 = one-time, 1 = daily, 7 = weekly, etc.
  is_template: boolean        // true = recurring template
  template_id: string | null  // instance's parent template
  is_active: boolean          // false = paused, no new instances generated
  assigned_to: string | null
  completed: boolean
  completed_at: string | null
  created_by: string
  created_at: string
}
