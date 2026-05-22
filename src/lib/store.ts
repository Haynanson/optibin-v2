import { useState, useEffect, useCallback } from 'react'
import type { Point, SEIResult, SEIConfig, Client, Policy, Feedback } from '../types'
import { DEFAULT_SEI_CONFIG } from '../types'
import { CLIENTS, POLICIES } from '../data/constants'

interface AppState {
  pointsData: Point[]
  seiResults: SEIResult[]
  config: SEIConfig
  clients: Client[]
  policies: Policy[]
  feedbackList: Feedback[]
  projectInfo: {
    name: string
    region: string
    manager: string
    initialized: boolean
  }
}

const initialState: AppState = {
  pointsData: [],
  seiResults: [],
  config: DEFAULT_SEI_CONFIG,
  clients: CLIENTS,
  policies: POLICIES,
  feedbackList: [],
  projectInfo: {
    name: '',
    region: '',
    manager: '',
    initialized: false,
  },
}

let state = { ...initialState }
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function getState(): AppState {
  return state
}

export function setState(updates: Partial<AppState>) {
  state = { ...state, ...updates }
  notify()
}

export function resetState() {
  state = { ...initialState }
  notify()
}

export function useStore(): AppState {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return state
}

export function usePoints() {
  const { pointsData } = useStore()
  return pointsData
}

export function useSEIResults() {
  const { seiResults } = useStore()
  return seiResults
}

export function useClients() {
  const { clients } = useStore()
  const addClient = useCallback((client: Client) => {
    setState({ clients: [client, ...state.clients] })
  }, [])
  return { clients, addClient }
}
