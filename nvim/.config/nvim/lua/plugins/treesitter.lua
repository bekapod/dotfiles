vim.pack.add { { src = 'https://github.com/nvim-treesitter/nvim-treesitter', version = 'main' } }

local parsers = {
  'astro',
  'bash',
  'c',
  'comment',
  'css',
  'diff',
  'dockerfile',
  'eex',
  'elixir',
  'git_config',
  'git_rebase',
  'gitattributes',
  'gitcommit',
  'gitignore',
  'gleam',
  'go',
  'gomod',
  'gosum',
  'gowork',
  'heex',
  'html',
  'htmldjango',
  'javascript',
  'jsdoc',
  'json',
  'lua',
  'luadoc',
  'markdown',
  'markdown_inline',
  'mermaid',
  'ninja',
  'php',
  'phpdoc',
  'blade',
  'python',
  'query',
  'regex',
  'rust',
  'scss',
  'svelte',
  'toml',
  'tsx',
  'typescript',
  'vim',
  'vimdoc',
  'vue',
  'yaml',
}

require('nvim-treesitter').install(parsers)

local function attach(buf, language)
  if not vim.treesitter.language.add(language) then
    return
  end
  vim.treesitter.start(buf, language)
  vim.wo[0][0].foldexpr = 'v:lua.vim.treesitter.foldexpr()'
  vim.wo[0][0].foldmethod = 'expr'
  if vim.treesitter.query.get(language, 'indents') ~= nil then
    vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
  end
end

local available = require('nvim-treesitter').get_available()
vim.api.nvim_create_autocmd('FileType', {
  callback = function(args)
    local buf, filetype = args.buf, args.match
    local language = vim.treesitter.language.get_lang(filetype)
    if not language then
      return
    end

    local installed = require('nvim-treesitter').get_installed 'parsers'
    if vim.tbl_contains(installed, language) then
      attach(buf, language)
    elseif vim.tbl_contains(available, language) then
      require('nvim-treesitter').install(language):await(function()
        attach(buf, language)
      end)
    end
  end,
})
