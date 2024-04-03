return {
  "nvim-telescope/telescope.nvim",
  opts = function(_, opts)
    local trouble_telescope = require "trouble.providers.telescope"
    local actions = require "telescope.actions"

    local send_to_qflist_and_open_trouble_quickfix = function(prompt_bufnr)
      local trouble = require "trouble"
      actions.send_to_qflist(prompt_bufnr)
      trouble.open "quickfix"
    end

    return require("astrocore").extend_tbl(opts, {
      defaults = {
        mappings = {
          i = {
            ["<C-t>"] = trouble_telescope.open_with_trouble,
            ["<C-q>"] = send_to_qflist_and_open_trouble_quickfix,
          },
          n = {
            ["<C-t>"] = trouble_telescope.open_with_trouble,
            ["<C-q>"] = send_to_qflist_and_open_trouble_quickfix,
          },
        },
      },
    })
  end,
}
