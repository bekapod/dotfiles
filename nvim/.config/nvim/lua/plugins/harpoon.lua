vim.pack.add {
  'https://github.com/nvim-lua/plenary.nvim',
  { src = 'https://github.com/ThePrimeagen/harpoon', version = 'harpoon2' },
}

vim.keymap.set('n', '<leader>H', function()
  require('harpoon'):list():add()
end, { desc = '[H]arpoon File' })

vim.keymap.set('n', '<leader>h', function()
  local harpoon = require 'harpoon'
  harpoon.ui:toggle_quick_menu(harpoon:list())
end, { desc = '[H]arpoon Quick Menu' })

for i = 1, 5 do
  vim.keymap.set('n', '<leader>' .. i, function()
    require('harpoon'):list():select(i)
  end, { desc = 'Harpoon to File ' .. i })
end
