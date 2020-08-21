const fs = require('fs')
const prompts = require('prompts')

const readConfig = path => {
  try {
    return JSON.parse(fs.readFileSync(path))
  } catch (error) {
    return {}
  }
}

const selectProject = async configPath => {
  const config = readConfig(configPath)
  const choices = [
    { title: 'New project', value: '' },
  ]

  if (config.projects && Object.keys(config.projects).length > 0) {
    choices.unshift(...Object.keys(config.projects).map(key => ({ title: key, value: key })),)
    choices.push(
      { title: 'Clear projects data', value: 'CLEAR_CONFIG' },
    )
  }

  let initialIndex = choices.findIndex(({ value }) => value === config.defaultProject)

  if (initialIndex < 0) { initialIndex = 0 }

  const { value, confirm } = await prompts([
    {
      type: 'select',
      name: 'value',
      message: 'Select a project',
      choices: choices,
      initial: initialIndex,
    },
    {
      type: prev => prev === 'CLEAR_CONFIG' ? 'confirm' : null,
      name: 'confirm',
      message: 'This will delete all saved projects and credentials, are you sure?',
    }
  ])

  if (value === 'CLEAR_CONFIG') {
    if (confirm) {
      fs.writeFileSync(configPath, '{}')
      console.log('Config cleared.')
    }
    return selectProject(configPath)
  }

  if (!value) {
    const { newProject } = await prompts({
      type: 'text',
      name: 'newProject',
      message: 'Enter CT project name',
    })

    return newProject
  }

  return value
}
module.exports.getConfigFromPrompt = async (path = './config.json') => {
  const project = await selectProject(path)

  if (!project) {
    throw new Error('Please enter CT project name')
  }

  const config = readConfig(path)
  config.projects = config.projects || {}
  const projectConfig = config.projects[project] || {}

  const { clientId, clientSecret } = await prompts([
    {
      type: 'text',
      name: 'clientId',
      message: 'Client id',
      initial: projectConfig.clientId || '',
    },
    {
      type: 'text',
      name: 'clientSecret',
      message: 'Client secret',
      initial: projectConfig.clientSecret || '',
    },
  ])

  config.projects[project] = { clientId, clientSecret }
  config.defaultProject = project

  fs.writeFileSync(path, JSON.stringify(config, null, 2))

  return { project, clientId, clientSecret }
}
