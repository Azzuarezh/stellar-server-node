const express = require('express')
const path = require('path')
const fs = require('fs')
const bodyParser = require("body-parser");
const  rp = require('request-promise')
const Stellar = require('stellar-sdk')
const MongoClient = require('mongodb').MongoClient;
const PORT = process.env.PORT || 4321;
const app = express();
//load properties
let rawdata = fs.readFileSync('properties.json');  
let props = JSON.parse(rawdata);  


const url  = props.mongoServer;
const dbName = props.mongoDb;

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/* Global Vars */
const server = new Stellar.Server(props.stellarServer)
if(props.isTestNetwork)Stellar.Network.useTestNetwork()

const login = async(req,res) => {      
    var username = req.body.username;
    var password = req.body.password;
    let mongod =  await MongoClient.connect(url)
    var responseJson = {};    
    let collection = await mongod.db(dbName)
    .collection("user").findOne({$and:[{username:username},{password:password}]});      
    console.log('collection :', collection)    
    if(collection){
      responseJson['data'] = collection
      responseJson['status'] = 'OK'
    }else{
      responseJson['data'] = 'user not found'
      responseJson['status'] = 'ERROR'
    }
    res.send(responseJson)
    
}

/* Stellar Interactions */
const createAccount = async (req, res) => {  
  	// Create Account and request balance on testnet
  	//get random keypair
  	console.log('req body :',req.body)
  	let pair = Stellar.Keypair.random()    
	  let account = null  	
	  try{
      await rp.get({
        uri: 'https://friendbot.stellar.org',
        qs: { addr: pair.publicKey() },
        json: true
      })  
    }catch(err){
      console.log('ada error : ', err)
    }    
	account = await server.loadAccount(pair.publicKey()) // Load newly created account
	console.log('account :', account);
	// Print balances at account.balances[0].balance
	console.log('\nBalances for account: ' + pair.publicKey())
	account.balances.forEach((balance) => {
  	console.log('Type:', balance.asset_type, ', Balance:', balance.balance)
	})

	
	// write object to json file (only for dump purpose)  
	var jsonObj = {
		'account_name':req.body.account_name, 
    'username':req.body.username,
		'password':req.body.password,		
    'stellar_public_key':pair.publicKey(),
    'secret': pair.secret(),    
    'account': account 		
	}
	

  MongoClient.connect(url, function(err, client) {  
    if (err) {
      return res.send("error creating account ! " + err)
    }
    const db = client.db(dbName);  
    db.collection("user").insertOne(jsonObj, function(err, result) {
      client.close();
    });
    return res.send(jsonObj)
  });
}


async function getMongoAccount(public_key, callback) {
    let mongod =  await MongoClient.connect(url)
    let collection = await mongod.db(dbName).collection("user").findOne({'stellar_public_key':public_key});    
    return collection;      
}

/* Initiate payment from acc A to acc B */
const makePayment = async (req, res) => {
  var responseJson ={}
  var sender = req.body.sender
  var receiver = req.body.receiver
  var amount = req.body.tx_amount.toString()
  var memo = req.body.memo.toString()
  receiverPair = Stellar.Keypair.fromPublicKey(receiver.public_key);   
  sourceKeys = Stellar.Keypair.fromSecret(sender.secret);
    
  var trx = await server.loadAccount(receiver.public_key)
    // If the account is not found, surface a nicer error message for logging.
    .catch(Stellar.NotFoundError, function (error) {
      responseJson['status'] = 'ERROR'
      responseJson['data'] = 'The destination account does not exist!'      
    })
    // If there was no error, load up-to-date information on your account.
    .then(function() {
      return server.loadAccount(sourceKeys.publicKey());
    })
    .then(function(sourceAccount) {
      // Start building the transaction.
      transaction = new Stellar.TransactionBuilder(sourceAccount)
        .addOperation(Stellar.Operation.payment({
          destination: receiver.public_key,
          // Because Stellar allows transaction in many currencies, you must
          // specify the asset type. The special "native" asset represents Lumens.
          asset: Stellar.Asset.native(),
          amount: amount
        }))
        // A memo allows you to add your own metadata to a transaction. It's
        // optional and does not affect how Stellar treats the transaction.
        .addMemo(Stellar.Memo.text(memo))
        .build();
      // Sign the transaction to prove you are actually the person sending it.
      transaction.sign(sourceKeys);
      // And finally, send it off to Stellar!
      return server.submitTransaction(transaction);
    })
    .then(function(result) {
      return result._links      
    })
    .catch(function(error) {        
      responseJson['status'] = 'ERROR'
      responseJson['data'] = 'Something went wrong!'            
      // If the result is unknown (no response body, timeout etc.) we simply resubmit
      // already built transaction:
      // server.submitTransaction(transaction);
    });
    responseJson['status'] = 'OK'
    responseJson['data'] = trx;
    res.send(responseJson)
}

const getBalance = async(req, res) =>{  
  var responseJson ={}
  account = await server.loadAccount(req.headers.public_key).catch(
    (err) => { 
      responseJson['status']='ERROR'
      responseJson['data']=err
    })    
  responseJson['status'] ='OK'
  responseJson['data'] =account.balances
  console.log('response json :', responseJson)
  res.send(responseJson)
}

/* Retrieve transaction history for AccountA */
const getHistory = async (req, res) => {
  // Retrieve latest transaction
  var responseJson ={}  
  var account = await server.loadAccount(req.headers.public_key)  
  let historyPage = await server.payments()
    .forAccount(account.accountId())
    .call().catch((err)=>{
        responseJson['status'] = 'ERROR'
        responseJson['data'] = 'Error Loading History Transaction'
    })    
  // Check if there are more transactions in history
  // Stellar only returns one (or more if you want) transaction  
  console.log('history payment : ', historyPage)
    
  responseJson['status'] = 'OK'
  responseJson['data'] = historyPage.records
  console.log('responseJson : ', responseJson)
  res.send(responseJson)
}

const getIndex = async(req, res) =>{  
  var responseJson ={}  
  res.send("server is running")
}

/* CORS */
app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,content-type')
  res.setHeader('Content-Type', 'application/json')

  // Pass to next layer of middleware
  next()
})


app.post('/createAccount', createAccount)
app.post('/payment', makePayment)
app.get('/getHistory', getHistory)
app.get('/getBalance',getBalance)
app.post('/login',login)

app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => {
  	res.send("server is running")
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
