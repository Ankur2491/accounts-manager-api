const redis = require('redis');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser')
var moment = require('moment')
var jsonParser = bodyParser.json()
var app = express();
app.use(jsonParser);
app.use(cors());
var client = redis.createClient({
    socket: {
        host: "redis-13985.c90.us-east-1-3.ec2.redns.redis-cloud.com",
        port: 13985
    }
    , password: "IXiIq7sVwjasWzCPBcx89k6wG2CRuuIx"
});
app.post('/addExpense', async (req, res) => {
    const expenseBody = req.body;
    await client.connect();
    if (expenseBody['expenseFor'] === "plant") {
        let expenses = await client.get('expenses');
        if (expenses == null) {
            let obj = { "plant": [], "plantBalance": expenseBody['expenseAmount'] };
            expenses = JSON.stringify(obj);
        }
        expensesJson = JSON.parse(expenses);
        if (expenseBody['expenseType'] === "debit") {
            expensesJson['plantBalance'] = expensesJson['plantBalance'] - parseFloat(expenseBody['expenseAmount'])
        }
        else {
            expensesJson['plantBalance'] = expensesJson['plantBalance'] + parseFloat(expenseBody['expenseAmount'])
        }
        if (!expenseBody['isBackDateTrans']) {
            expenseBody["balance"] = expensesJson["plantBalance"];
            expensesJson["plant"].push(expenseBody);
        }
        else {
            let prevExp;
            let exp = expensesJson['plant']
            let counter = 0;
            for (let idx in exp) {
                if (moment(new Date(exp[idx]['expenseDate'])) > moment(new Date(expenseBody['expenseDate']))) {
                    let newTransId = parseFloat(prevExp['expTransId']) + 0.1;
                    expenseBody['expTransId'] = newTransId;
                    counter = idx;
                    break;
                }
                prevExp = exp[idx];
            }
            if (counter == 0) {
                expenseBody["balance"] = expensesJson["plantBalance"];
                expensesJson["plant"].push(expenseBody);
            }
            else {
                let finalArr = [];
                for (let i = 0; i < counter; i++) {
                    finalArr.push(exp[i]);
                }
                if (expenseBody['expenseType'] === 'credit') {
                    expenseBody['balance'] = parseFloat(expenseBody['expenseAmount'])+exp[counter-1]['balance'];
                }
                else {
                    expenseBody['balance'] = exp[counter-1]['balance'] - parseFloat(expenseBody['expenseAmount']);
                }
                finalArr.push(expenseBody);
                for (let j = counter; j < exp.length; j++) {
                    let modExp = exp[j];
                    if (expenseBody['expenseType'] === 'credit') {
                        modExp["balance"] = modExp["balance"] + parseFloat(expenseBody['expenseAmount']);
                    }
                    else {
                        modExp["balance"] = modExp["balance"] - parseFloat(expenseBody['expenseAmount']);
                    }
                    finalArr.push(modExp);
                }
                expensesJson["plant"] = finalArr;
            }
        }
        await client.set("expenses", JSON.stringify(expensesJson));
        await client.disconnect();
        res.send("ok");
    }
    else {
        let expenses = await client.get('expenses');
        if (expenses == null) {
            expenses = { "plant": [], [expenseBody['expenseFor']]: [] };
        }
        expensesJson = JSON.parse(expenses);
        if (expensesJson[expenseBody['expenseFor']]) {
            expensesJson[expenseBody['expenseFor']].push(expenseBody);
        }
        else {
            expensesJson[expenseBody['expenseFor']] = [expenseBody];
        }
        await client.set("expenses", JSON.stringify(expensesJson));
        await client.disconnect();
        res.send("ok");
    }
   
})

app.get("/testDB", async (req, res) => {
    await client.connect();
    let expenses = await client.get('expenses');  
    res.send(JSON.parse(expenses));
    await client.disconnect();
});

app.get("/getAllCat", async (req, res) => {
    await client.connect();
    let expenses = await client.get('expenses');
    let expensesJson = JSON.parse(expenses);
    let categories = Object.keys(expensesJson);
    let idx = categories.indexOf("plantBalance");
    if(idx>-1){
        categories.splice(idx,1);
    }
    res.send(categories);
    await client.disconnect();
});

app.get("/getExpDetails/:cat", async(req, res) => {
    await client.connect();
    let expenses = await client.get('expenses');
    let expensesJson = JSON.parse(expenses);
    let catExpense = {};
    if(req.params.cat === 'plant'){
        catExpense['plantBalance'] = expensesJson['plantBalance']
    }
    catExpense['records'] = expensesJson[req.params.cat];
    res.send(catExpense);
    await client.disconnect();
});

app.post("/deleteRecords", async(req, res)=> {
    const expenseArr = req.body.items;
    await client.connect();
    let expenses = await client.get('expenses');
    let expensesJson = JSON.parse(expenses);
    let existingArr = expensesJson['plant'];
    let plantBalance = expensesJson['plantBalance']
    let finalArr = [];
    for(let exp of existingArr) {
        if(expenseArr.includes(exp.expTransId)){
            if(exp.expenseType === "debit") {
            plantBalance += parseFloat(exp.expenseAmount);
            }
            else {
                plantBalance -= parseFloat(exp.expenseAmount);
            }
            continue;
        }
        else {
            finalArr.push(exp);
        }
    }
    expensesJson['plant'] = finalArr;
    expensesJson['plantBalance'] = plantBalance;
    await client.set("expenses", JSON.stringify(expensesJson));
    await client.disconnect();
    if(expenseArr.length==1){
    res.send({"status": "ok", "message": "1 record successfully deleted!", "plantBalance": plantBalance});
    }
    else {
        res.send({"status": "ok", "message": `${expenseArr.length} records successfully deleted!`, "plantBalance": plantBalance});
    }
});

app.listen(4001, () => {
    console.log('listening on port 4001');
})