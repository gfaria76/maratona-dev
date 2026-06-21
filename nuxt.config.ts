// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-06-18',

  ssr: false,

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    'nuxt-codemirror',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      },
    },
  },

  app: {
    head: {
      title: 'Prova Python Online',
      meta: [
        {
          name: 'description',
          content: 'Sistema de provas de programação Python com autocorreção',
        },
      ],
    },
  },
})
