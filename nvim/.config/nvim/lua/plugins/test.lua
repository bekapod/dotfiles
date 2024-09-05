local Path = require("plenary.path")

return {
  {
    "nvim-neotest/neotest",
    dependencies = {
      "marilari88/neotest-vitest",
    },
    opts = {
      adapters = {
        ["neotest-vitest"] = {},
        ["neotest-python"] = {
          is_test_file = function(file_path)
            if not vim.endswith(file_path, ".py") then
              return false
            end
            local elems = vim.split(file_path, Path.path.sep)
            local file_name = elems[#elems]
            return vim.startswith(file_name, "test_")
              or vim.endswith(file_name, "_test.py")
              or vim.endswith(file_name, "_tests.py")
          end,
        },
      },
    },
  },
}
