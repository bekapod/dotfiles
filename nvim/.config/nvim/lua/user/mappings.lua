-- Mapping data with "desc" stored directly by vim.keymap.set().
--
-- Please use this mappings table to set keyboard mapping since this is the
-- lower level configuration and more robust one. (which-key will
-- automatically pick-up stored data by this setting.)
return {
  -- first key is the mode
  n = {
    -- second key is the lefthand side of the map
    -- mappings seen under group name "Buffer"
    ["<leader>bn"] = { "<cmd>tabnew<cr>", desc = "New tab" },
    ["<leader>bD"] = {
      function()
        require("astronvim.utils.status").heirline.buffer_picker(
          function(bufnr) require("astronvim.utils.buffer").close(bufnr) end
        )
      end,
      desc = "Pick to close",
    },
    -- tables with the `name` key will be registered with which-key if it's installed
    -- this is useful for naming menus
    ["<leader>b"] = { name = "Buffers" },
    -- quick save
    -- ["<C-s>"] = { ":w!<cr>", desc = "Save File" },  -- change description but the same command
    -- when applying the next line to the current line, keeps cursor
    -- in the same place instead of moving it to the new end of the line
    ["J"] = { "mzJ`z" },

    -- keeps cursor centred when doing page jumping
    ["<C-d>"] = { "<C-d>zz" },
    ["<C-u>"] = { "<C-u>zz" },

    -- keeps cursor centred when paging through search results
    ["n"] = { "nzzzv" },
    ["N"] = { "Nzzzv" },

    ["<leader>x"] = { name = "Trouble" },
    ["<leader>xx"] = {
      function() require("trouble").toggle() end,
      desc = "Trouble: Toggle",
    },
    ["<leader>xw"] = {
      function() require("trouble").toggle "workspace_diagnostics" end,
      desc = "Trouble: Workspace Diagnostics",
    },
    ["<leader>xd"] = {
      function() require("trouble").toggle "document_diagnostics" end,
      desc = "Trouble: Document Diagnostics",
    },
    ["<leader>xq"] = {
      function() require("trouble").toggle "quickfix" end,
      desc = "Trouble: Quickfix",
    },
    ["<leader>xl"] = {
      function() require("trouble").toggle "loclist" end,
      desc = "Trouble: Location List",
    },
    ["<leader>lT"] = {
      function() require("trouble").toggle "lsp_references" end,
      desc = "Trouble: LSP References",
    },
  },
  v = {
    ["J"] = { ":m '>+1<CR>gv=gv" },
    ["K"] = { ":m '<-2<CR>gv=gv" },
  },
  t = {
    -- setting a mapping to false will disable it
    -- ["<esc>"] = false,
  },
}
