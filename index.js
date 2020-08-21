const fs = require('fs')
const prompts = require('prompts')
const fetch = require('node-fetch')
const base64 = require('nodejs-base64-encode')

const getConfigFromPrompt = async path => {
  const initialConfig = require(path);

	const config = await prompts([
  	{
			type: 'text',
			name: 'project',
			message: 'Enter project name',
			initial: initialConfig.project,
		}, 
		{
			type: 'text',
			name: 'clientId',
			message: 'Enter clientId',
			initial: initialConfig.clientId,
		},
		{
			type: 'text',
			name: 'clientSecret',
			message: 'Enter clientSecret',
			initial: initialConfig.clientSecret,
		},
	])

	fs.writeFileSync(path, JSON.stringify(config, null, 2))

	return config
}

const handleResponse = async res => {
	json = await res.json()
	if (json.error) {
		throw new Error(json.message || json.error)
	} 
	return json
}

const fetchToken = (project, clientId, clientSecret) => {
	return fetch(
  	`https://auth.sphere.io/oauth/token?grant_type=client_credentials&scope=manage_project:${project}`,
  	{
  		method:'POST',
      headers: {
      	'Authorization': `Basic ${base64.encode(clientId + ':' + clientSecret, 'base64')}`,
      },
    },
  )
  .then(handleResponse)
}

const fetchCustomerByEmail = (project, token, email) => {
	return fetch(
  	`https://api.sphere.io/${project}/customers/?where=email%20%3D%20"${email}"`,
  	{
  		method: 'GET',
  		headers: {
  			'Authorization': `Bearer ${token}`,
  		},
  	},
	)
	.then(handleResponse)
	.then(response => { 
		if (!response || !response.results || !response.results[0]) {
			throw new Error('User not found.')
		}
		return response.results[0]
	})
}

const generateConfirmToken = (project, token, customerId) => {
	return fetch(
  	`https://api.sphere.io/${project}/customers/email-token`,
  	{
  		method: 'POST',
  		headers: {
  			'Authorization': `Bearer ${token}`,
  		},
  		body: JSON.stringify({
		    id: customerId,
		    ttlMinutes: 60,
  		})
  	},
	)
	.then(handleResponse)
}

const confirmEmailWithToken = (project, token, confirmToken) => {
	return fetch(
  	`https://api.sphere.io/${project}/customers/email/confirm`,
  	{
  		method: 'POST',
  		headers: {
  			'Authorization': `Bearer ${token}`,
  		},
  		body: JSON.stringify({
	    	tokenValue: confirmToken
			})
  	},
	)
	.then(handleResponse)
}

(async () => {
	try {
	  const { project, clientId, clientSecret } = await getConfigFromPrompt('./config.json')

	  const { access_token: token } = await fetchToken(project, clientId, clientSecret)

		const { email } = await prompts({
			type: 'text',
			name: 'email',
			message: 'Enter customer\'s email',
		})

	  const { id: customerId } = await fetchCustomerByEmail(project, token, email.trim())

	  const { value: confirmToken } = await generateConfirmToken(project, token, customerId)

	  const result = await confirmEmailWithToken(project, token, confirmToken)

	  console.log(result)

	} catch (error) {
		console.error(error.message || 'Unknown error.')
	}
})()