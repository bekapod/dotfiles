return {
  'stevearc/oil.nvim',
  lazy = false,
  dependencies = { 'nvim-tree/nvim-web-devicons' },
  keys = {
    { '-', '<cmd>Oil<CR>', desc = 'File Explorer' },
  },
  opts = {
    default_file_explorer = true,
    view_options = {
      show_hidden = true,
    },
  },
}
