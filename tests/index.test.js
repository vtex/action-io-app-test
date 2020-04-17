const { resolve } = require('path')

const { Toolkit } = require('actions-toolkit')

let action
let tools

// Mock Toolkit.run to define `action` so we can call it
jest.spyOn(Toolkit, 'run').mockImplementation(actionFn => {
  action = actionFn
})
// Load up our entrypoint file
require('../lib')

beforeEach(() => {
  // Create a new Toolkit instance
  tools = new Toolkit()
  // Mock methods on it!
  jest.spyOn(tools.exit, 'success').mockImplementation()
  jest.spyOn(tools.exit, 'failure').mockImplementation()
})

describe('success', () => {
  beforeAll(() => {
    process.env.GITHUB_WORKSPACE = resolve(__dirname, 'fixtures', 'passing')
  })

  it('exits successfully', async () => {
    await action(tools)
    expect(tools.exit.success).toHaveBeenCalled()
  })
})

describe('failing', () => {
  beforeAll(() => {
    process.env.GITHUB_WORKSPACE = resolve(__dirname, 'fixtures', 'failing')
  })

  it('exits with a exception if some test fails', async () => {
    await action(tools)
    expect(tools.exit.failure).toHaveBeenCalled()
  })
})
