vim.pack.add { 'https://github.com/folke/tokyonight.nvim' }

---@diagnostic disable-next-line: missing-fields
require('tokyonight').setup {}

vim.cmd.colorscheme 'tokyonight-moon'
