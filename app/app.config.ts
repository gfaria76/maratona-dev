export default defineAppConfig({
  ui: {
    colors: {
      primary: "cyan",
      secondary: "sky",
      success: "emerald",
      warning: "amber",
      error: "rose",
      neutral: "zinc",
    },
    icons: {
      loading: "i-lucide-loader-circle",
      close: "i-lucide-x",
      check: "i-lucide-check",
      chevronDown: "i-lucide-chevron-down",
      chevronRight: "i-lucide-chevron-right",
      arrowLeft: "i-lucide-arrow-left",
      arrowRight: "i-lucide-arrow-right",
    },
    button: {
      defaultVariants: {
        size: "md",
      },
    },
    card: {
      slots: {
        root: "rounded-lg border border-muted bg-elevated/80 shadow-sm",
        header: "px-4 py-3 sm:px-5",
        body: "px-4 py-4 sm:px-5",
        footer: "px-4 py-3 sm:px-5",
      },
    },
  },
});
