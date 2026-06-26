vim.pack.add {
  'https://github.com/giuxtaposition/blink-cmp-copilot',
  { src = 'https://github.com/saghen/blink.cmp', version = vim.version.range '1.*' },
}

local CompletionItemKind = require('blink.cmp.types').CompletionItemKind
local copilot_kind = #CompletionItemKind + 1
CompletionItemKind[copilot_kind] = 'Copilot'

require('blink.cmp').setup {
  keymap = {
    preset = 'default',
  },

  appearance = {
    nerd_font_variant = 'mono',
    kind_icons = {
      Copilot = '',
      Text = '󰉿',
      Method = '󰊕',
      Function = '󰊕',
      Constructor = '󰒓',

      Field = '󰜢',
      Variable = '󰆦',
      Property = '󰖷',

      Class = '󱡠',
      Interface = '󱡠',
      Struct = '󱡠',
      Module = '󰅩',

      Unit = '󰪚',
      Value = '󰦨',
      Enum = '󰦨',
      EnumMember = '󰦨',

      Keyword = '󰻾',
      Constant = '󰏿',

      Snippet = '󱄽',
      Color = '󰏘',
      File = '󰈔',
      Reference = '󰬲',
      Folder = '󰉋',
      Event = '󱐋',
      Operator = '󰪚',
      TypeParameter = '󰬛',
    },
  },

  completion = {
    documentation = { auto_show = false },
  },

  sources = {
    default = { 'lsp', 'path', 'buffer', 'copilot' },
    providers = {
      copilot = {
        name = 'copilot',
        module = 'blink-cmp-copilot',
        score_offset = 100,
        async = true,
        transform_items = function(_, items)
          for _, item in ipairs(items) do
            item.kind = copilot_kind
          end
          return items
        end,
      },
    },
  },

  fuzzy = { implementation = 'lua' },

  signature = { enabled = true },
}
