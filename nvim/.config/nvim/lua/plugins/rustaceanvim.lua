return {
  'mrcjkb/rustaceanvim',
  version = '^9',
  lazy = false,
  init = function()
    vim.g.rustaceanvim = {
      server = {
        capabilities = require('blink.cmp').get_lsp_capabilities(),
      },
    }
  end,
}
