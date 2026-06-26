vim.pack.add {
  'https://github.com/copilotlsp-nvim/copilot-lsp',
  'https://github.com/zbirenbaum/copilot.lua',
}

require('copilot').setup {
  suggestion = {
    enabled = false,
    auto_trigger = true,
    hide_during_completion = vim.g.ai_cmp,
    keymap = {
      accept = false, -- handled by nvim-cmp / blink.cmp
      next = '<M-]>',
      prev = '<M-[>',
    },
  },
  panel = { enabled = false },
  filetypes = {
    markdown = true,
    help = true,
  },
}
