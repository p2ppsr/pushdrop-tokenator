const Tokenator = require('@babbage/tokenator')
const BabbageSDK = require('@babbage/wrapped-sdk')
const { Ninja } = require('ninja-base')
const pushdrop = require('pushdrop')

/**
 * Extends the Tokenator class to enable sending PushDrop tokens with custom instructions Peer-to-Peer
 * @param {object} [obj] All parameters are given in an object
 * @param {String} [obj.peerServHost] The PeerServ host you want to connect to
 * @param {String} [obj.dojoHost] The Dojo to use for UTXO management
 * @param {String} [obj.clientPrivateKey] A private key to use for mutual authentication with Authrite. (Optional - Defaults to Babbage signing strategy).
 */
class PushDropTokenator extends Tokenator {
  constructor ({
    peerServHost = 'https://staging-peerserv.babbage.systems',
    dojoHost = 'https://staging-dojo.babbage.systems',
    clientPrivateKey,
    defaultTokenValue = 1,
    protocolID,
    protocolKeyID,
    protocolBasketName,
    protocolMessageBox,
    protocolAddress
  } = {}) {
    super({ peerServHost, clientPrivateKey })

    // Set derived class properties
    this.defaultTokenValue = defaultTokenValue
    this.protocolID = protocolID
    this.protocolKeyID = protocolKeyID
    this.protocolBasketName = protocolBasketName
    this.protocolMessageBox = protocolMessageBox
    this.protocolAddress = protocolAddress
  }

  /**
   * @param {Object} data The data object with any data fields to send
   * @param {string} [data.recipient='self'] Who this data should be sent to
   * @param {string[]} [tags] Metadata for the output being created as part of the token
   * @returns
   */
  async createPushDropToken (data, tags) {
    if (!data.recipient) {
      data.recipient = 'self'
    }
    // Encrypt the data
    const encryptedData = await BabbageSDK.encrypt({
      plaintext: Uint8Array.from(Buffer.from(JSON.stringify(data))),
      protocolID: this.protocolID,
      keyID: this.protocolKeyID,
      counterparty: data.recipient
    })

    // Create a new PushDrop token
    const bitcoinOutputScript = await pushdrop.create({
      fields: [
        Buffer.from(this.protocolAddress),
        Buffer.from(encryptedData)
      ],
      protocolID: this.protocolID,
      keyID: this.protocolKeyID,
      counterparty: data.recipient
    })

    // Create a transaction
    const newPushDropToken = await BabbageSDK.createAction({
      outputs: [{
        satoshis: Number(this.defaultTokenValue),
        script: bitcoinOutputScript,
        description: `New ${this.protocolID} token`,
        basket: this.protocolBasketName,
        tags
      }],
      description: `Create a ${this.protocolID}  token`
    })

    const sender = await BabbageSDK.getPublicKey({ identityKey: true })

    // Configure the standard messageBox and body
    data.messageBox = this.protocolMessageBox
    data.body = {
      transaction: {
        ...newPushDropToken,
        outputs: [{
          vout: 0,
          satoshis: this.defaultTokenValue,
          basket: this.protocolBasketName,
          customInstructions: JSON.stringify({
            outputScript: bitcoinOutputScript,
            sender,
            recipient: data.recipient,
            protocolID: this.protocolID,
            keyID: this.protocolKeyID
          })
        }]
      },
      amount: this.defaultTokenValue
    }
    return data
  }

  /**
   * Redeems a PushDrop Token by Spending the UTXO
   * @param {Object} token the token object returned from createPushDropToken
   * @param {string} [description] description of this action
   * @returns {Object} the result of the createAction call
   */
  async redeemPushDropToken (token, description = `Delete a ${this.protocolID} token`) {
    const unlockingScript = await pushdrop.redeem({
      protocolID: this.protocolID,
      keyID: this.protocolKeyID,
      prevTxId: token.txid,
      outputIndex: token.vout,
      lockingScript: token.outputScript,
      outputAmount: token.amount
    })

    // Create a new tx which redeems the token and unlocks the Bitcoin
    const result = await BabbageSDK.createAction({
      description,
      inputs: {
        [token.txid]: {
          ...token.envelope,
          inputs: typeof token.envelope.inputs === 'string'
            ? JSON.parse(token.envelope.inputs)
            : token.envelope.inputs,
          mapiResponses: typeof token.envelope.mapiResponses === 'string'
            ? JSON.parse(token.envelope.mapiResponses)
            : token.envelope.mapiResponses,
          proof: typeof token.envelope.proof === 'string'
            ? JSON.parse(token.envelope.proof)
            : token.envelope.proof,
          outputIndex: token.vout,
          outputsToRedeem: [{
            index: token.vout,
            unlockingScript,
            spendingDescription: `Redeems a ${this.protocolID} token`
          }]
        }
      }
    })

    return result
  }

  /**
   * Sends a PushDrop token to a PeerServ recipient
   * @param {object} data The data object with any data fields to send
   * @param {string} [data.recipient='self'] Who this data should be sent to
   * @param {string[]} [tags] Metadata for the output being created as part of the token
   */
  async sendPushDropToken (data, tags) {
    const token = await this.createPushDropToken(data, tags)
    return await this.sendMessage(token)
  }

  /**
   * Receives incoming PushDrop tokens
   * @returns {Array} An array indicating the tokens received
   */
  async receivePushDropTokens () {
    const messages = await this.listMessages({ messageBox: this.protocolMessageBox })

    // Just return if there is no new messages to decrypt
    if (!messages || messages.length === 0) {
      return []
    }

    const tokens = messages.map(x => JSON.parse(x.body))

    // Figure out what the signing strategy should be
    const getLib = () => {
      if (!this.clientPrivateKey) {
        return BabbageSDK
      }
      const ninja = new Ninja({
        privateKey: this.clientPrivateKey,
        config: {
          dojoURL: this.dojoHost
        }
      })
      return ninja
    }

    // Receive tokens using submitDirectTransaction
    const messagesProcessed = []
    const tokensReceived = []
    for (const [i, message] of messages.entries()) {
      try {
        // Validate PushDrop Token
        for (const out of tokens[i].transaction.outputs) {
          if (!out.customInstructions) {
            const e = new Error(`${this.protocolID} tokens must include custom derivation instructions!`)
            e.code = 'ERR_INVALID_TOKEN'
            throw e
          }

          const customInstructions = JSON.parse(out.customInstructions)

          // Derive the lockingPublicKey
          const ownerKey = await BabbageSDK.getPublicKey({
            protocolID: customInstructions.protocolID,
            keyID: customInstructions.keyID,
            counterparty: customInstructions.sender,
            forSelf: true
          })
          const result = pushdrop.decode({
            script: customInstructions.outputScript
          })

          // Make sure the derived ownerKey and lockingPublicKey match
          if (ownerKey !== result.lockingPublicKey) {
            const e = new Error('Derived owner key and script lockingPublicKey did not match!')
            e.code = 'ERR_INVALID_OWNER_KEY'
            throw e
          }
        }

        // Use Ninja to submit the validated transaction to Dojo
        // Note: submitDirectTransaction does not currently support sending in additional tags.
        const result = await getLib().submitDirectTransaction({
          senderIdentityKey: message.sender,
          note: `${this.protocolID} token`,
          amount: this.defaultTokenValue,
          transaction: tokens[i].transaction
        })

        tokensReceived.push(result)
        messagesProcessed.push(message.messageId)
      } catch (e) {
        console.error(e)
      }
    }
    // Acknowledge the token(s) received
    if (messagesProcessed.length > 0) {
      await this.acknowledgeMessage({ messageIds: messagesProcessed })
    }

    return tokensReceived
  }

  /**
   * Helper function for listing tokens in a Dojo basket
   * @param {string[]} tags - output tags for filtering pushdrop tokens in the protocol basket
   * @param {string} [tagQueryMode] - determines if results should match all tags or any of the tags
   * @returns {object[]} - all tokens from the current basket
   */
  async listTokensInBasket (tags, tagQueryMode) {
    const tokens = await BabbageSDK.getTransactionOutputs({
      // The name of the basket where the tokens are kept
      basket: this.protocolBasketName,
      // Only get tokens that are active on the list, not already spent
      spendable: true,
      includeEnvelope: true,
      includeCustomInstructions: true,
      order: 'descending',
      tags,
      tagQueryMode
    })
    return tokens
  }
}
module.exports = PushDropTokenator
