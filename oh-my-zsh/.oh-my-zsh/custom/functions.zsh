function code-sync()
{
  for dir in */; do
    (
      echo "${dir}"
      cd "${dir}" > /dev/null 2>&1 || exit

      if [ -d .git ]; then
        git fetch -p origin && \
        git pull origin "$(git_current_branch)"
      else
        echo 'Not a git repo, skipping...'
      fi
      echo ""
    )
  done
}

function code-branch()
{
  local reset=$'\e[0m'
  local red=$'\e[1;31m'
  local green=$'\e[1;32m'
  color=${red}

  for dir in */; do
  (
    cd "${dir}" > /dev/null 2>&1 || exit
    cmd=$(git status --short)
    if [ -z "${cmd}" ] ; then
      color=${green}
    fi
    printf "${dir} %s$(git rev-parse --abbrev-ref HEAD)%s\\n" "${color}" "${reset}"
  )
  done
}
