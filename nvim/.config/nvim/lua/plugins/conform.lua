local Prettier = {}

local prettier_supported = {
  'css',
  'graphql',
  'handlebars',
  'html',
  'javascript',
  'javascriptreact',
  'json',
  'jsonc',
  'less',
  'markdown',
  'markdown.mdx',
  'scss',
  'typescript',
  'typescriptreact',
  'vue',
  'yaml',
}

function Prettier.has_config(ctx)
  vim.fn.system { 'prettier', '--find-config-path', ctx.filename }
  return vim.v.shell_error == 0
end

function Prettier.has_parser(ctx)
  local ft = vim.bo[ctx.buf].filetype --[[@as string]]
  if vim.tbl_contains(prettier_supported, ft) then
    return true
  end
  local ret = vim.fn.system { 'prettier', '--file-info', ctx.filename }
  ---@type boolean, string?
  local ok, parser = pcall(function()
    return vim.fn.json_decode(ret).inferredParser
  end)
  return ok and parser and parser ~= vim.NIL
end

local function get_formatters_by_ft()
  local formatters = {
    lua = { 'stylua' },
    go = { 'goimports', 'gofumpt' },
  }

  for _, ft in ipairs(prettier_supported) do
    formatters[ft] = { 'prettier' }
  end

  return formatters
end

return {
  'stevearc/conform.nvim',
  event = { 'BufWritePre' },
  cmd = { 'ConformInfo' },
  keys = {
    {
      '<leader>f',
      function()
        require('conform').format { async = true, lsp_format = 'fallback' }
      end,
      mode = '',
      desc = '[F]ormat buffer',
    },
  },
  opts = {
    notify_on_error = false,
    format_on_save = function(bufnr)
      local disable_filetypes = { c = true, cpp = true }
      if disable_filetypes[vim.bo[bufnr].filetype] then
        return nil
      else
        return {
          timeout_ms = 500,
          lsp_format = 'fallback',
        }
      end
    end,
    formatters_by_ft = get_formatters_by_ft(),
    formatters = {
      prettier = {
        condition = function(_, ctx)
          return Prettier.has_parser(ctx) and Prettier.has_config(ctx)
        end,
      },
    },
  },
}
