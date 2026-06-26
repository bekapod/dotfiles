vim.pack.add { 'https://github.com/mfussenegger/nvim-lint' }

local lint = require 'lint'
lint.linters_by_ft = {
  markdown = { 'markdownlint' },
  php = { 'phpstan' },
}

-- phpstan is a project-local composer dep, not a global binary
lint.linters.phpstan.cmd = function()
  local root = vim.fs.root(0, 'composer.json')
  return (root and root .. '/vendor/bin/phpstan') or 'phpstan'
end

local lint_augroup = vim.api.nvim_create_augroup('lint', { clear = true })
vim.api.nvim_create_autocmd({ 'BufEnter', 'BufWritePost', 'InsertLeave' }, {
  group = lint_augroup,
  callback = function()
    if not vim.bo.modifiable then
      return
    end
    local available = vim.tbl_filter(function(name)
      local cmd = lint.linters[name].cmd
      cmd = type(cmd) == 'function' and cmd() or cmd
      return vim.fn.executable(cmd) == 1
    end, lint.linters_by_ft[vim.bo.filetype] or {})
    if #available > 0 then
      lint.try_lint(available)
    end
  end,
})
