# pushdrop-tokenator

## Overview

A Tokenator for Exchanging PushDrop Tokens P2P

## Example Usage

This example demonstrates sending and receiving PushDrop tokens with pushdrop-tokenator

```js
const PushDropTokenator = require('pushdrop-tokenator')
const johnSmith = '022600d2ef37d123fdcac7d25d7a464ada7acd3fb65a0daf85412140ee20884311'

const init = async () => {
    // Create a new instance of the PushDropTokenator class
    // Configure the parameters according to the protocol being used
    const tokenator = new PushDropTokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems',
        defaultTokenValue = 1,
        protocolID = 'customProtocol',
        protocolKeyID = 1,
        protocolBasketName = 'customProtocol',
        protocolMessageBox = 'customProtocol_inbox',
        protocolAddress = 'UNIQUE PROTOCOL ID HERE'
    })
    // Send a PushDrop token using Babbage
    await tokenator.sendPushDropToken({
        recipient: johnSmith,
        title: 'Example token with a title',
        contents: 'You can include any data you want inside this object.'
        htmlCode: '<html><body><h1>PUSHDROP TOKEN</h1></body></html>'
    })

    // Receive incoming tokens into your PushDrop basket
    const tokensReceived = await tokenator.receivePushDropTokens()
}

init()
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [PushDropTokenator](#pushdroptokenator)
    *   [Parameters](#parameters)
    *   [createPushDropToken](#createpushdroptoken)
        *   [Parameters](#parameters-1)
    *   [sendPushDropToken](#sendpushdroptoken)
        *   [Parameters](#parameters-2)
    *   [receivePushDropTokens](#receivepushdroptokens)

### PushDropTokenator

**Extends Tokenator**

Extends the Tokenator class to enable sending PushDrop tokens with custom instructions Peer-to-Peer

#### Parameters

*   `obj` **[object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object (optional, default `{}`)

    *   `obj.peerServHost` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** The PeerServ host you want to connect to (optional, default `'https://staging-peerserv.babbage.systems'`)
    *   `obj.dojoHost` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** The Dojo to use for UTXO management (optional, default `'https://staging-dojo.babbage.systems'`)
    *   `obj.clientPrivateKey` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** A private key to use for mutual authentication with Authrite. (Optional - Defaults to Babbage signing strategy).
    *   `obj.defaultTokenValue`  
    *   `obj.protocolID`  
    *   `obj.protocolKeyID`  
    *   `obj.protocolBasketName`  
    *   `obj.protocolMessageBox`  
    *   `obj.protocolAddress`  

#### createPushDropToken

##### Parameters

*   `data` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** The data object with any data fields to send

    *   `data.recipient` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Who this data should be sent to (optional, default `'self'`)

#### sendPushDropToken

Sends a PushDrop token to a PeerServ recipient

##### Parameters

*   `data` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** The data object with any data fields to send

    *   `data.recipient` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Who this data should be sent to (optional, default `'self'`)

#### receivePushDropTokens

Recieves incoming PushDrop tokens

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)** An array indicating the tokens received
