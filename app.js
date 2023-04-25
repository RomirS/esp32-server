const express = require('express');
const cors = require('cors');
const path = require('path');
const querystring = require('querystring');
const axios = require('axios')
const request = require('request');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const client_id = 'f84f5c7802c14524b145cd71361da63e';
const client_secret = 'ce2d849c26de43ec94f16a977dac16ca';

const redirect_uri = 'http://localhost:5000/end';

function generateRandomString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    function base64encode(string) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);

    return base64encode(digest);
}

app.get('/', async (req, res) => {

    let codeVerifier = generateRandomString(128);

    var state = generateRandomString(16);
    var scope = 'user-read-private user-read-email';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }
    ));


    // const response = await axios.post('https://accounts.spotify.com/api/token', {
    //     'grant_type': 'client_credentials',
    //     'client_id': 'f84f5c7802c14524b145cd71361da63e',
    //     'client_secret': 'ce2d849c26de43ec94f16a977dac16ca'
    // }, {
    //     headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded'
    //     },
    // })
    // res.json(response.data)
});

app.get('/end', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
              code: code,
              redirect_uri: redirect_uri,
              grant_type: 'authorization_code'
            },
            headers: {
              'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
          };

        request.post(authOptions, async function(error, response, body) {
            if (!error && response.statusCode === 200) {
                const access_token = body.access_token;
                console.log(access_token)
                
                try {
                    const result = await axios("https://api.spotify.com/v1/me/player/currently-playing", {
                        headers: { Authorization: `Bearer ${access_token}` }
                    });
    
                    res.json(result)
                } catch(e) {
                    // console.error(e)
                    res.json('bad')
                }
            }
        });
    }
})

if(process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));

  app.get('*', (_,res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

