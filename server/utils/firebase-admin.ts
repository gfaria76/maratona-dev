import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

function clearEmulatorEnv() {
  delete process.env.FIRESTORE_EMULATOR_HOST
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST
}

function initAdminApp(): App {
  const existingApp = getApps()[0]
  if (existingApp) return existingApp

  clearEmulatorEnv()

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    })
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  })
}

export function getAdminAuth() {
  return getAuth(initAdminApp())
}

export function getAdminFirestore() {
  return getFirestore(initAdminApp())
}
