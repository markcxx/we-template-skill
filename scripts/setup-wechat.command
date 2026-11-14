#!/bin/zsh -f
set -eu
set +x
umask 077
[[ -t 0 ]] || { print -u2 '请在本机终端运行此文件。'; exit 1; }
read -r 'account_id?公众号 AppID：'
[[ "$account_id" =~ '^wx[[:alnum:]]{16}$' ]] || { print -u2 'AppID 格式不正确。'; exit 1; }
read -rs 'account_secret?公众号 AppSecret（输入隐藏，粘贴后按回车）：'
print
[[ "$account_secret" =~ '^[[:alnum:]]{16,128}$' ]] || { print -u2 'AppSecret 格式不正确。'; exit 1; }
config_dir="${WE_TEMPLATE_HOME:-$HOME/.we-template}"
mkdir -p "$config_dir"
stage_file=$(mktemp "$config_dir/.wechat-env.XXXXXXXX")
trap 'rm -f "$stage_file"' EXIT
builtin printf 'WECHAT_APP_ID=%s\nWECHAT_APP_SECRET=%s\n' "$account_id" "$account_secret" > "$stage_file"
unset account_secret
mv -f "$stage_file" "$config_dir/wechat.env"
print '公众号凭据已保存到本机。上传草稿时会自动读取。'
