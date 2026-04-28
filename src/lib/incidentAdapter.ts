import { initializeApp } from 'firebase/app'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import type { IncidentRecord } from '../types'

export interface IncidentAdapter {
  loadIncidents: () => Promise<IncidentRecord[]>
  saveIncidents: (incidents: IncidentRecord[]) => Promise<void>
  subscribe: (callback: () => void) => () => void
}

const LOCAL_STORAGE_KEY = 'crisischain/incidents/v1'
const LOCAL_UPDATE_EVENT = 'crisischain:updated'

function createLocalAdapter(): IncidentAdapter {
  return {
    async loadIncidents() {
      const payload = localStorage.getItem(LOCAL_STORAGE_KEY)

      if (!payload) {
        return []
      }

      try {
        return JSON.parse(payload) as IncidentRecord[]
      } catch {
        return []
      }
    },
    async saveIncidents(incidents) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(incidents))
      window.dispatchEvent(new CustomEvent(LOCAL_UPDATE_EVENT))
    },
    subscribe(callback) {
      const handler = () => callback()
      window.addEventListener(LOCAL_UPDATE_EVENT, handler)
      return () => window.removeEventListener(LOCAL_UPDATE_EVENT, handler)
    },
  }
}

function hasFirebaseConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID,
  )
}

let firebaseAdapterSingleton: IncidentAdapter | null = null

function createFirebaseAdapter(): IncidentAdapter {
  if (firebaseAdapterSingleton) {
    return firebaseAdapterSingleton
  }

  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })

  const db = getFirestore(app)
  const incidentsCollection = collection(db, 'incidents')

  firebaseAdapterSingleton = {
    async loadIncidents() {
      const snapshot = await getDocs(incidentsCollection)
      return snapshot.docs.map((item) => item.data() as IncidentRecord)
    },
    async saveIncidents(incidents) {
      const snapshot = await getDocs(incidentsCollection)
      const existingIds = new Set(snapshot.docs.map((item) => item.id))
      const nextIds = new Set(incidents.map((item) => item.id))

      await Promise.all(
        incidents.map((incident) => setDoc(doc(incidentsCollection, incident.id), incident)),
      )

      const removals = [...existingIds].filter((id) => !nextIds.has(id))
      await Promise.all(removals.map((id) => deleteDoc(doc(incidentsCollection, id))))
    },
    subscribe(callback) {
      return onSnapshot(incidentsCollection, () => callback())
    },
  }

  return firebaseAdapterSingleton
}

let selectedAdapter: IncidentAdapter | null = null

export function getIncidentAdapter(): IncidentAdapter {
  if (selectedAdapter) {
    return selectedAdapter
  }

  const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true'

  if (useFirebase && hasFirebaseConfig()) {
    selectedAdapter = createFirebaseAdapter()
    return selectedAdapter
  }

  selectedAdapter = createLocalAdapter()
  return selectedAdapter
}
