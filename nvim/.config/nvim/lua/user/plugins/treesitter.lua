return {
  "nvim-treesitter/nvim-treesitter",
  opts = function(_, opts)
    -- add more things to the ensure_installed table protecting against community packs modifying it
    opts.ensure_installed = require("astronvim.utils").list_insert_unique(opts.ensure_installed, {
      "bash",
      "comment",
      "css",
      "dockerfile",
      "elixir",
      "go",
      "gomod",
      "html",
      "javascript",
      "jsdoc",
      "json",
      "lua",
      "markdown",
      "markdown_inline",
      "mermaid",
      "python",
      "regex",
      "rust",
      "scss",
      "svelte",
      "toml",
      "tsx",
      "typescript",
      "vue",
      "yaml",
    })
  end,
}
