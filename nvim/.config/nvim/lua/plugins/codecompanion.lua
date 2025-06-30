return {
  "olimorris/codecompanion.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-treesitter/nvim-treesitter",
    {
      "saghen/blink.cmp",
      opts = {
        sources = {
          default = { "codecompanion" },
          providers = {
            codecompanion = {
              name = "CodeCompanion",
              module = "codecompanion.providers.completion.blink",
              enabled = true,
            },
          },
        },
      },
    },
  },
  opts = {
    display = {
      chat = {
        show_settings = true,
      },
    },
    adapters = {
      copilot = function()
        return require("codecompanion.adapters").extend("copilot", {
          schema = {
            model = {
              default = "claude-sonnet-4",
            },
          },
        })
      end,
    },
    strategies = {
      chat = {
        adapter = "copilot",
      },
      inline = {
        adapter = "copilot",
      },
    },
    extensions = {
      vectorcode = {
        ---@type VectorCode.CodeCompanion.ExtensionOpts
        opts = {
          tool_group = {
            enabled = true,
            collapse = true,
            -- tools in this array will be included to the `vectorcode_toolbox` tool group
            extras = {},
          },
          tool_opts = {
            ---@type VectorCode.CodeCompanion.LsToolOpts
            ls = {},
            ---@type VectorCode.CodeCompanion.QueryToolOpts
            query = {},
            ---@type VectorCode.CodeCompanion.VectoriseToolOpts
            vectorise = {},
          },
        },
      },
    },
  },
  config = true,
}
