return {
  "nvim-treesitter/nvim-treesitter",
  opts = function(_, opts)
    -- add more things to the ensure_installed table protecting against community packs modifying it
    opts.ensure_installed = require("astronvim.utils").list_insert_unique(opts.ensure_installed, {
      "lua",
      "javascript",
      "typescript",
      "tsx",
      "html",
      "css",
      "scss",
      "json",
      "yaml",
      "toml",
      "bash",
      "python",
      "rust",
      "go",
      "vue",
      "svelte",
      "comment",
      "dockerfile",
      "gomod",
      "jsdoc",
      "markdown",
      "markdown_inline",
      "mermaid",
      "regex"
    })
  end,
}
