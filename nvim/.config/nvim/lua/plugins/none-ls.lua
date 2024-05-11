return {
  "nvim-tools/none-ls.nvim",
  dependencies = {
    "nvimtools/none-ls-extras.nvim",
  },
  opts = function(_, opts)
    opts.sources = opts.sources or {}
    vim.list_extend(opts.sources, {
      require("none-ls.code_actions.eslint_d"),
      require("none-ls.diagnostics.eslint_d"),
    })
  end,
}
