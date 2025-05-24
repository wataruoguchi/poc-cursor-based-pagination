set -o vi

export GIT_EDITOR=vi

##############
# GIT Section
##############
alias gst='git status'
alias gbr='git branch'
alias gd='git diff'
alias gdc='git diff --cached'
alias ga='git add'
alias gap='ga -p'
alias gco='git checkout'
alias gci='git commit -v'
alias gcim='git commit -v -m'
alias gcia='git commit -v -a'
alias gciam='git commit -v -a -m'
alias gciamN='NO_PT=1 git commit -v -a -m'
alias gcame='git commit --amend'
alias gl='git log'
alias glol='git log --pretty=oneline'
alias gup='git pull --rebase'
alias gpu='git push'
alias guppy='gup && gpu'
alias sup='git stash && gup && git stash pop'
alias suppy='git stash && gup && gpu && git stash pop'
alias gcp='git cherry-pick -x'
alias gundo='git reset HEAD^'

alias nr="npm run"