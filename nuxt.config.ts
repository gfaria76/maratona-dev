// https://nuxt.com/docs/api/configuration/nuxt-config
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { viteStaticCopy } from "vite-plugin-static-copy";

const PYODIDE_EXCLUDE = [
  "!**/*.{md,html}",
  "!**/*.d.ts",
  "!**/*.whl",
  "!**/pyodide/node_modules",
];

function viteStaticCopyPyodide() {
  const pyodideDir = dirname(fileURLToPath(import.meta.resolve("pyodide")));
  return viteStaticCopy({
    targets: [
      {
        src: [join(pyodideDir, "*").replace(/\\/g, "/"), ...PYODIDE_EXCLUDE],
        dest: "_nuxt",
        rename: { stripBase: true },
      },
    ],
  });
}

export default defineNuxtConfig({
  compatibilityDate: "2026-06-18",

  ssr: false,

  modules: [
    "@nuxt/ui",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/eslint",
    "nuxt-codemirror",
  ],

  css: ["~/assets/css/main.css"],

  vite: {
    optimizeDeps: {
      exclude: ["pyodide"],
    },
    plugins: [viteStaticCopyPyodide()],
    worker: {
      format: "es",
    },
  },

  runtimeConfig: {
    public: {
      firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
      },
    },
  },

  app: {
    head: {
      title: "Prova Python Online",
      meta: [
        {
          name: "description",
          content: "Sistema de provas de programação Python com autocorreção",
        },
      ],
    },
  },
});
