## Invisible Recaptcha (v3) with graceful failover to checkbox Recaptcha (v2)

Super small Recaptcha library. Uses Recaptcha v3 by default. Fails over to v2 when v3 score seems low. Detects darkmode automatically. Super simple setup. Requires server side setup. Cleans up after itself.

### Requirements:

- Use Recaptcha v3 by default, fail over to v2 when v3 score seems low
- Must work across multiple pages seamlessly
- Detect dark mode automatically.
- Have a super simple setup api. Automatically add google recaptcha js library
- Cleans up after itself by removing the v2 checkbox upon successful verification
- Node.JS backend (you can use any other language)

![screen-grab](https://cdn-images.postach.io/e4166d51-932d-4f37-8bad-3096a9117794/e7d5f76d-9402-e6ba-fe65-24b686b0a230/a7d16a06-57a7-64a4-ce13-fe78ff3447a0.gif)

### Install

```
npm install --save recaptcha-v3-v2
```

Add to index.html just before the end of body tag:

```
<script async defer type="module" src="./node_modules/recaptcha-v3-v2/dist/recaptcha.js"></script>
```

if you use express then you can remove the ./node_modules/recaptcha-v3-v2/ from the url by configuring a static route. Same thing can be achieved with nginx, apache etc using rewrite rules.

```
app.use('/scripts', express.static(__dirname + '/node_modules/recaptcha-v3-v2/dist/'));
```

Now you can use:

```
<script async defer type="module" src="/scripts/recaptcha.js"></script>
```

To access the functionality from JavaScript you can simply wait for the onload event to fire.

```
window.addEventListener("load", () => {
  recaptcha.checkScore(event, 'Login', submitForm, 'body', document.getElementsByClassName('g-recaptcha')[0], 'your-api-url-see-above-section', 'your-v3-recaptcha-site-key', 'your-v2-recaptcha-site-key', 0.5);
});
```

### Get recaptcha keys

Get your recaptcha keys from https://www.google.com/recaptcha/admin/

Setup both v3 and v2 sites. Domain will be same for both. The site keys go on the client as show in the how-to-use and setup render property sections, and the secret keys go on the server as shown in the setup API endpoint section.

### Setup API endpoint

A single endpoint must handle both v3 and v2 as described in https://developers.google.com/recaptcha/docs/verify. You can do this in cloud functions, lambda or use any other server as you please.

Here is a sample implementation to help you get started using firebase cloud functions. There is a complete sample in the code:

```
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const axios = require("axios");
import * as cors from "cors";
const corsHandler = cors({ origin: true });

admin.initializeApp({
  credential: admin.credential.cert(
    Object.assign(
      {
        private_key: "your-server-private_key",
      },
      functions.config().serviceaccount
    )
  ),
  databaseURL: "your-firebase-db-url",
});

exports.sendRecaptcha = functions.https.onRequest(async (request, response) => {
  corsHandler(request, response, async () => {
    const USER_ERROR_CODES = [
      "missing-input-response",
      "invalid-input-response",
    ];
    let secret = functions.config().recaptcha.key; //your secret v3 recaptcha key

    const token = request.query.token;
    const version = request.query.version;

    if (Number(version) === 2) secret = functions.config().recaptcha.keyv2; // your secret v2 key

    try {
      const user_ip =
        request.headers["x-forwarded-for"] || request.connection.remoteAddress;
      functions.logger.log(user_ip);
      const result = await axios.post(
        `https://recaptcha.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}&remoteip=${user_ip}`,
        {
          secret: secret,
          response: token,
          remoteip: user_ip,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const data = result.data;

      if (data.success) {
        response.status(200).send(data);
      } else {
        const errorCodes = data["error-codes"];
        if (
          errorCodes.length == 1 &&
          USER_ERROR_CODES.includes(errorCodes[0])
        ) {
          response
            .status(400)
            .send({ error: errorCodes, errorText: "Invalid Input" });
        } else {
          response
            .status(500)
            .send({ error: errorCodes, errorText: "Internal Error" });
        }
      }
    } catch (error) {
      response.status(500).send({ error: error, errorText: "Internal Error" });
    }
  });
});

```

### How-to-use

Bind to click event of a button that needs Recaptcha protection as shown below:

```
onClick="recaptcha.checkScore(event, 'Login', submitForm, 'body', document.getElementsByClassName('g-recaptcha')[0], 'your-api-url-see-above-section', 'your-v3-recaptcha-site-key', 'your-v2-recaptcha-site-key', 0.5)"
```

All parameters are mandatory:

1. Event: pass a reference to the event binding
2. Action: as defined by google. Please see: https://cloud.google.com/recaptcha-enterprise/docs/actions. Setup different actions for each button
3. Callback reference: a reference to a function you want the library to call after successful captcha verification.
4. Parent container: the v2 captcha needs to be set inside a parent. This can be a tag name, .class-name or #id of an html element
5. Recaptcha container: The element where you want the captcha to present itself
6. API url: do not include the query parameters, just the section before the ? will do.
7. v3-site-key: The Recaptcha v3 site key from google recaptcha admin page. See section Get Recaptcha Keys for more information.
8. v2-site-key: The Recaptcha v2 site key from google recaptcha admin page. See section Get Recaptcha Keys for more information.
9. v3 Threshold: When do you want to trigger v2 checkbox? This is recommended at 0.5

### Setup render property:

Add below code before body closing tag in index.html. The recaptcha property must be a let or a var and cannot be a const.

```
<script type="text/javascript">
let recaptcha = {
render: "your-v3-recaptcha-site-key",
};
</script>
```

### Complete example

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>

  <body>
    <form action="#">
      <button
        type="submit"
        onClick="recaptcha.checkScore(event, 'Login', submitForm, 'body', document.getElementsByClassName('g-recaptcha')[0], 'your-api-url-see-above-section', 'your-v3-recaptcha-site-key', 'your-v2-recaptcha-site-key', 0.5)"
      >
        Submit
      </button>
    </form>
    <script async defer type="module" src="./node_modules/recaptcha-v3-v2/recaptcha.js"></script>
    <script type="text/javascript">
      let recaptcha = {
        render: "your-v3-recaptcha-site-key",
      };
    </script>
    <script type="text/javascript">
      submitForm = () => {
        console.log("form submitted");
      };
    </script>
  </body>
</html>
```
