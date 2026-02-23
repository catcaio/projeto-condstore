# Safe npm install for Windows when global npm config is broken.
$env:NPM_CONFIG_USERCONFIG = "NUL"
$env:npm_config_offline = "false"
$env:npm_config_prefer_offline = "false"
$env:npm_config_cache = (Join-Path $PWD ".npm-cache")
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""

npm install --prefer-online --no-audit --no-fund --proxy=null --https-proxy=null
