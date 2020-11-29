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
