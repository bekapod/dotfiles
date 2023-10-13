return {
  -- You can also add new plugins here as well:
  -- Add plugins, the lazy syntax
  -- "andweeb/presence.nvim",
  -- {
  --   "ray-x/lsp_signature.nvim",
  --   event = "BufRead",
  --   config = function()
  --     require("lsp_signature").setup()
  --   end,
  -- },
  {
    "Mofiqul/dracula.nvim",
    lazy = false,
    config = function() end,
  },
  {
    "rose-pine/neovim",
    lazy = false,
    config = function() require("rose-pine").setup { variant = "moon" } end,
  },
}
