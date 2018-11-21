# Stellar Server with NodeJS

## Dependencies
- ejs
- body-parser
- express
- fs
- mongodb
- request
- request-promise
- stellar-sdk  

## Running Locally
Make sure you have [Node.js](http://nodejs.org/) installed.

```sh
$ git clone https://github.com/azzuarezh/stellar-server-node.git # or clone your own fork
$ cd stellar-server-node
$ npm install
$ node index.js
```

Now your app should now be running on [localhost:5000](http://localhost:5000/).
# API Endpoint

- ### POST('/createAccount', ``Account``)
    Account : ``object`` The Account Properties which need to send in order to create new Account  
    Example ``Account`` object :  
    ```sh
    {
      "account_name":"delta",
      "username":"Delta88",
      "password":"123"
    }
    ```
- ### POST('/login', ``Account``)
    Account : ``object`` The Account Properties which need to be verified in order to access the application feature  
    Example ``Account`` object : 
    ```sh
    {
      "username":"Delta88",
      "password":"123"
    }
    ```
- ### POST('/payment', ``Payment``)
    Payment :  ``object`` Payment Properties which held two accounts object, amount and Memo  
    Example ``Payment`` object :
    ```sh
    {
      "sender":{
        "public_key":"GUENKH7PGPCJZAWX3OIS4TPRKEU6YCERPCPBS2P6KTMMLXPBIYY43SX5",
        "secret":"SBV5CJU3NW53I3F2O366UJCJFZ53632RLWNUUFKTUVIMJKZIWVXGSZBE"
      },
      "receiver":{
        "public_key":"GBAKPP7PGPCJZAWX3OIS4TPRKEU6YCERPCPBS2P6KTMMLXPBIYY43SX5"
      },
      "tx_amount":"250",
      "memo":"this is for you john!"
    }
    ```
- ### POST('/getHistory', ``Public Key``)
    Public Key :  ``String`` Account Properties which need to know to check history transaction  
    Example ``Public Key``  : GBRCNMR3YKT326SGJ64IFDQDHCWY3HQOFBLCTPCAB74U4VMBTWNYGM4O
    
- ### GET('/getBalance', ``Account``)
    Public Key :  ``String`` Account Properties which need to know to check available balance  
    Example ``Public Key``  : GBRCNMR3YKT326SGJ64IFDQDHCWY3HQOFBLCTPCAB74U4VMBTWNYGM4O



# MongoDB Database


# Stellar Horizon API


