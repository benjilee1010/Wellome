import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { type House, type HouseMember } from '../lib/types'
import { useAuth } from './AuthContext'

interface HouseContextType {
  house: House | null
  members: HouseMember[]
  myMember: HouseMember | null
  loading: boolean
  refresh: () => void
}

const HouseContext = createContext<HouseContextType>({
  house: null,
  members: [],
  myMember: null,
  loading: true,
  refresh: () => {},
})

export function HouseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [house, setHouse] = useState<House | null>(null)
  const [members, setMembers] = useState<HouseMember[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!user) {
      setHouse(null)
      setMembers([])
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      const { data: memberRow } = await supabase
        .from('house_members')
        .select('*, houses(*)')
        .eq('user_id', user!.id)
        .single()

      if (memberRow) {
        setHouse(memberRow.houses as House)
        const { data: allMembers } = await supabase
          .from('house_members')
          .select('*')
          .eq('house_id', memberRow.house_id)
        setMembers(allMembers ?? [])
      } else {
        setHouse(null)
        setMembers([])
      }
      setLoading(false)
    }

    load()
  }, [user, tick])

  const myMember = members.find(m => m.user_id === user?.id) ?? null

  return (
    <HouseContext.Provider value={{ house, members, myMember, loading, refresh: () => setTick(t => t + 1) }}>
      {children}
    </HouseContext.Provider>
  )
}

export const useHouse = () => useContext(HouseContext)
