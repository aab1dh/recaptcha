/********************************************************************
     Super small Recaptcha library. Uses Recaptcha v3 by default.
     Fails over to v2 when v3 score seems low. Detects darkmode automatically.
     Super simple setup. Requires server side setup. Cleans up after itself.

     MIT LicenseCopyright © <2020> <Mir Abid Hussain - mirabidhussain.com>

     Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
     The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*********************************************************************/
(() => {
  if (typeof grecaptcha === "undefined") {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;
    script.src = `https://www.google.com/recaptcha/api.js?render=${recaptcha.render}`;
    document.body && document.body.appendChild(script);
  }

  // this style hides the recaptcha badge for you. Make sure you abide by Google's terms of use. Add a small line showing that you are using recaptcha or comment out this function to display the badge.
  const sheet = window.document.styleSheets[0];
  sheet.insertRule(
    ".grecaptcha-badge { display: none; }",
    sheet.cssRules.length
  );
  // end of style setup
})();

recaptcha = (() => {
  let submitFrm;
  let serverURL;
  let tokenV2;

  const callAPI = async (url) => {
    return await fetch(url, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((res) => res);
  };
  const checkChallengeResult = ((e) => {
    const url = `${serverURL}?token=${e}&version=2`;
    try {
      callAPI(url).then((result) => {
        if (result.success) {
          console.log(
            "OK, you are human after all. Thank you for verifying that."
          );
          submitFrm();
          Array.from(
            document.getElementsByClassName("g-recaptcha")
          ).forEach((recaptcha) => recaptcha.remove());
          return true;
        } else {
          console.error("you are a bot, sorry!");
          return false;
        }
      });
    } catch (err) {
      console.error(err);
      return false;
    }
  }).bind(this);
  const startChallenge = (action, recaptchaContainer) => {
    grecaptcha.render(recaptchaContainer, {
      sitekey: `${tokenV2}`,
      action: action,
      callback: recaptcha.checkChallengeResult,
      theme:
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      type: "image",
    });
  };
  const checkScore = (
    e,
    action,
    submitFn,
    parentContainer,
    recaptchaContainer,
    serverUrl,
    tokenv3,
    tokenv2,
    threshold
  ) => {
    serverURL = serverUrl;
    tokenV2 = tokenv2;
    let el;
    if (Array.from(document.getElementsByClassName("g-recaptcha")).length < 1) {
      el = document.createElement("div");
      el.classList = "g-recaptcha";
      document.querySelector(parentContainer).appendChild(el);
    }

    if (!recaptchaContainer)
      recaptchaContainer = document.getElementsByClassName("g-recaptcha")[0];

    if (
      !e ||
      !action ||
      !recaptchaContainer ||
      !submitFn ||
      !serverUrl ||
      !tokenv3 ||
      !tokenv2
    ) {
      console.error("Required argument missing");
      return new Error(
        "Make sure all required arguments are provided to setup the library property"
      );
    }
    if (submitFn) submitFrm = submitFn;
    e.preventDefault();
    grecaptcha.ready(() => {
      grecaptcha
        .execute(`${tokenv3}`, {
          action: action,
        })
        .then((token) => {
          const url = `${serverURL}?token=${token}`;
          try {
            callAPI(url).then((score) => {
              if (score.success) {
                if (score.score < threshold) {
                  console.log("are you a bot?");
                  startChallenge(action, recaptchaContainer);
                } else if (score.score > threshold) {
                  console.log("you are a human");
                  submitFn();
                  // uncomment the startChallenge function below to see the v2 challenge in action for testing. Don't forget to comment this line after you are done testing.
                  // startChallenge(action, recaptchaContainer);
                  return true;
                }
              } else {
                console.log("unsuccessful");
                return false;
              }
            });
          } catch (err) {
            console.error(err);
            return false;
          }
        });
    });
  };

  return {
    checkChallengeResult: checkChallengeResult,
    checkScore: checkScore,
  };
})();
