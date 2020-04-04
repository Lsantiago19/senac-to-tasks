const moment = require('moment');
const path = require('path');
const express = require('express');
const google = require('googleapis').google
const OAuth2 = google.auth.OAuth2;

const fs = require('fs');
const TOKEN_PATH = path.resolve(__dirname, '..', 'credentials',  'task-user.json');

async function robot (tarefas) {
    console.log(tarefas);
    const auth = await authenticateWithOAuth();
    const service = google.tasks({version: 'v1', auth});
    

    const list = await getTaskListSenac(service);
    service.tasks.insert({
        tasklist: list.id,
        requestBody : {
            due: moment(new Date()).toISOString(),
            title: 'teste1'
        }
    })



    //const tasks = await service.tasks.list({ tasklist: list.id });

    
    // service.tasks.list({
        
    // }, (err, res) => {
    //     if (err){   
    //         console.log(err);
    //         return console.error('The API returned an error: ' + err);
    //     }
    //     const taskLists = res.data.items;
    //     if (taskLists) {
    //       console.log('Task lists:');
    //       taskLists.forEach((taskList) => {
    //         console.log(`${taskList.title} (${taskList.id})`);
    //       });
    //     } else {
    //       console.log('No task lists found.');
    //     }
    // })

    async function getTaskListSenac() {
        const listResult = await service.tasklists.list({
            maxResults: 10
        });

        const list = listResult.data.items.find(m => m.title === "SENAC");

        if (!list) throw new Error("Lista 'SENAC' não encontrada");

        return list;
    }

    async function authenticateWithOAuth() {
        const webServer = await startWebServer();
        const OAuthClient = await createOAuthClient();
        requestUserConsent(OAuthClient);
        const authorizationToken = await waitForGoogleCallback(webServer);
        const token = await requestGoogleForAccessTokens(OAuthClient, authorizationToken);

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));        
        await setGlobalGoogleAuthentication(OAuthClient)
        await stopWebServer(webServer);

        return OAuthClient;

        async function startWebServer() {
            return new Promise((resolve, reject) => {
              const port = 5000
              const app = express()
      
              const server = app.listen(port, () => {
                console.log(`> [youtube-robot] Listening on http://localhost:${port}`)
      
                resolve({
                  app,
                  server
                })
              });
            });
        }

        async function createOAuthClient() {
            const credentials = require('../credentials/google-tasks.json');
      
            const OAuthClient = new OAuth2(
              credentials.web.client_id,
              credentials.web.client_secret,
              credentials.web.redirect_uris[0]
            );
      
            return OAuthClient
        }

        function requestUserConsent(OAuthClient) {
            const consentUrl = OAuthClient.generateAuthUrl({
              access_type: 'offline',
              scope: ['https://www.googleapis.com/auth/tasks']
            })
      
            console.log(`> [youtube-robot] Please give your consent: ${consentUrl}`)
        }

        async function waitForGoogleCallback(webServer) {
            return new Promise((resolve, reject) => {
              console.log('> [youtube-robot] Waiting for user consent...')
      
              webServer.app.get('/oauth2callback', (req, res) => {
                const authCode = req.query.code
                console.log(`> [youtube-robot] Consent given: ${authCode}`)
      
                res.send('<h1>Thank you!</h1><p>Now close this tab.</p>')
                resolve(authCode)
              })
            })
        }

        async function requestGoogleForAccessTokens(OAuthClient, authorizationToken) {
            return new Promise((resolve, reject) => {
              OAuthClient.getToken(authorizationToken, (error, tokens) => {
                if (error) {
                  return reject(error)
                }
      
                console.log('> [youtube-robot] Access tokens received!')
                OAuthClient.setCredentials(tokens);
                resolve(tokens)
              })
            })
        }
      
        function setGlobalGoogleAuthentication(OAuthClient) {
            google.options({
              auth: OAuthClient
            })
        }
      
        async function stopWebServer(webServer) {
            return new Promise((resolve, reject) => {
              webServer.server.close(() => {
                resolve()
              })
            })
        }
    }

}

module.exports = robot;