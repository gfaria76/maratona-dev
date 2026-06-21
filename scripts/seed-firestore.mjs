import { readFile } from 'node:fs/promises'
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function loadDotEnv() {
  try {
    const text = await readFile(new URL('../.env', import.meta.url), 'utf-8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

      const [key, ...valueParts] = trimmed.split('=')
      if (!key || process.env[key]) continue

      const rawValue = valueParts.join('=').trim()
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    }
  } catch {
    // .env is optional when running in CI or with Application Default Credentials.
  }
}

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
}

function clearEmulatorEnv() {
  delete process.env.FIRESTORE_EMULATOR_HOST
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST
}

function initAdmin() {
  if (getApps().length) return

  clearEmulatorEnv()

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID ou NUXT_PUBLIC_FIREBASE_PROJECT_ID deve estar definido.')
  }

  const credential = projectId && clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : applicationDefault()

  console.log(`Seed Firestore remoto: projeto=${projectId}`)
  console.log(`Credencial: ${clientEmail && privateKey ? 'service account do .env' : 'Application Default Credentials'}`)

  initializeApp({
    credential,
    projectId,
  })
}

async function main() {
  await loadDotEnv()
  initAdmin()
  const db = getFirestore()
  const config = JSON.parse(await readFile(new URL('../server/data/config.json', import.meta.url), 'utf-8'))
  const defs = JSON.parse(await readFile(new URL('../server/data/defs.json', import.meta.url), 'utf-8'))
  const date = new Date().toISOString()
  const marathonRef = db.collection('marathons').doc('default')

  await marathonRef.set({
    ...config,
    title: config.titulo,
    slug: 'default',
    active: true,
    created_at: date,
    updated_at: date,
  }, { merge: true })

  await marathonRef.collection('allowedIpRanges').doc('localhost').set({
    label: 'Localhost',
    cidr: '127.0.0.1/32',
    active: true,
    created_by_email: 'system@local',
    created_at: date,
    updated_at: date,
  }, { merge: true })

  for (const questao of defs.questoes || []) {
    const questionRef = marathonRef.collection('questions').doc(String(questao.id))
    const { testes = [], ...questionData } = questao
    await questionRef.set({
      ...questionData,
      active: true,
      updated_at: date,
    }, { merge: true })

    for (const [index, teste] of testes.entries()) {
      await questionRef.collection('tests').doc(String(index + 1)).set({
        ...teste,
        order: index + 1,
        hidden: true,
      }, { merge: true })
    }
  }

  console.log(`Seed concluido: marathons/default com ${defs.questoes?.length || 0} questoes.`)
}

main().catch((error) => {
  if (String(error?.message || '').includes('Could not load the default credentials')) {
    console.error('Nao foi possivel autenticar o Firebase Admin SDK.')
    console.error('Configure FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env, ou rode `gcloud auth application-default login`.')
  } else {
    console.error(error)
  }
  process.exit(1)
})
