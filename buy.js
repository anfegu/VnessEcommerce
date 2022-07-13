require('dotenv').config();
const config = require("./config");
const { ethers } = require('ethers');
const Web3 = require('web3');
const placeContract = require("./NFTPlace.sol/NFTPlace.json");

async function buyItem(itemId, result){
    //Initialize ether conection 
  const provider = new ethers.providers.JsonRpcProvider(process.env.NODE_PROVIDER);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
  
  //Fetch Items 
  let contract = new ethers.Contract(config.nftplaceaddress, placeContract.abi, signer);
  const data = await contract.fetchItemsCreated();
  //console.log(data);
  if (itemId > Object.keys(data).length) {
    result.send({ 
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Error: Item ${itemId} doesn't exist`,
    }) 
    return;
  } 
  
  if (data[itemId-1].sold) {
    result.send({ 
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Error: Item ${itemId} is already sold`,
    }) 
    return;
  } 
  //Do the Buy
  const price = data[itemId-1].price.toString();

  let web3Provider = new Web3.providers.HttpProvider(process.env.NODE_PROVIDER);
  let web3 = new Web3(web3Provider);
  const gasPrice = await web3.eth.getGasPrice();
  const account = web3.eth.accounts.privateKeyToAccount('0x' + process.env.WALLET_PRIVATE_KEY_BUYER);
  web3.eth.accounts.wallet.add(account);
  console.log(account);
  if(account.address === data[itemId-1].seller){
    result.send({ 
        "status": result.statusCode !== null,
        "statusCode": result.statusCode,
        "message": `Error: account: ${account.address} cannot buy the item because is the seller`,
    }) 
    return;
  }
  //const signerBuy = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY_BUYER, provider);
  contract = new web3.eth.Contract(placeContract.abi, config.nftplaceaddress);
  let transaction = await contract.methods.createSale(config.nft1155address, data[itemId-1].itemId, data[itemId-1].amount).send({
    from: account.address,
    gasLimit: 3000000,
    gasPrice: gasPrice,
    value: price,
  })
  .then((res) => {
    console.log(res);
    result.send({ 
      "status": result.statusCode !== null,
      "statusCode": result.statusCode,
      "message": `Transaction Success: ${res.blockHash}`,
    })
  }).catch((err) => {
    console.log(err);
    result.send({
      "status": result.statusCode !== null,
      "statusCode": result.statusCode,
      "message": `Blockchain Error: ${err.message} Err_Code: ${err.errno}`,
    })
  });
}

async function listBuyItem(result) {
      //Initialize ether conection 
  const provider = new ethers.providers.JsonRpcProvider(process.env.NODE_PROVIDER);
  const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
  
  //Fetch Items 
  let contract = new ethers.Contract(config.nftplaceaddress, placeContract.abi, signer);
  const data = await contract.fetchItemsCreated();
  const items = await Promise.all(data.map(async i => {
    let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
    let item = {
      itemId: i.itemId.toNumber(),
      seller: i.seller,
      owner: i.owner,
      price,
      sold: i.sold,
    }
    return item
  }))
  result.send({
    "status": result.statusCode !== null,
    "statusCode": result.statusCode,
    "message": items,
  })
}
module.exports = { buyItem, listBuyItem};