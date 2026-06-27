vim.pack.add { 'https://github.com/rose-pine/neovim' }

require('rose-pine').setup {
  variant = 'moon',
}

vim.cmd.colorscheme 'rose-pine-moon'
