vim.loader.enable()

vim.g.mapleader = ' '
vim.g.maplocalleader = ' '
vim.g.have_nerd_font = true
vim.o.number = true
-- vim.o.relativenumber = true
vim.o.mouse = 'a'
vim.o.showmode = false
vim.schedule(function()
  vim.o.clipboard = 'unnamedplus'
end)
vim.o.breakindent = true
vim.o.undofile = true
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.signcolumn = 'yes'
vim.o.updatetime = 250
vim.o.timeoutlen = 300
vim.o.splitright = true
vim.o.splitbelow = true
vim.o.list = true
vim.opt.listchars = { tab = '» ', trail = '·', nbsp = '␣' }
vim.o.inccommand = 'split'
vim.o.cursorline = true
vim.o.scrolloff = 10
vim.o.confirm = true
vim.opt.shiftwidth = 2
vim.opt.tabstop = 2
vim.opt.expandtab = true

-- [[ Keymaps ]]
vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>')
vim.keymap.set('n', '<leader>q', vim.diagnostic.setloclist, { desc = 'Open diagnostic [Q]uickfix list' })
vim.keymap.set('n', '<leader>u', function() vim.pack.update() end, { desc = '[U]pdate plugins' })
vim.keymap.set('t', '<Esc><Esc>', '<C-\\><C-n>', { desc = 'Exit terminal mode' })
vim.keymap.set('n', '<left>', '<cmd>echo "Use h to move!!"<CR>')
vim.keymap.set('n', '<right>', '<cmd>echo "Use l to move!!"<CR>')
vim.keymap.set('n', '<up>', '<cmd>echo "Use k to move!!"<CR>')
vim.keymap.set('n', '<down>', '<cmd>echo "Use j to move!!"<CR>')
vim.keymap.set('n', 'J', 'mzJ`z')
vim.keymap.set('n', '<C-d>', '<C-d>zz')
vim.keymap.set('n', '<C-u>', '<C-u>zz')
vim.keymap.set('n', 'n', 'nzzzv')
vim.keymap.set('n', 'N', 'Nzzzv')

vim.keymap.set('v', 'J', ":m '>+1<CR>gv=gv")
vim.keymap.set('v', 'K', ":m '<-2<CR>gv=gv")

-- [[ Filetypes ]]
vim.filetype.add {
  pattern = {
    ['.*%.blade%.php'] = 'blade',
  },
}

-- [[ Basic Autocommands ]]
vim.api.nvim_create_autocmd('TextYankPost', {
  desc = 'Highlight when yanking (copying) text',
  group = vim.api.nvim_create_augroup('kickstart-highlight-yank', { clear = true }),
  callback = function()
    vim.hl.on_yank()
  end,
})

-- [[ Build hooks for vim.pack plugins ]]
vim.api.nvim_create_autocmd('PackChanged', {
  callback = function(ev)
    local kind = ev.data.kind
    if kind ~= 'install' and kind ~= 'update' then
      return
    end
    if ev.data.spec.name == 'telescope-fzf-native.nvim' and vim.fn.executable 'make' == 1 then
      vim.system({ 'make' }, { cwd = ev.data.path }):wait()
    end
  end,
})

-- [[ Load plugins ]]
require 'themes.rose-pine'
require 'plugins.mini'
require 'plugins.blink'
require 'plugins.lspconfig'
require 'plugins.rustaceanvim'
require 'plugins.conform'
require 'plugins.copilot'
require 'plugins.debug'
require 'plugins.gitsigns'
require 'plugins.guess-indent'
require 'plugins.indent_line'
require 'plugins.lint'
require 'plugins.neotest'
require 'plugins.oil'
require 'plugins.persistence'
require 'plugins.telescope'
require 'plugins.tmux-navigator'
require 'plugins.todo-comments'
require 'plugins.treesitter'
require 'plugins.which-key'
