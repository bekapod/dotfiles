return {
  "saghen/blink.cmp",
  opts = {
    sources = {
      -- add lazydev to your completion providers
      default = { "lazydev" },
      providers = {
        lazydev = {
          name = "LazyDev",
          module = "lazydev.integrations.blink",
          score_offset = 100, -- show at a higher priority than lsp
        },
      },
      per_filetype = {
        codecompanion = { "codecompanion" },
      },
    },
  },
}
