return {
  {
    'mfussenegger/nvim-lint',
    event = { 'BufReadPre', 'BufNewFile' },
    config = function()
      local lint = require 'lint'
      lint.linters_by_ft = {
        elixir = { 'credo' },
        markdown = { 'markdownlint' },
      }

      lint.liners = {
        credo = {
          condition = function(ctx)
            return vim.fs.find({ '.credo.exs' }, { path = ctx.filename, upward = true })[1]
          end,
        },
      }
      --
      -- Create autocommand which carries out the actual linting
      -- on the specified events.
      local lint_augroup = vim.api.nvim_create_augroup('lint', { clear = true })
      vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWritePost', 'InsertLeave' }, {
        group = lint_augroup,
        callback = function()
          if vim.bo.modifiable then
            lint.try_lint()
          end
        end,
      })
    end,
  },
}
