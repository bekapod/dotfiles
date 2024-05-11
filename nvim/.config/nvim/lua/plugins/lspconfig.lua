return {
  "neovim/nvim-lspconfig",
  ---@class PluginLspOpts
  opts = {
    ---@type lspconfig.options
    servers = {
      ansiblels = {},
      bashls = {},
      cssls = {},
      jedi_language_server = {},
      lua_ls = {},
      snyk_ls = {},
      svelte = {},
      tailwindcss = {},
      tsserver = {
        filetypes = {
          "javascript",
          "typescript",
          "vue",
        },
        init_options = {
          plugins = {
            {
              name = "@vue/typescript-plugin",
              location = "/Users/becky/.nvm/versions/node/v20.13.1/lib/node_modules/@vue/typescript-plugin",
              languages = { "javascript", "typescript", "vue" },
            },
          },
        },
      },
      volar = {},
    },
  },
}
