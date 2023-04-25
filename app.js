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

const redirect_uri = 'https://esp32-server-t1o0.onrender.com/end';

function generateRandomString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

app.get('/', async (req, res) => {

    var state = generateRandomString(16);
    var scope = 'user-read-private user-read-email user-read-playback-position user-read-playback-state user-read-currently-playing';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }
    ));
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

                return res.redirect('/access?token=' + access_token)
            }
        });
    }
})

function stringify(obj) {
    let cache = [];
    let str = JSON.stringify(obj, function(key, value) {
    if (typeof value === "object" && value !== null) {
        if (cache.indexOf(value) !== -1) {
            // Circular reference found, discard key
            return;
        }
        // Store value in our collection
        cache.push(value);
    }
        return value;
    });
    cache = null; // reset the cache
    return str;
}

app.get('/access', async (req, res) => {
    const { token } = req.query

    try {

        const result = await axios.get("https://api.spotify.com/v1/me/player", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const { item } = result.data

        res.json(item.name)
    } catch(e) {
        res.json('Error: ' + e)
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

