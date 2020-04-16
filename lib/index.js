const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')
const { execSync } = require('child_process')

const { Toolkit } = require('actions-toolkit')

function resolveFromRoot(...paths) {
  return resolve(process.env.GITHUB_WORKSPACE, ...paths)
}

function isIOApp() {
  const manifestPath = resolveFromRoot('manifest.json')
  return existsSync(manifestPath)
}

function getJSONFile(...paths) {
  return JSON.parse(readFileSync(resolveFromRoot(...paths)))
}

// Run your GitHub Action!
Toolkit.run(async tools => {
  if (!isIOApp()) {
    tools.exit.success('Not an IO app. Skipping.')
    return
  }

  const { builders } = getJSONFile('manifest.json')
  for await (const builder of Object.keys(builders)) {
    if (!existsSync(resolveFromRoot(builder, 'package.json'))) {
      continue
    }

    const { scripts } = getJSONFile(builder, 'package.json')
    if (scripts == null || !('test' in scripts)) {
      tools.log.warn(
        `No "test" script found in the "${builder}" app. Skipping.`
      )
      continue
    }

    try {
      // no need to install deps while testing
      await tools.runInWorkspace('pwd', { cwd: resolveFromRoot(builder) })

      if (!process.env.NODE_ENV !== 'test') {
        await tools.runInWorkspace('yarn', 'install --frozen-lockfile', {
          cwd: resolveFromRoot(builder),
        })
      }

      await tools.runInWorkspace(
        'yarn',
        'test --testPathIgnorePatterns="node_modules"',
        {
          cwd: resolveFromRoot(builder),
        }
      )
    } catch (e) {
      tools.log.error(e)
      tools.exit.failure(e)
      return
    }
  }

  tools.exit.success()
})
