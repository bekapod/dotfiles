-- Customize None-ls sources

---@type LazySpec
return {
  "nvimtools/none-ls.nvim",
  opts = function(_, config)
    -- config variable is the default configuration table for the setup function call
    local null_ls = require "null-ls"

    -- Check supported formatters and linters
    -- https://github.com/nvimtools/none-ls.nvim/tree/main/lua/null-ls/builtins/formatting
    -- https://github.com/nvimtools/none-ls.nvim/tree/main/lua/null-ls/builtins/diagnostics
    config.sources = {
      -- Set a formatter
      null_ls.builtins.diagnostics.actionlint,
      null_ls.builtins.diagnostics.ansiblelint,
      null_ls.builtins.diagnostics.checkmake,
      null_ls.builtins.diagnostics.dotenv_linter,
      null_ls.builtins.diagnostics.markdownlint_cli2,
      null_ls.builtins.diagnostics.mypy,
      null_ls.builtins.diagnostics.yamllint,
      null_ls.builtins.formatting.gleam_format,
      null_ls.builtins.formatting.prettier,
      null_ls.builtins.formatting.stylelint,
      null_ls.builtins.formatting.stylua,
    }
    return config -- return final config table
  end,
}
