vim.pack.add {
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/marilari88/neotest-vitest',
  'https://github.com/nvim-neotest/neotest-python',
  'https://github.com/jfpedroza/neotest-elixir',
  'https://github.com/olimorris/neotest-phpunit',
  'https://github.com/nvim-neotest/neotest',
}

local Path = require 'plenary.path'
local neotest = require 'neotest'

neotest.setup {
  adapters = {
    require 'neotest-vitest',
    require 'neotest-python' {
      is_test_file = function(file_path)
        if not vim.endswith(file_path, '.py') then
          return false
        end
        local elems = vim.split(file_path, Path.path.sep)
        local file_name = elems[#elems]
        return vim.endswith(file_name, '_test.py') or vim.endswith(file_name, '_tests.py')
      end,
    },
    require 'neotest-elixir',
    require 'neotest-phpunit' {
      phpunit_cmd = function()
        local root = vim.fs.root(0, 'composer.json')
        return root and (root .. '/vendor/bin/phpunit') or 'vendor/bin/phpunit'
      end,
    },
    require 'rustaceanvim.neotest',
  },
}

vim.keymap.set('n', '<leader>ef', function()
  require('neotest').run.run(vim.fn.expand '%')
end, { desc = 'Run File' })
vim.keymap.set('n', '<leader>et', function()
  require('neotest').run.run()
end, { desc = 'Run Nearest' })
vim.keymap.set('n', '<leader>eo', function()
  require('neotest').output.open { enter = true, auto_close = true }
end, { desc = 'Show Output' })
