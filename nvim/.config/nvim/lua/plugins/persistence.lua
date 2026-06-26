vim.pack.add { 'https://github.com/folke/persistence.nvim' }

require('persistence').setup {}

vim.keymap.set('n', '<leader>ps', function()
  require('persistence').load()
end, { desc = 'Restore Session' })
vim.keymap.set('n', '<leader>pS', function()
  require('persistence').select()
end, { desc = 'Select Session' })
vim.keymap.set('n', '<leader>pl', function()
  require('persistence').load { last = true }
end, { desc = 'Restore Last Session' })
vim.keymap.set('n', '<leader>pd', function()
  require('persistence').stop()
end, { desc = "Don't Save Current Session" })
