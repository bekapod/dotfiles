local on_attach = function(client, bufnr)
  require("lsp-inlayhints").on_attach(client, bufnr, false)
  local package_json_path = vim.fn.getcwd() .. "/package.json"
  local package_json = io.open(package_json_path, "r")

  local is_tailwind = false

  if package_json then
    local package_json_content = package_json:read "*all"
    package_json:close()

    if package_json_content:find '"tailwindcss"' then is_tailwind = true end
  end

  local function stop_buffer_client(client_name)
    vim.lsp.for_each_buffer_client(bufnr, function(buffer_client, client_id)
      if buffer_client.name == client_name then vim.lsp.stop_client(client_id, true) end
    end)
  end

  local function stop_client_if_active_client_is(client_name)
    for _, active_client in ipairs(vim.lsp.get_active_clients { bufnr = bufnr }) do
      if active_client.name == client_name then vim.lsp.stop_client(client.id, true) end
    end
  end

  if is_tailwind then
    if client.name == "tailwindcss" then
      stop_buffer_client "cssls"
    elseif client.name == "cssls" then
      stop_client_if_active_client_is "tailwindcss"
    end
  else
    if client.name == "tailwindcss" then vim.lsp.stop_client(client.id, true) end
  end
end

return {
  -- Configure AstroNvim updates
  updater = {
    remote = "origin", -- remote to use
    channel = "stable", -- "stable" or "nightly"
    version = "latest", -- "latest", tag name, or regex search like "v1.*" to only do updates before v2 (STABLE ONLY)
    branch = "nightly", -- branch name (NIGHTLY ONLY)
    commit = nil, -- commit hash (NIGHTLY ONLY)
    pin_plugins = nil, -- nil, true, false (nil will pin plugins on stable only)
    skip_prompts = false, -- skip prompts about breaking changes
    show_changelog = true, -- show the changelog after performing an update
    auto_quit = false, -- automatically quit the current session after a successful update
    remotes = { -- easily add new remotes to track
      --   ["remote_name"] = "https://remote_url.come/repo.git", -- full remote url
      --   ["remote2"] = "github_user/repo", -- GitHub user/repo shortcut,
      --   ["remote3"] = "github_user", -- GitHub user assume AstroNvim fork
    },
  },

  -- Set colorscheme to use
  colorscheme = "catppuccin",

  -- Diagnostics configuration (for vim.diagnostics.config({...})) when diagnostics are on
  diagnostics = {
    virtual_text = true,
    underline = true,
  },

  lsp = {
    -- customize lsp formatting options
    formatting = {
      -- control auto formatting on save
      format_on_save = {
        enabled = true, -- enable or disable format on save globally
        allow_filetypes = { -- enable format on save for specified filetypes only
          -- "go",
        },
        ignore_filetypes = { -- disable format on save for specified filetypes
          -- "python",
        },
      },
      disabled = { -- disable formatting capabilities for the listed language servers
        -- disable lua_ls formatting capability if you want to use StyLua to format your lua code
        "lua_ls",
        "volar",
      },
      timeout_ms = 3000, -- default format timeout
      -- filter = function(client) -- fully override the default formatting function
      --   return true
      -- end
    },
    -- enable servers that you already have installed without mason
    servers = {
      -- "pyright"
    },
    on_attach = on_attach,
    config = {
      tsserver = {
        settings = {
          typescript = {
            inlayHints = {
              includeInlayParameterNameHints = "all",
              includeInlayParameterNameHintsWhenArgumentMatchesName = false,
              includeInlayFunctionParameterTypeHints = true,
              includeInlayVariableTypeHints = true,
              includeInlayVariableTypeHintsWhenTypeMatchesName = false,
              includeInlayPropertyDeclarationTypeHints = true,
              includeInlayFunctionLikeReturnTypeHints = true,
              includeInlayEnumMemberValueHints = true,
            },
          },
          javascript = {
            inlayHints = {
              includeInlayParameterNameHints = "all",
              includeInlayParameterNameHintsWhenArgumentMatchesName = false,
              includeInlayFunctionParameterTypeHints = true,
              includeInlayVariableTypeHints = true,
              includeInlayVariableTypeHintsWhenTypeMatchesName = false,
              includeInlayPropertyDeclarationTypeHints = true,
              includeInlayFunctionLikeReturnTypeHints = true,
              includeInlayEnumMemberValueHints = true,
            },
          },
        },
      },
      lua_ls = {
        settings = {
          Lua = {
            hint = {
              enable = true,
            },
          },
        },
      },
      volar = {
        filetypes = { "vue", "typescript", "javascript" },
        init_options = {
          languageFeatures = {
            implementation = true, -- new in @volar/vue-language-server v0.33
            references = true,
            definition = true,
            typeDefinition = true,
            callHierarchy = true,
            hover = true,
            rename = true,
            renameFileRefactoring = true,
            signatureHelp = true,
            codeAction = true,
            workspaceSymbol = true,
            completion = {
              defaultTagNameCase = "both",
              defaultAttrNameCase = "kebabCase",
              getDocumentNameCasesRequest = false,
              getDocumentSelectionRequest = false,
            },
            documentHighlight = true,
            documentLink = true,
            codeLens = { showReferencesNotification = true },
            -- not supported - https://github.com/neovim/neovim/pull/15723
            semanticTokens = false,
            diagnostics = true,
            schemaRequestService = true,
          },
          documentFeatures = {
            selectionRange = true,
            foldingRange = true,
            linkedEditingRange = true,
            documentSymbol = true,
            -- not supported - https://github.com/neovim/neovim/pull/13654
            documentColor = false,
            documentFormatting = {
              defaultPrintWidth = 100,
            },
          },
        },
      },
    },
  },

  -- Configure require("lazy").setup() options
  lazy = {
    defaults = { lazy = true },
    performance = {
      rtp = {
        -- customize default disabled vim plugins
        disabled_plugins = { "tohtml", "gzip", "matchit", "zipPlugin", "netrwPlugin", "tarPlugin" },
      },
    },
  },

  -- This function is run last and is a good place to configuring
  -- augroups/autocommands and custom filetypes also this just pure lua so
  -- anything that doesn't fit in the normal config locations above can go here
  polish = function()
    -- Set up custom filetypes
    -- vim.filetype.add {
    --   extension = {
    --     foo = "fooscript",
    --   },
    --   filename = {
    --     ["Foofile"] = "fooscript",
    --   },
    --   pattern = {
    --     ["~/%.config/foo/.*"] = "fooscript",
    --   },
    -- }
  end,
  icons = {
    ActiveLSP = "",
    ActiveTS = " ",
    BufferClose = "",
    DapBreakpoint = "",
    DapBreakpointCondition = "",
    DapBreakpointRejected = "",
    DapLogPoint = "",
    DapStopped = "",
    DefaultFile = "",
    Diagnostic = "",
    DiagnosticError = "",
    DiagnosticHint = "",
    DiagnosticInfo = "",
    DiagnosticWarn = "",
    Ellipsis = "",
    FileModified = "",
    FileReadOnly = "",
    FoldClosed = "",
    FoldOpened = "",
    FolderClosed = "",
    FolderEmpty = "",
    FolderOpen = "",
    Git = "",
    GitAdd = "",
    GitBranch = "",
    GitChange = "",
    GitConflict = "",
    GitDelete = "",
    GitIgnored = "",
    GitRenamed = "",
    GitStaged = "",
    GitUnstaged = "",
    GitUntracked = "",
    LSPLoaded = "",
    LSPLoading1 = "",
    LSPLoading2 = "",
    LSPLoading3 = "",
    MacroRecording = "",
    Paste = "",
    Search = "",
    Selected = "",
    TabClose = "",
  },
}
