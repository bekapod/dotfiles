# Gondolin GBDK image

`install.sh` overlays `index.ts` onto Pi's upstream Gondolin example, installs the official GBDK 4.5.0 Linux ARM64 release in `~/.local/share/gbdk-linux-arm64/4.5.0`, then builds `gondolin-gbdk:bookworm` with Docker and imports it into Gondolin as `gbdk:latest`.

The guest has network access disabled. It mounts GBDK read-only at `/opt/gbdk`, sets `GBDK_HOME=/opt/gbdk/`, and includes GNU Make, Python 3.14, uv, PyBoy, and pytest. Its prebuilt test environment deliberately uses `UV_NO_SYNC=1`; update `Dockerfile.gbdk` and rebuild the image when shared test dependencies change.
