const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')

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

  // no need to install root deps for now
  // await tools.runInWorkspace('yarn', ['install'])

  const { builders } = getJSONFile('manifest.json')
  for await (const builder of Object.keys(builders)) {
    if (!existsSync(resolveFromRoot(builder, 'package.json'))) {
      tools.log.info(
        `No "package.json" found in the "${builder}" app. Skipping.`
      )
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
      if (process.env.NODE_ENV !== 'test') {
        tools.log.info(`Installing "${builder}" dependencies.`)

        await tools.runInWorkspace('yarn', ['install'], {
          cwd: resolveFromRoot(builder),
        })
      }

      await tools.runInWorkspace('yarn', ['test', '--passWithNoTests'], {
        cwd: resolveFromRoot(builder),
      })
    } catch (e) {
      tools.exit.failure(e)
      throw e
    }
  }

  tools.exit.success()
})
