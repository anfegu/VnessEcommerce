require('dotenv').config();
const axios = require("axios");
const config = require("./config");
const { ethers } = require('ethers');
const Web3 = require('web3');
const nftContract = require("./NFT1155.sol/NFT1155.json");
const placeContract = require("./NFTPlace.sol/NFTPlace.json");

var cont;
var fileImg;
var url;

function receiveImg(item, result) {
  axios.get(item.item_url, {
    responseType: 'arraybuffer'
  }).then(response => {
    cont = Buffer.from(response.data, 'binary').toString('base64');
    ipfsImg(cont, item, result);
    //console.log(Buffer.from(response.data, 'binary').toString('base64'));
  })
    .catch(function (error) {
      result.send({
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Error Getting Image Properties: ${error.message} Err_Code: ${error.errno}`,
      })
    });
}

function ipfsImg(cont, item, result) {
  let ipfsArray = [];
  ipfsArray.push({
    path: `image/${item.item_url.substr(8)}`,
    content: cont
  })
  axios.post("https://deep-index.moralis.io/api/v2/ipfs/uploadFolder",
    ipfsArray,
    {
      headers: {
        "X-API-KEY": process.env.IPFS_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json"
      }
    })
    .then((res) => {
      fileImg = "ipfs://" + res.data[0].path.substr(34);
      ipfsJson(fileImg, item, result);
    })
    .catch((error) => {
      result.send({
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Image Error IPFS: ${error.message} Err_Code: ${error.errno}`,
      })
    })
}

function ipfsJson(fileImg, item, result) {
  let ipfsMetadata = [];
  ipfsMetadata.push({
    path: `metadata/${fileImg.substr(7)}.json`,
    content: {
      image: fileImg,
      name: item.pname,
      description: item.descrip
    }
  })
  axios.post("https://deep-index.moralis.io/api/v2/ipfs/uploadFolder",
    ipfsMetadata,
    {
      headers: {
        "X-API-KEY": process.env.IPFS_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json"
      }
    }
  ).then(async (res) => {
    url = "ipfs://" + res.data[0].path.substr(34);
    createItemPlace(item, url, result);
  })
  .catch((error) => {
      result.send({
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `URI Error IPFS: ${error.message} Err_Code: ${error.errno}`,
      })
    })
}
async function createItemPlace(item, uri, result) {
  //Initialize ether conection 
  /*const provider = new ethers.providers.JsonRpcProvider(process.env.NODE_PROVIDER);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);¨*/
  const web3 = new Web3(new Web3.providers.HttpProvider(process.env.NODE_PROVIDER))
  web3.eth.defaultAccount = "0x2cB292E18f77CDd24E905c0f4775d71634240e15";
  let myBalanceWei = await web3.eth.getBalance(web3.eth.defaultAccount);
  const gasPrice = await web3.eth.getGasPrice();
  console.log(myBalanceWei);
  //const gasPrice = await provider.getGasPrice();
  
  //Mint Item Token
  let contract = new web3.eth.Contract(nftContract.abi, config.nftContract);
  let transaction = await contract.methods.createToken(uri, parseInt(item.quant)).send({
      gasLimit: 3000000,
      gasPrice: gasPrice,
      value: 0,
  });
  let tx = await transaction.wait();
  
  //Retrieve tokenId and price
  let event = tx.events[1];
  let tokenId = event.args.id; 
  const price = ethers.utils.parseUnits(item.price, 'ether');
    
  //Create Item
  contract = new ethers.Contract(config.nftplaceaddress, placeContract.abi, signer);
  //Retrieve listingPrice
  let listingPrice = await contract.getListingPrice()
  listingPrice = listingPrice.toString()

  transaction = await contract.createItem(config.nft1155address, tokenId, price, parseInt(item.quant),
    { 
      gasLimit: 3000000,
      gasPrice: gasPrice,
      value: listingPrice,
    })
    .then(async (res) => {
      let tx = await res.wait();
      let event = tx.events[2];
      let itemId = (event.args.itemId).toNumber();
      result.send({ 
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Transaction Success: ${transaction.hash}`,
        "data": { 
          "itemId": itemId,
        } 
      })
    }).catch((err) => {
      result.send({
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Blockchain Error: ${err.message} Err_Code: ${err.errno}`,
      })
    });
}
module.exports = { receiveImg };
