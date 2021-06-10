/* eslint-disable github/no-then */
import * as core from '@actions/core'
import {Octokit, createGitClient} from './utils'

export type CreateBackportProps = {
  branch: string
  login: string
  repoName: string
  prNumber: number
  prCommit: string
  prTitle: string
  octokit: Octokit
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type CreteBackport = (props: CreateBackportProps) => Promise<void>
export const createBackport: CreteBackport = async ({
  branch,
  login,
  repoName,
  prNumber,
  prCommit,
  prTitle,
  octokit
}): Promise<void> => {
  const git = createGitClient(repoName)

  const backportBranch = `backport-${prNumber}-to-${branch}`

  core.info(`Backporting ${prCommit} from #${prNumber}`)

  const body = `Backport ${prCommit} from #${prNumber}`

  await git('switch', branch)
  await git('fetch', '--all')
  await git('switch', '--create', backportBranch)
  await git(
    'cherry-pick',
    '-x',
    '--strategy=recursive',
    '--diff-algorithm=patience',
    '--strategy-option=patience',
    '--rerere-autoupdate',
    prCommit
  ).catch(async error => {
    await git('cherry-pick', '--abort')
    throw error
  })

  await git('push', '--set-upstream', 'origin', backportBranch)
  const newPR = await octokit.rest.pulls.create({
    base: branch,
    head: backportBranch,
    owner: login,
    repo: repoName,
    title: `chore(backport): ${prTitle}`,
    body
  })

  core.debug(JSON.stringify(newPR))
}
