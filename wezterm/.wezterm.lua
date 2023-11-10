local wezterm = require("wezterm")

local config = {}

if wezterm.config_builder then
	config = wezterm.config_builder()
end

------------------ Colors ------------------
local catppuccin = wezterm.color.get_builtin_schemes()["Catppuccin Macchiato"]
catppuccin.background = "#1e2030"
catppuccin.tab_bar.background = "red"
config.color_schemes = {
	["my-catppuccin"] = catppuccin,
}
config.color_scheme = "my-catppuccin"

------------------ Font ------------------
config.font = wezterm.font_with_fallback({
	"MonoLisa",
	{ family = "FiraCode Nerd Font Mono", scale = 1.5 },
})
config.font_size = 14
config.line_height = 1.1

------------------ Window ------------------
config.hide_tab_bar_if_only_one_tab = true
config.window_decorations = "RESIZE"
config.window_padding = {
	top = "12px",
	right = "12px",
	bottom = 0,
	left = "12px",
}

return config
