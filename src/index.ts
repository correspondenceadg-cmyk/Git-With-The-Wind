import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseState } from './engine/state';
import { parseCommand } from './engine/parser';

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.setFailed('GITHUB_TOKEN missing');
    return;
  }

  const ctx = github.context;
  core.info(`Event: ${ctx.eventName}`);
  core.info(`Repo:  ${ctx.repo.owner}/${ctx.repo.repo}`);

  const payload = ctx.payload;
  if (ctx.eventName === 'issue_comment') {
    const body = payload.comment?.body ?? '';
    const command = parseCommand(body);
    if (!command) {
      core.info('No /heist command — skipping.');
      return;
    }
    core.info(`Parsed: ${JSON.stringify(command)}`);
  }

  if (ctx.eventName === 'issues') {
    const body = payload.issue?.body ?? '';
    const state = parseState(body);
    core.info(`New vault. Existing state: ${state ? 'yes' : 'no'}`);
  }
}

main().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
