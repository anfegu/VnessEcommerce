const item = require('./positem')
const express = require('express');
const bodyParser = require('body-parser');
const { buyItem, listBuyItem } = require('./buy');

const PORT = process.env.PORT || 3050;

const app = express();

app.use(bodyParser.json());

//Routes
app.get('/', (req, res) => {
    res.send('Welcome to my API Virtualness!');
})

//PostItem
app.post('/postItem', (req, res) => {
    //Get the Body request from the API call
    const itemObj = {
        category: req.body.category,
        pname: req.body.pname,
        descrip: req.body.descrip,
        expire_date: req.body.expire_date,
        expire_time: req.body.expire_time,
        price_type: req.body.price_type,
        price: req.body.price,
        quant_type: req.body.quant_type,
        quant: req.body.quant,
        item_url: req.body.item_url,
    };

    //Validate received fields  
    var arrErrField = [];
    validateFields(itemObj, arrErrField);

    if (arrErrField != "") {
        res.send({
            "status": res.statusCode !== null,
            "statusCode": res.statusCode,
            "message": arrErrField.join(' - ')
        })
    } else {
        //If validate is Ok proceed
        item.receiveImg(itemObj, res);
    }
})

app.post('/buyItem', (req, res) => {
    buyItem(req.body.itemId, res);
})

app.get('/listBuyItem', (req, res) => {
    listBuyItem(res);
})

function validateFields(object, arr) {
    let keys = Object.keys(object);
    keys.forEach(function (k) {
        if (k in object) {
            //console.log(k + ": " + object[k]);
            if (object[k] === '') {
                arr.push("Error: value of the field " + k + " is empty and is required");
            } else if (object[k] === undefined) {
                arr.push("Error: field " + k + " is not defined");
            }
            return;
        }
        arr.push("Error: field " + k + " doesn't exist in object");
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});