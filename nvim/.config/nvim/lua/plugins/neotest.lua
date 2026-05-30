return {
  {
    'nvim-neotest/neotest',
    dependencies = {
      'nvim-lua/plenary.nvim',
      'marilari88/neotest-vitest',
      'nvim-neotest/neotest-python',
      'jfpedroza/neotest-elixir',
      'olimorris/neotest-phpunit',
    },
    config = function()
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
        },
      }
    end,
    keys = {
      {
        '<leader>ef',
        function()
          require('neotest').run.run(vim.fn.expand '%')
        end,
        desc = 'Run File',
      },
      {
        '<leader>et',
        function()
          require('neotest').run.run()
        end,
        desc = 'Run Nearest',
      },
      {
        '<leader>eo',
        function()
          require('neotest').output.open { enter = true, auto_close = true }
        end,
        desc = 'Show Output',
      },
    },
  },
}
