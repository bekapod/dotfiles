return {
  "jay-babu/mason-nvim-dap.nvim",
  opts = {
    handlers = {
      elixir = function(source_name)
        local dap = require "dap"

        dap.adapters.mix_task = {
          type = "executable",
          command = vim.fn.stdpath "data" .. "/mason" .. "/packages" .. "/elixir-ls" .. "/debugger.sh",
          args = {},
        }

        dap.configurations.elixir = {
          {
            type = "mix_task",
            name = "mix test",
            request = "launch",
            task = "test",
            taskArgs = { "--trace" },
            startApps = true,
            projectDir = "${workspaceFolder}",
            requireFiles = { "test/**/test_helper.exs", "test/**/*_test.exs" },
          },
        }
      end,
    },
  },
}
