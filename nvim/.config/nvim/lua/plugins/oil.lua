vim.pack.add { 'https://github.com/stevearc/oil.nvim' }

require('oil').setup {
  default_file_explorer = true,
  view_options = {
    show_hidden = true,
  },
}

vim.keymap.set('n', '-', '<cmd>Oil<CR>', { desc = 'File Explorer' })
