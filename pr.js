/* exported createPaymentCredential */
/* exported onBuyClicked */

/**
 * Создает платежный ключ.
 */
async function createPaymentCredential(
    windowLocalStorageIdentifier,
    requireLargeBlobSupport = false,
) {
  try {
    const publicKeyCredential = await createCredential(
        /*setPaymentExtension=*/ true, /*optionalOverrides=*/ {
          additionalExtensions: buildEnrollExtensions(requireLargeBlobSupport),
        });
    console.log(publicKeyCredential);
    window.localStorage.setItem(
        windowLocalStorageIdentifier,
        arrayBufferToBase64(publicKeyCredential.rawId));
    info(
        'Enrolled: ' + objectToString(publicKeyCredential) + '\n' +
        'Extensions: ' + extensionsOutputToString(publicKeyCredential));
  } catch (err) {
    error(err);
  }
}

/**
 * Запускает платежный запрос для SPC.
 */
async function onBuyClicked(
    windowLocalStorageIdentifier, largeBlobMode = LargeBlobMode.None) {
  try {
    const request = await createSPCPaymentRequest({
      credentialIds: [base64ToArray(
          window.localStorage.getItem(windowLocalStorageIdentifier))],
      extensions: buildLoginExtensions(
          largeBlobMode, /* textToWrite= */ 'SecurePaymentConfirmation'),
    });

    try {
      const canMakePayment = await request.canMakePayment();
      info(`canMakePayment result: ${canMakePayment}`);
    } catch (err) {
      error(`Error from canMakePayment: ${error.message}`);
    }

    const instrumentResponse = await request.show();
    await instrumentResponse.complete('success')
    console.log(instrumentResponse);
    info(
        'Payment response: ' + objectToString(instrumentResponse) + '\n' +
        'Extensions: ' + extensionsOutputToString(instrumentResponse.details));
  } catch (err) {
    error(err);
  }
}

/**
 * Получает данные WebAuthn.
 */
async function webAuthnGet(windowLocalStorageIdentifier, largeBlobMode) {
  try {
    const publicKey = {
      challenge: new TextEncoder().encode('Authentication challenge'),
      userVerification: 'required',
      allowCredentials: [
        {
          transports: ['internal'],
          type: 'public-key',
          id: base64ToArray(
              window.localStorage.getItem(windowLocalStorageIdentifier)),
        },
      ],
      extensions: buildLoginExtensions(largeBlobMode),
    };
    const credentialInfoAssertion =
        await navigator.credentials.get({publicKey});
    console.log(credentialInfoAssertion);
    info(
        'Login: ' + objectToString(credentialInfoAssertion) + '\n' +
        'Extensions: ' + extensionsOutputToString(credentialInfoAssertion));
  } catch (err) {
    error(err);
  }
}

/**
 * Режимы работы с большими бинарными данными.
 */
const LargeBlobMode = {
  None: 'None',
  Read: 'Read',
  Write: 'Write',
};

/**
 * Создает расширения для регистрации.
 */
function buildEnrollExtensions(requireLargeBlobSupport) {
  if (requireLargeBlobSupport) {
    return {
      largeBlob: {
        support: 'required',
      }
    };
  } else {
    return {};
  }
}

/**
 * Создает расширения для входа.
 */
function buildLoginExtensions(mode, textToWrite = 'UEK Secret') {
  // Получаем значение из текстового поля
  const userInput = document.getElementById('secretInput').value;
  textToWrite = userInput || 'Секрет по умолчанию'; // Запасной вариант

  if (mode === LargeBlobMode.None) {
    return {};
  } else if (mode === LargeBlobMode.Write) {
    const buffer = new TextEncoder().encode(textToWrite);
    return {
      largeBlob: {
        write: buffer,
      },
    };
  } else if (mode === LargeBlobMode.Read) {
    return {
      largeBlob: {
        read: true,
      }
    };
  }
}

/**
 * Преобразует результат расширений в строку.
 */
function extensionsOutputToString(credentialInfoAssertion) {
  const clientExtensionResults =
      credentialInfoAssertion.getClientExtensionResults();
  if (clientExtensionResults.largeBlob !== undefined &&
      clientExtensionResults.largeBlob.blob !== undefined) {
    clientExtensionResults.largeBlob.blob =
        arrayBufferToString(clientExtensionResults.largeBlob.blob);
  }
  return JSON.stringify(
      clientExtensionResults, /*replacer=*/ undefined,
      /*space=*/ 2);
}
