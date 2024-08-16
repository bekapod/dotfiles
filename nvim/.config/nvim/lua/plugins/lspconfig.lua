return {
  "neovim/nvim-lspconfig",
  ---@class PluginLspOpts
  opts = {
    ---@type lspconfig.options
    inlay_hints = { enabled = false },
    servers = {
      ansiblels = {},
      bashls = {},
      cssls = {
        settings = {
          css = {
            lint = {
              unknownAtRules = "ignore",
            },
          },
        },
      },
      golangci_lint_ls = {},
      gopls = {
        settings = {
          gopls = {
            gofumpt = true,
            codelenses = {
              gc_details = false,
              generate = true,
              regenerate_cgo = true,
              run_govulncheck = true,
              test = true,
              tidy = true,
              upgrade_dependency = true,
              vendor = true,
            },
            hints = {
              assignVariableTypes = true,
              compositeLiteralFields = true,
              compositeLiteralTypes = true,
              constantValues = true,
              functionTypeParameters = true,
              parameterNames = true,
              rangeVariableTypes = true,
            },
            analyses = {
              fieldalignment = true,
              nilness = true,
              unusedparams = true,
              unusedvariable = true,
              unusedwrite = true,
              useany = true,
            },
            usePlaceholders = true,
            completeUnimported = true,
            staticcheck = true,
            directoryFilters = { "-.git", "-.vscode", "-.idea", "-.vscode-test", "-node_modules" },
            semanticTokens = true,
          },
        },
      },
      jedi_language_server = {},
      jinja_lsp = {
        filetypes = { "jinja", "htmldjango" },
        root_dir = function(fname)
          local nvim_lsp = require("lspconfig")
          return nvim_lsp.util.find_git_ancestor(fname)
        end,
        init_options = {
          templates = "./templates",
          backend = { "./" },
          lang = "python",
        },
      },
      lua_ls = {},
      svelte = {},
    },
  },
}
