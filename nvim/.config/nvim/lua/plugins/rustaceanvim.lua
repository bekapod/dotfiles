vim.g.rustaceanvim = {
  server = {
    capabilities = require('blink.cmp').get_lsp_capabilities(),
  },
}

vim.pack.add { { src = 'https://github.com/mrcjkb/rustaceanvim', version = vim.version.range '9' } }
