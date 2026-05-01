return {
  'nvim-treesitter/nvim-treesitter',
  branch = 'main',
  lazy = false,
  build = ':TSUpdate',
  config = function()
    local parsers = {
      'bash', 'c', 'comment', 'css', 'diff', 'dockerfile', 'eex', 'elixir',
      'git_config', 'git_rebase', 'gitattributes', 'gitcommit', 'gitignore',
      'gleam', 'go', 'gomod', 'gosum', 'gowork', 'heex', 'html', 'htmldjango',
      'javascript', 'jsdoc', 'json', 'lua', 'luadoc', 'markdown',
      'markdown_inline', 'mermaid', 'ninja', 'python', 'query', 'regex',
      'rust', 'scss', 'svelte', 'toml', 'tsx', 'typescript', 'vim', 'vimdoc',
      'vue', 'yaml',
    }

    require('nvim-treesitter').install(parsers)

    local filetypes = {
      'bash', 'c', 'css', 'diff', 'dockerfile', 'eelixir', 'elixir',
      'gitconfig', 'gitrebase', 'gitattributes', 'gitcommit', 'gitignore',
      'gleam', 'go', 'gomod', 'gosum', 'gowork', 'heex', 'html', 'htmldjango',
      'javascript', 'json', 'lua', 'markdown', 'mermaid', 'ninja', 'python',
      'query', 'rust', 'scss', 'svelte', 'toml', 'typescriptreact',
      'typescript', 'vim', 'help', 'vue', 'yaml',
    }

    vim.api.nvim_create_autocmd('FileType', {
      pattern = filetypes,
      callback = function()
        vim.treesitter.start()
        vim.wo[0][0].foldexpr = 'v:lua.vim.treesitter.foldexpr()'
        vim.wo[0][0].foldmethod = 'expr'
        vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
      end,
    })
  end,
}
