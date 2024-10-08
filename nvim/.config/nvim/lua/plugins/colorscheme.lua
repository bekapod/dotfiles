return {
  {
    "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    config = function()
      require("catppuccin").setup({
        flavor = "macchiato",
        integrations = {
          aerial = true,
          fzf = true,
          harpoon = true,
          mason = true,
          neotest = true,
          neotree = true,
          noice = true,
          lsp_trouble = true,
          which_key = true,
        },
      })
    end,
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "catppuccin",
    },
  },
}
