local vue_language_server_path = vim.fn.stdpath 'data' .. '/mason/packages/vue-language-server/node_modules/@vue/language-server'
local vue_plugin = {
  name = '@vue/typescript-plugin',
  location = vue_language_server_path,
  languages = { 'vue' },
  configNamespace = 'typescript',
  enableForWorkspaceTypeScriptVersions = true,
}

return {
  'neovim/nvim-lspconfig',
  dependencies = {
    { 'mason-org/mason.nvim', opts = {
      ensure_installed = { 'goimports', 'gofumpt', 'gomodifytags', 'impl', 'delve' },
    } },
    'mason-org/mason-lspconfig.nvim',
    'WhoIsSethDaniel/mason-tool-installer.nvim',
    { 'j-hui/fidget.nvim', opts = {} },
    'saghen/blink.cmp',
  },
  config = function()
    local util = require 'lspconfig.util'
    local function tw_config(root)
      local candidates = {
        'tailwind.config.js',
        'tailwind.config.cjs',
        'tailwind.config.ts',
        'assets/tailwind.config.js',
        'assets/tailwind.config.cjs',
        'assets/tailwind.config.ts',
      }
      for _, rel in ipairs(candidates) do
        if vim.loop.fs_stat(root .. '/' .. rel) then
          return rel
        end
      end
    end

    vim.api.nvim_create_autocmd('LspAttach', {
      group = vim.api.nvim_create_augroup('kickstart-lsp-attach', { clear = true }),
      callback = function(event)
        local map = function(keys, func, desc, mode)
          mode = mode or 'n'
          vim.keymap.set(mode, keys, func, { buffer = event.buf, desc = 'LSP: ' .. desc })
        end

        map('grn', vim.lsp.buf.rename, '[R]e[n]ame')
        map('gra', vim.lsp.buf.code_action, '[G]oto Code [A]ction', { 'n', 'x' })
        map('grr', require('telescope.builtin').lsp_references, '[G]oto [R]eferences')
        map('gri', require('telescope.builtin').lsp_implementations, '[G]oto [I]mplementation')
        map('grd', require('telescope.builtin').lsp_definitions, '[G]oto [D]efinition')
        map('grD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
        map('gO', require('telescope.builtin').lsp_document_symbols, 'Open Document Symbols')
        map('gW', require('telescope.builtin').lsp_dynamic_workspace_symbols, 'Open Workspace Symbols')
        map('grt', require('telescope.builtin').lsp_type_definitions, '[G]oto [T]ype Definition')

        -- This function resolves a difference between neovim nightly (version 0.11) and stable (version 0.10)
        ---@param client vim.lsp.Client
        ---@param method vim.lsp.protocol.Method
        ---@param bufnr? integer some lsp support methods only in specific files
        ---@return boolean
        local function client_supports_method(client, method, bufnr)
          if vim.fn.has 'nvim-0.11' == 1 then
            return client:supports_method(method, bufnr)
          else
            return client.supports_method(method, { bufnr = bufnr })
          end
        end

        local client = vim.lsp.get_client_by_id(event.data.client_id)
        if client and client_supports_method(client, vim.lsp.protocol.Methods.textDocument_documentHighlight, event.buf) then
          local highlight_augroup = vim.api.nvim_create_augroup('kickstart-lsp-highlight', { clear = false })
          vim.api.nvim_create_autocmd({ 'CursorHold', 'CursorHoldI' }, {
            buffer = event.buf,
            group = highlight_augroup,
            callback = vim.lsp.buf.document_highlight,
          })

          vim.api.nvim_create_autocmd({ 'CursorMoved', 'CursorMovedI' }, {
            buffer = event.buf,
            group = highlight_augroup,
            callback = vim.lsp.buf.clear_references,
          })

          vim.api.nvim_create_autocmd('LspDetach', {
            group = vim.api.nvim_create_augroup('kickstart-lsp-detach', { clear = true }),
            callback = function(event2)
              vim.lsp.buf.clear_references()
              vim.api.nvim_clear_autocmds { group = 'kickstart-lsp-highlight', buffer = event2.buf }
            end,
          })
        end

        if client and client_supports_method(client, vim.lsp.protocol.Methods.textDocument_inlayHint, event.buf) then
          map('<leader>th', function()
            vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled { bufnr = event.buf })
          end, '[T]oggle Inlay [H]ints')
        end
      end,
    })

    vim.api.nvim_create_autocmd('LspAttach', {
      group = vim.api.nvim_create_augroup('lsp_attach_disable_ruff_hover', { clear = true }),
      callback = function(args)
        local client = vim.lsp.get_client_by_id(args.data.client_id)
        if client == nil then
          return
        end
        if client.name == 'ruff' then
          -- Disable hover in favor of Pyright
          client.server_capabilities.hoverProvider = false
        end
      end,
      desc = 'LSP: Disable hover capability from Ruff',
    })

    vim.diagnostic.config {
      severity_sort = true,
      float = { border = 'rounded', source = 'if_many' },
      underline = { severity = vim.diagnostic.severity.ERROR },
      signs = vim.g.have_nerd_font and {
        text = {
          [vim.diagnostic.severity.ERROR] = '󰅚 ',
          [vim.diagnostic.severity.WARN] = '󰀪 ',
          [vim.diagnostic.severity.INFO] = '󰋽 ',
          [vim.diagnostic.severity.HINT] = '󰌶 ',
        },
      } or {},
      virtual_text = {
        source = 'if_many',
        spacing = 2,
        format = function(diagnostic)
          local diagnostic_message = {
            [vim.diagnostic.severity.ERROR] = diagnostic.message,
            [vim.diagnostic.severity.WARN] = diagnostic.message,
            [vim.diagnostic.severity.INFO] = diagnostic.message,
            [vim.diagnostic.severity.HINT] = diagnostic.message,
          }
          return diagnostic_message[diagnostic.severity]
        end,
      },
    }

    local capabilities = require('blink.cmp').get_lsp_capabilities()

    local servers = {
      cssls = {
        settings = {
          css = {
            lint = {
              unknownAtRules = 'ignore',
            },
          },
        },
      },
      elixirls = {},
      golangci_lint_ls = {},
      gopls = {
        settings = {
          gopls = {
            gofumpt = true,
            codelenses = {
              gc_details = false,
              generate = true,
              regenerate_cgo = true,
              run_govulncheck = true,
              test = true,
              tidy = true,
              upgrade_dependency = true,
              vendor = true,
            },
            hints = {
              assignVariableTypes = true,
              compositeLiteralFields = true,
              compositeLiteralTypes = true,
              constantValues = true,
              functionTypeParameters = true,
              parameterNames = true,
              rangeVariableTypes = true,
            },
            analyses = {
              fieldalignment = true,
              nilness = true,
              unusedparams = true,
              unusedvariable = true,
              unusedwrite = true,
              useany = true,
            },
            usePlaceholders = true,
            completeUnimported = true,
            staticcheck = true,
            directoryFilters = { '-.git', '-.vscode', '-.idea', '-.vscode-test', '-node_modules' },
            semanticTokens = true,
          },
        },
      },
      pyright = {
        settings = {
          pyright = {
            -- Using Ruff's import organizer
            disableOrganizeImports = true,
          },
          python = {
            analysis = {
              -- Ignore all files for analysis to exclusively use Ruff for linting
              ignore = { '*' },
            },
          },
        },
      },
      ruff = {},
      lua_ls = {
        settings = {
          Lua = {
            completion = {
              callSnippet = 'Replace',
            },
          },
        },
      },
      marksman = {},
      vtsls = {},
      vue_ls = {},
      yamlls = {},
      eslint = {
        settings = {
          -- helps eslint find the eslintrc when it's placed in a subfolder instead of the cwd root
          workingDirectories = { mode = 'auto' },
          format = false,
        },
      },
      prettier = {},
    }

    local ensure_installed = vim.tbl_keys(servers or {})
    vim.list_extend(ensure_installed, {
      'stylua',
    })
    require('mason-tool-installer').setup { ensure_installed = ensure_installed }

    -- require('mason-lspconfig').setup {
    --   ensure_installed = {}, -- explicitly set to an empty table (Kickstart populates installs via mason-tool-installer)
    --   automatic_installation = false,
    --   handlers = {
    --     function(server_name)
    --       local server = servers[server_name] or {}
    --       server.capabilities = vim.tbl_deep_extend('force', {}, capabilities, server.capabilities or {})
    --       require('lspconfig')[server_name].setup(server)
    --     end,
    --   },
    -- }

    require('mason-lspconfig').setup {
      ensure_installed = {},
      automatic_installation = false,
      handlers = {
        function(server_name)
          local server = servers[server_name] or {}
          server.capabilities = vim.tbl_deep_extend('force', {}, capabilities, server.capabilities or {})
          vim.lsp.config(server_name, server)
        end,
        tailwindcss = function() end, -- prevent mason from setting it up
      },
    }

    vim.lsp.config('vtsls', {
      settings = {
        vtsls = {
          tsserver = {
            globalPlugins = {
              vue_plugin,
            },
          },
        },
      },
      filetypes = { 'typescript', 'javascript', 'javascriptreact', 'typescriptreact', 'vue' },
    })

    vim.lsp.config.gleam = {}

    local util = require 'lspconfig.util'

    local function find_tw_css(root)
      local candidates = {
        'assets/css/app.css',
        'src/styles.css',
        'styles.css',
      }
      for _, rel in ipairs(candidates) do
        local path = root .. '/' .. rel
        if vim.loop.fs_stat(path) then
          return path
        end
      end
    end

    local tailwind_base = {
      name = 'tailwindcss',
      cmd = { vim.fn.stdpath 'data' .. '/mason/bin/tailwindcss-language-server', '--stdio' },
      capabilities = vim.tbl_deep_extend('force', {}, capabilities),
      filetypes = { 'elixir', 'eelixir', 'heex', 'html', 'css', 'javascript', 'typescript', 'tsx' },
      init_options = {
        userLanguages = {
          elixir = 'phoenix-heex',
          eelixir = 'phoenix-eex',
          heex = 'phoenix-heex',
        },
      },
      settings = {
        tailwindCSS = {
          includeLanguages = {
            elixir = 'phoenix-heex',
            eelixir = 'phoenix-eex',
            heex = 'phoenix-heex',
          },
          experimental = {
            classRegex = {
              { 'class=\\{\\[(.*?)\\]\\}', '["\\\']([^"\\\']*)["\\\']' },
              { 'class="([^"]*)"', '[^\\s"]+' },
              { 'class=\\{([^}]*)\\}', '["\\\']([^"\\\']*)["\\\']' },
            },
          },
        },
      },
    }

    vim.api.nvim_create_autocmd('FileType', {
      group = vim.api.nvim_create_augroup('tailwindcss-start', { clear = true }),
      pattern = tailwind_base.filetypes,
      callback = function()
        local buf = vim.api.nvim_get_current_buf()
        for _, c in ipairs(vim.lsp.get_clients { bufnr = buf }) do
          if c.name == 'tailwindcss' then
            return
          end
        end
        local fname = vim.api.nvim_buf_get_name(buf)
        local root = util.root_pattern('assets/package.json', 'package.json', 'mix.exs', '.git')(fname) or vim.loop.cwd()
        local css = find_tw_css(root)
        local config = vim.tbl_deep_extend('force', {}, tailwind_base)

        if css then
          config.settings.tailwindCSS.experimental.configFile = css
        end

        vim.lsp.start(vim.tbl_extend('force', config, { root_dir = root }))
      end,
    })
  end,
}
